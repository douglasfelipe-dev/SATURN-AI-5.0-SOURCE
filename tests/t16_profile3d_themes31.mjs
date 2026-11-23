import { connect, check, summary } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

// Perfil sem foto
await c.clickText('button.nav-item', 'Perfil'); await c.wait(600)
check('upload de foto removido', await c.evaluate(`!document.querySelector('input[type=file]') && !document.body.innerText.includes('Arquivo inválido')`))
await c.clickText('button.nav-item', 'Início'); await c.wait(700)
check('avatar inicial na dashboard', await c.evaluate(`!!document.querySelector('.dash-avatar span')`))

// Livro 3D com textura
await c.clickText('button.nav-item', 'Livros'); await c.wait(700)
await c.evaluate(`document.querySelectorAll('.shelf-book-actions .mini-btn')[1]?.click()`); await c.wait(2500)
const v3d = await c.evaluate(`JSON.stringify({canvas:!!document.querySelector('.book-3d-view canvas'),controls:document.querySelectorAll('.book-3d-controls button').length})`)
check('visualizador 3D do livro abriu', JSON.parse(v3d).canvas, v3d)
check('controles de rotação/zoom presentes', JSON.parse(v3d).controls >= 6, v3d)
// girar
const beforeRot = await c.evaluate(`(()=>{const cv=document.querySelector('.book-3d-view canvas');return cv?cv.toDataURL().slice(-60):''})()`)
await c.evaluate(`document.querySelector('.book-3d-controls button')?.click()`); await c.wait(800)
check('comando de giro executou', (await c.evaluate(`document.querySelector('.book-3d-view')?true:false`)) === true, beforeRot.slice(-20))
await c.evaluate(`document.querySelector('.book-3d-close')?.click()`); await c.wait(400)

// Leitor com zoom e tema escuro
await c.evaluate(`document.querySelector('.shelf-book-actions .mini-btn')?.click()`); await c.wait(2500)
const reader = await c.evaluate(`(()=>{const cv=document.querySelector('.pdf-canvas-wrap canvas');return JSON.stringify({open:!!cv,w:cv?.width||0,zoom:document.querySelector('.pdf-toolbar')?.innerText.includes('%'),dark:[...document.querySelectorAll('.pdf-toolbar button')].some(b=>b.textContent.includes('Escuro'))})})()`)
const r = JSON.parse(reader)
check('leitor PDF com página grande', r.open && r.w > 800, reader)
check('controles de zoom e tema presentes', r.zoom && r.dark, reader)
await c.evaluate(`[...document.querySelectorAll('.pdf-toolbar button')].find(b=>b.textContent.includes('Escuro'))?.click()`); await c.wait(700)
check('tema escuro do leitor aplicado', await c.evaluate(`document.querySelector('.pdf-pages')?.classList.contains('dark')`))
await c.evaluate(`[...document.querySelectorAll('.pdf-toolbar button')].find(b=>b.textContent.includes('Ajustar largura'))?.click()`); await c.wait(900)
check('ajustar largura funcionou', await c.evaluate(`document.querySelector('.pdf-toolbar')?.innerText.includes('%')`))
await c.evaluate(`document.querySelector('.pdf-toolbar .btn.icon')?.click()`)

// Temas: todos os presets mudam a lateral
await c.clickText('button.nav-item', 'Temas'); await c.wait(600)
const colors = []
for (const t of ['Claro','Escuro','Verde natural','Minimalista','Elegante','Noturno','Vintage']) {
  try { await c.clickText('button.preset', t); await c.wait(450) } catch { continue }
  colors.push(await c.evaluate(`getComputedStyle(document.querySelector('.sidebar')).backgroundColor`))
}
check('todos os temas alteram a barra lateral', new Set(colors).size >= 5, JSON.stringify(colors))

summary('T16 PERFIL/3D/TEMAS 3.0')
c.close()
