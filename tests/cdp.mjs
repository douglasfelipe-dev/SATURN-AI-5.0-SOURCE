/* Harness de testes funcionais via Chrome DevTools Protocol */
const PORT = process.env.CDP_PORT || 9222

export async function connect() {
  let targets = []
  for (let i = 0; i < 40; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      if (targets.some(t => t.type === 'page' && (t.url.includes('127.0.0.1') || t.url.includes('localhost') || t.url.includes('file:')))) break
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300))
  }
  const page = targets.find(t => t.type === 'page' && (t.url.includes('127.0.0.1') || t.url.includes('localhost') || t.url.includes('file:')))
  if (!page) throw new Error('Página do app não encontrada. Electron iniciou com --remote-debugging-port?')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }))
  })
  await send('Page.bringToFront').catch(() => {})
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails))
    return r.result?.result?.value
  }
  const rect = async selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,text:e.textContent?.slice(0,80)}})()`)
  const click = async selector => {
    const r = await rect(selector)
    if (!r) throw new Error('Elemento não encontrado: ' + selector)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
    return r
  }
  const clickText = async (tag, text) => {
    const sel = `${tag}:not([disabled])`
    const found = await evaluate(`(()=>{const els=[...document.querySelectorAll(${JSON.stringify(sel)})];const e=els.find(x=>x.textContent.trim().includes(${JSON.stringify(text)}));if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,text:e.textContent.trim().slice(0,60)}})()`)
    if (!found) throw new Error(`Botão com texto "${text}" não encontrado`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: found.x, y: found.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: found.x, y: found.y, button: 'left', clickCount: 1 })
    return found
  }
  const setInput = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('input não encontrado '+${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(proto,'value').set;set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`)
  const fileInput = async (selector, files) => {
    const r = await send('DOM.getDocument', {})
    const node = await send('DOM.querySelector', { nodeId: r.result.root.nodeId, selector })
    if (!node.result.nodeId) throw new Error('File input não encontrado: ' + selector)
    await send('DOM.setFileInputFiles', { files, nodeId: node.result.nodeId })
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(e){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}return e?.files?.length||0})()`)
  }
  const dropFiles = async (selector, files) => {
    const fn = (sel, arr) => {
      const host = document.querySelector(sel)
      if (!host) throw new Error('drop host não encontrado')
      const dt = new DataTransfer()
      arr.forEach(p => {
        const name = p.split(/[\\/]/).pop()
        const f = new File(['dummy'], name)
        Object.defineProperty(f, 'path', { value: p })
        dt.items.add(f)
      })
      host.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      host.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
      return true
    }
    return evaluate(`(${fn.toString()})(${JSON.stringify(selector)}, ${JSON.stringify(files)})`)
  }
  const typeInput = async (selector, value) => {
    const r = await rect(selector)
    if (!r) throw new Error('input não encontrado: ' + selector)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 })
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 })
    await send('Input.insertText', { text: value })
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    return value
  }
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const text = async selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() || null`)
  const dbAll = async sql => (await evaluate(`window.api.db.all(${JSON.stringify(sql)})`))
  return { ws, send, evaluate, rect, click, clickText, setInput, typeInput, fileInput, dropFiles, wait, text, dbAll, close: () => ws.close() }
}

let passed = 0, failed = 0
export function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`) }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}
export function summary(title) {
  console.log(`\n=== ${title}: ${passed} aprovados, ${failed} falharam ===`)
  return failed
}
