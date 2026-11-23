import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Meu Ambiente'); await c.wait(800)

const q = async sql => c.evaluate(`(async()=>(await window.api.db.all(${JSON.stringify(sql)})).rows)()`)

// Restaurar layout para estado conhecido
await c.clickText('button', 'Restaurar layout'); await c.wait(1000)
check('layout restaurado com widgets', (await c.evaluate(`document.querySelectorAll('.widget').length`)) >= 7)

// Arrastar widget pelo cabeçalho
const id = 'clock'
const before = (await q(`SELECT x,y,w,h FROM widget_layout WHERE widget='${id}'`))[0]
const head = await c.rect('#widget-clock .widget-head')
await c.send('Input.dispatchMouseEvent', { type:'mousePressed', x:head.x, y:head.y, button:'left', buttons:1, clickCount:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:head.x+130, y:head.y+100, button:'left', buttons:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:head.x+135, y:head.y+105, button:'left', buttons:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:head.x+135, y:head.y+105, button:'left', buttons:0, clickCount:1 })
await c.wait(900)
const after = (await q(`SELECT x,y FROM widget_layout WHERE widget='${id}'`))[0]
check('widget movido e salvo', before.x !== after.x || before.y !== after.y, `${JSON.stringify(before)} -> ${JSON.stringify(after)}`)

// Redimensionar
const rb = (await q(`SELECT w,h FROM widget_layout WHERE widget='${id}'`))[0]
await c.evaluate(`(()=>{
  const h=document.querySelector('#widget-clock .widget-resize'); if(!h)return
  const r=h.getBoundingClientRect()
  h.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.x+5,clientY:r.y+5,button:0,buttons:1}))
  window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.x+75,clientY:r.y+65,button:0,buttons:1}))
  window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:r.x+75,clientY:r.y+65,button:0,buttons:0}))
})()`)
await c.wait(900)
const ra = (await q(`SELECT w,h FROM widget_layout WHERE widget='${id}'`))[0]
check('widget redimensionado e salvo', ra.w !== rb.w || ra.h !== rb.h, `${JSON.stringify(rb)} -> ${JSON.stringify(ra)}`)

// Desenho real no canvas
const cv = await c.rect('.draw-canvas')
check('canvas de desenho presente', !!cv)
await c.send('Input.dispatchMouseEvent', { type:'mousePressed', x:cv.x-60, y:cv.y-20, button:'left', buttons:1, clickCount:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:cv.x+60, y:cv.y+20, button:'left', buttons:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:cv.x+100, y:cv.y-30, button:'left', buttons:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:cv.x+100, y:cv.y-30, button:'left', buttons:0, clickCount:1 })
await c.wait(900)
const drawn = await c.evaluate(`(async()=>{const r=await window.api.db.all("SELECT value FROM settings WHERE key='env_drawing'");return !!r.rows[0]?.value && r.rows[0].value.length>100})()`)
check('desenho salvo', drawn)

// Diário
await c.typeInput('.diary-widget textarea', 'Registro de teste 3.0')
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('.diary-widget button')].find(x=>x.textContent.includes('Registrar'));if(b)b.click()})()`)
await c.wait(700)
check('entrada no diário criada', (await q(`SELECT id FROM diary`)).length >= 1)

// Persistência
const finalBefore = (await q(`SELECT x,y,w,h FROM widget_layout WHERE widget='${id}'`))[0]
await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Meu Ambiente'); await c.wait(800)
const persisted = (await q(`SELECT x,y,w,h FROM widget_layout WHERE widget='${id}'`))[0]
check('posição/tamanho persistem após reiniciar', persisted.x === finalBefore.x && persisted.w === finalBefore.w, `${JSON.stringify(finalBefore)} -> ${JSON.stringify(persisted)}`)
check('diário persiste após reiniciar', (await q(`SELECT id FROM diary`)).length >= 1)

summary('T13 AMBIENTE 3.0')
c.close()
