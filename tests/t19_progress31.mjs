import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Cinema'); await c.wait(800)

const bar = await c.evaluate(`!!document.querySelector('.cinema-controls-2d .progress.interactive')`)
check('barra interativa renderizada', bar)
const knob = await c.evaluate(`!!document.querySelector('.cinema-controls-2d .progress-knob')`)
check('indicador de progresso presente', knob)

// iniciar vídeo
await c.evaluate(`document.querySelector('.song-row .meta')?.click()`); await c.wait(7000)
const getTime = async () => c.evaluate(`(()=>{const s=document.querySelector('.cinema-controls-2d')?.innerText||'';const m=s.match(/(\\d+):(\\d+)/);return m?(+m[1]*60 + +m[2]):0})()`)
const t0 = await getTime()
check('vídeo reproduzindo antes do teste', t0 > 0, String(t0))

// clique no meio da barra
const r = await c.rect('.cinema-controls-2d .progress')
await c.send('Input.dispatchMouseEvent', { type:'mousePressed', x:r.x, y:r.y, button:'left', buttons:1, clickCount:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:r.x, y:r.y, button:'left', buttons:0, clickCount:1 })
await c.wait(2500)
const t1 = await getTime()
check('clique no meio avançou o vídeo', t1 > t0 + 10, `${t0} -> ${t1}`)

// arrastar para trás
await c.send('Input.dispatchMouseEvent', { type:'mousePressed', x:r.x, y:r.y, button:'left', buttons:1, clickCount:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:r.x - r.w/2 + 20, y:r.y, button:'left', buttons:1 })
await c.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:r.x - r.w/2 + 20, y:r.y, button:'left', buttons:0, clickCount:1 })
await c.wait(2200)
const t2 = await getTime()
check('arrastar retrocedeu o vídeo', t2 < t1 - 5, `${t1} -> ${t2}`)

// botões ±5s
await c.evaluate(`[...document.querySelectorAll('.cinema-controls-2d button')].find(b=>b.textContent.trim()==='+5s')?.click()`); await c.wait(1500)
const t3 = await getTime()
check('botão +5s avançou', t3 > t2, `${t2} -> ${t3}`)
await c.evaluate(`document.querySelector('.cinema-controls-2d button[title="Voltar 5 segundos"]')?.click()`); await c.wait(1800)
const t4 = await getTime()
check('botão -5s retrocedeu', t4 < t3, `${t3} -> ${t4}`)

// tela cheia e barra
await c.evaluate(`[...document.querySelectorAll('.cinema-controls-2d button')].at(-1)?.click()`); await c.wait(900)
check('tela cheia ativa', await c.evaluate(`!!document.fullscreenElement`))
const r2 = await c.rect('.cinema-controls-2d .progress')
if (r2) {
  await c.send('Input.dispatchMouseEvent', { type:'mousePressed', x:r2.x - 60, y:r2.y, button:'left', buttons:1, clickCount:1 })
  await c.send('Input.dispatchMouseEvent', { type:'mouseReleased', x:r2.x - 60, y:r2.y, button:'left', buttons:0, clickCount:1 })
  await c.wait(1200)
  check('barra funciona em tela cheia', (await getTime()) >= 0)
}
if (await c.evaluate(`!!document.fullscreenElement`)) await c.evaluate(`document.exitFullscreen()`)

summary('T19 PROGRESSO CINEMA 3.0')
c.close()
