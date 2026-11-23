import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)

// Temas
await c.clickText('button.nav-item', 'Temas')
await c.wait(500)
await c.clickText('button.preset', 'Escuro')
await c.wait(500)
check('tema escuro aplicado', await c.evaluate(`document.body.dataset.dark === 'true'`))
await c.clickText('button.preset', 'Claro')
await c.wait(500)
check('tema claro aplicado', await c.evaluate(`document.body.dataset.dark === 'false'`))
await c.typeInput('.hex-input', '#123456')
await c.wait(400)
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Aplicar');if(b)b.click()})()`)
await c.wait(500)
const primary = await c.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()`)
check('cor personalizada aplicada', primary.toLowerCase() === '#123456', primary)
await c.typeInput('input[placeholder="Ex.: Meu tema verde"]', 'Tema automatico')
await c.wait(300)
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Salvar');if(b)b.click()})()`)
await c.wait(600)
check('tema salvo no banco', await c.evaluate(`(async()=>{const r=await window.api.db.all("SELECT COUNT(*) c FROM themes WHERE name='Tema automatico'");return r.rows[0].c>0})()`))

// Meu Ambiente
await c.clickText('button.nav-item', 'Meu Ambiente')
await c.wait(500)
let before = await c.evaluate(`document.querySelectorAll('.widget').length`)
await c.clickText('button', 'Adicionar widget')
await c.wait(300)
const existing = await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT widget FROM widget_layout');return r.rows.map(x=>x.widget)})()`)
const allWidgets = ['tasks','note','date','weather','shortcuts','calendar','clock']
const chosen = allWidgets.find(id => !existing.includes(id)) || existing[0]
const chosenLabel = { tasks: 'Lista de tarefas', note: 'Notas rápidas', date: 'Indicador de data', weather: 'Previsão do tempo', shortcuts: 'Atalhos', calendar: 'Calendário', clock: 'Relógio digital' }[chosen]
if (existing.includes(chosen)) {
  await c.evaluate(`(()=>{const h=document.querySelector('#widget-${chosen} .widget-head');const b=h?.querySelectorAll('button')[1];if(b)b.click()})()`)
  await c.wait(600)
  before = await c.evaluate(`document.querySelectorAll('.widget').length`)
}
await c.clickText('button.btn.ghost', chosenLabel)
await c.wait(700)
const after = await c.evaluate(`document.querySelectorAll('.widget').length`)
check('widget adicionado', after === before + 1, `${before} -> ${after} (${chosen})`)
check('widget persistido no banco', await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT COUNT(*) c FROM widget_layout WHERE widget=?',[${JSON.stringify(chosen)}]);return r.rows[0].c>0})()`))
const posBefore = await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT x,y FROM widget_layout WHERE widget=?',[${JSON.stringify(chosen)}]);return JSON.stringify(r.rows[0])})()`)
const head = await c.rect(`#widget-${chosen} .widget-head`)
if (head) {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: head.x, y: head.y, button: 'left', buttons: 1, clickCount: 1 })
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: head.x + 140, y: head.y + 90, button: 'left', buttons: 1 })
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: head.x + 145, y: head.y + 95, button: 'left', buttons: 1 })
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: head.x + 145, y: head.y + 95, button: 'left', buttons: 0, clickCount: 1 })
  await c.evaluate(`(()=>{
    const h=document.querySelector(${JSON.stringify(`#widget-${chosen} .widget-head`)})
    if(!h)return
    const r=h.getBoundingClientRect()
    h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.x+20,clientY:r.y+10,button:0,buttons:1}))
    window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.x+180,clientY:r.y+110,button:0,buttons:1}))
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:r.x+180,clientY:r.y+110,button:0,buttons:0}))
  })()`)
  await c.wait(900)
}
const posAfter = await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT x,y FROM widget_layout WHERE widget=?',[${JSON.stringify(chosen)}]);return JSON.stringify(r.rows[0])})()`)
check('widget movido e posição salva', posBefore !== posAfter, `${posBefore} -> ${posAfter}`)

// Busca universal
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', modifiers: 2 })
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', modifiers: 2 })
await c.wait(500)
check('busca universal abriu', await c.evaluate(`!!document.querySelector('.search-modal')`))
await c.typeInput('.search-input-row input', 'Música')
await c.wait(500)
check('busca retornou resultados', (await c.evaluate(`document.querySelectorAll('.search-result').length`)) > 0, String(await c.evaluate(`document.querySelectorAll('.search-result').length`)))
await c.evaluate(`document.querySelector('.search-result')?.click()`)
await c.wait(600)
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await c.wait(400)

// Central de notificações
await c.click('.icon-btn[title="Notificações"]')
await c.wait(500)
check('central de notificações abriu', await c.evaluate(`!!document.querySelector('.notif-panel')`))
await c.evaluate(`(()=>{const b=document.querySelector('button[title="Marcar como lidas"]');if(b)b.click()})()`)
await c.wait(400)

// Persistência
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)
check('tema persistiu após reiniciar', await c.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--primary').trim().toLowerCase() === '#123456'`))
await c.clickText('button.nav-item', 'Meu Ambiente')
await c.wait(600)
check('widgets persistiram após reiniciar', await c.evaluate(`document.body.innerText.includes(${JSON.stringify(chosenLabel)})`))

summary('T7 PERSONALIZAÇÃO/BUSCA/NOTIFICAÇÕES')
c.close()
