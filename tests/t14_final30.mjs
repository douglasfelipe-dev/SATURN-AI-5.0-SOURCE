import { connect, check, summary } from './cdp.mjs'
const c = await connect()
const ids = ['dQw4w9WgXcQ','kJQP7kiw5Fk','JGwWNGJdvx8','OPf0YbXqDm0','fJ9rUzIMcZQ']
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

// --- Cinema: YouTube preservado ---
await c.clickText('button.nav-item', 'Cinema'); await c.wait(600)
check('sala 2D sem canvas 3D', await c.evaluate(`!document.querySelector('.cinema-room canvas')`))
check('tela grande presente', await c.evaluate(`!!document.querySelector('.cinema-bigscreen')`))
for (const id of ids) {
  await c.setInput('.cinema-add-bar input.input', `https://youtu.be/${id}`)
  await c.evaluate(`[...document.querySelectorAll('.cinema-add-bar button')].find(b=>b.textContent.includes('Adicionar'))?.click()`)
  await c.wait(600)
}
check('vídeos na fila', (await c.evaluate(`document.querySelectorAll('.song-row').length`)) >= 5)
await c.evaluate(`document.querySelector('.song-row .meta')?.click()`); await c.wait(7000)
const ytTime = await c.evaluate(`(()=>{const s=document.querySelector('.cinema-controls-2d')?.innerText||'';const m=s.match(/(\\d+):(\\d+)/);return m?(+m[1]*60 + +m[2]):0})()`)
check('YouTube reproduziu de verdade', ytTime > 0, String(ytTime))
// botão principal de play/pause é o 3º (anterior, -5s, play, +5s, próximo)
await c.evaluate(`document.querySelectorAll('.cinema-controls-2d button')[2]?.click()`); await c.wait(1500)
const parseT = async () => c.evaluate(`(()=>{const s=document.querySelector('.cinema-controls-2d')?.innerText||'';const m=s.match(/(\\d+):(\\d+)/);return m?(+m[1]*60 + +m[2]):0})()`)
const p1 = await parseT()
await c.wait(1600)
const p2 = await parseT()
check('pausa do YouTube funcionou', Math.abs(p2 - p1) <= 1, `${p1} -> ${p2}`)
await c.evaluate(`document.querySelectorAll('.cinema-controls-2d button')[2]?.click()`); await c.wait(1600)
check('retomada do YouTube funcionou', (await parseT()) > p2, `${p2} -> ${await parseT()}`)
await c.evaluate(`[...document.querySelectorAll('.cinema-controls-2d button')].at(-1)?.click()`); await c.wait(700)
check('tela cheia solicitada', await c.evaluate(`!!document.fullscreenElement || document.querySelector('.cinema-bigscreen:fullscreen') !== null`))
if (await c.evaluate(`!!document.fullscreenElement`)) await c.evaluate(`document.exitFullscreen()`)

// --- Música / vinil sincronizado ---
await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Música'); await c.wait(2200)
check('toca-discos 3D presente', await c.evaluate(`!!document.querySelector('.turntable-stage canvas')`))
const playing = await c.evaluate(`!!document.querySelector('.mini-player .ctrl.play svg')`)
check('controles do player presentes', playing)

// --- Temas: sidebar acompanha ---
await c.clickText('button.nav-item', 'Temas'); await c.wait(600)
await c.clickText('button.preset', 'Claro'); await c.wait(700)
const sb1 = await c.evaluate(`getComputedStyle(document.querySelector('.sidebar')).backgroundColor`)
await c.clickText('button.preset', 'Noturno'); await c.wait(700)
const sb2 = await c.evaluate(`getComputedStyle(document.querySelector('.sidebar')).backgroundColor`)
check('barra lateral muda com o tema', sb1 !== sb2, `${sb1} -> ${sb2}`)
await c.clickText('button.preset', 'Claro'); await c.wait(600)

// --- Identidade ---
check('versão 5.0 na sidebar', await c.evaluate(`document.querySelector('.brand-text')?.textContent.includes('5.0')`))
check('assinatura do desenvolvedor presente', await c.evaluate(`document.body.innerText.includes('douglasfelipe.dev') && document.body.innerText.includes('CREATOR')`))
await c.clickText('button.nav-item', 'Início'); await c.wait(800)
check('nome do usuário na identidade da dashboard', await c.evaluate(`!!document.querySelector('.dash-avatar') && document.querySelector('.page-title')?.textContent?.length > 0`))

summary('T14 CINEMA/VINIL/TEMAS 3.0')
c.close()
