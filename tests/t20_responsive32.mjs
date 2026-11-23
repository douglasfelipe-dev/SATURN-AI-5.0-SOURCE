import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

check('chip de usuário removido do topo', await c.evaluate(`!document.querySelector('.profile-chip')`))
check('bordas arredondadas no shell', await c.evaluate(`parseFloat(getComputedStyle(document.querySelector('.app-shell')).borderRadius) > 0`))

const sizes = [[1240,820],[1000,700],[820,620],[680,520],[520,430]]
for (const [w,h] of sizes) {
  await c.evaluate(`window.api.win.setBounds({x:120,y:80,width:${w},height:${h},maximized:false})`)
  await c.wait(700)
  const b = await c.evaluate(`window.api.win.bounds()`)
  const m = await c.evaluate(`(()=>{const co=document.querySelector('.content');const sb=document.querySelector('.sidebar');return JSON.stringify({ow:co.scrollWidth,cw:co.clientWidth,sw:Math.round(sb.getBoundingClientRect().width),vw:innerWidth})})()`)
  const mm = JSON.parse(m)
  check(`janela aceita ${w}x${h}`, Math.abs(b.width - w) < 30 && Math.abs(b.height - h) < 40, JSON.stringify(b))
  check(`sem estouro horizontal em ${w}px`, mm.ow <= mm.cw + 4, m)
  check(`sidebar adapta em ${w}px`, mm.sw < (w < 1020 ? 130 : 250), `largura=${mm.sw}`)
}

// voltar ao tamanho normal
await c.evaluate(`window.api.win.setBounds({x:120,y:80,width:1280,height:820,maximized:false})`)
await c.wait(600)

// Disco girando de verdade
await c.clickText('button.nav-item', 'Música'); await c.wait(1200)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`); await c.wait(5000)
const time = await c.evaluate(`(()=>{const s=document.querySelector('.mini-progress small')?.textContent||'0:00';const [m,ss]=s.split(':').map(Number);return m*60+ss})()`)
check('música reproduzindo para testar rotação', time > 0, String(time))
const hostSel = '.turntable-stage .canvas-host'
const frame1 = await c.evaluate(`document.querySelector('${hostSel}')?.dataset.spin`)
await c.wait(1100)
const frame2 = await c.evaluate(`document.querySelector('${hostSel}')?.dataset.spin`)
check('vinil está girando (ângulo avança)', Number(frame2) > Number(frame1) + 1, `${frame1} -> ${frame2}`)
check('estado visual acompanha o player', (await c.evaluate(`document.querySelector('${hostSel}')?.dataset.playing`)) === 'true')

// Leitor com modo leitura
await c.clickText('button.nav-item', 'Livros'); await c.wait(800)
await c.evaluate(`document.querySelector('.shelf-book-actions .mini-btn')?.click()`); await c.wait(2200)
const hasFocus = await c.evaluate(`[...document.querySelectorAll('.pdf-toolbar button')].some(b=>b.textContent.includes('Modo leitura'))`)
check('botão de modo leitura presente', hasFocus)
check('leitor abre com mais espaço por padrão', await c.evaluate(`document.querySelector('.pdf-viewer')?.classList.contains('reading-focus') && getComputedStyle(document.querySelector('.pdf-side')).display==='none'`))
await c.evaluate(`document.querySelector('.pdf-toolbar .btn.icon')?.click()`)

summary('T20 RESPONSIVO/ROTAÇÃO/LEITOR 3.0')
c.close()
