import { connect, check, summary } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
const pdfs = [
  path.resolve('../LIVROS PDF PARA TESTE/A Culpa E Das Estrelas - John Green.pdf'),
  path.resolve('../LIVROS PDF PARA TESTE/alice-pais-das-maravilhas.pdf')
]
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Livros'); await c.wait(600)
await c.dropFiles('.page', pdfs)
await c.wait(9000)
const count = await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM books')).rows[0].c)()`)
check('PDFs importados', count >= 2, String(count))

const covers = await c.evaluate(`(async()=>{
  const bs=(await window.api.db.all('SELECT cover FROM books ORDER BY id DESC LIMIT 2')).rows
  return JSON.stringify(bs.map(b=>b.cover))
})()`)
check('capas geradas', covers.includes('covers'), covers.slice(0,120))

const imgs = await c.evaluate(`(async()=>{
  const bs=(await window.api.db.all('SELECT cover FROM books ORDER BY id DESC LIMIT 5')).rows.filter(b=>b.cover)
  const out=[]
  for(const b of bs){
    const url=location.origin+'/media?path='+encodeURIComponent(b.cover)
    const ok=await new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth>0);i.onerror=()=>r(false);i.src=url})
    out.push(ok)
  }
  return JSON.stringify(out)
})()`)
check('capas renderizam (não pretas/quebradas)', imgs.includes('true'), imgs)

const cats = await c.evaluate(`JSON.stringify([...document.querySelectorAll('.shelf-label')].map(x=>x.textContent.trim()))`)
check('categorias na estante', cats.includes('Romance') || cats.includes('Fantasia') || cats.includes('Terror') || cats.includes('Outros'), cats.slice(0,120))

const shelfButtons = await c.evaluate(`document.querySelectorAll('.shelf-cover').length`)
check('livros na estante 2D', shelfButtons >= 2, String(shelfButtons))
check('sem canvas 3D de fundo na estante', await c.evaluate(`!document.querySelector('.library-stage')`))

// Abrir leitor PDF
await c.evaluate(`document.querySelector('.shelf-book-actions .mini-btn')?.click()`)
await c.wait(4000)
check('leitor PDF abriu', await c.evaluate(`!!document.querySelector('.pdf-viewer')`))
const canvasOk = await c.evaluate(`(()=>{const cv=document.querySelector('.pdf-canvas-wrap canvas');if(!cv)return false;const ctx=cv.getContext('2d');const d=ctx.getImageData(0,0,Math.min(cv.width,50),Math.min(cv.height,50)).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=d[i]+d[i+1]+d[i+2];return sum>0})()`)
check('página do PDF renderizada com conteúdo', canvasOk)

const pageVal = () => c.evaluate(`document.querySelector('.pdf-toolbar input[type=number]')?.value`)
const before = await pageVal()
await c.evaluate(`document.querySelector('.pdf-toolbar button[title="Próxima página (→)"]')?.click()`)
await c.wait(2500)
const after = await pageVal()
check('navegação entre páginas', before !== after, `${before} -> ${after}`)

await c.evaluate(`document.querySelector('.pdf-toolbar .btn.icon')?.click()`)
await c.wait(400)
// Visualizador 3D individual
await c.evaluate(`document.querySelectorAll('.shelf-book-actions .mini-btn')[1]?.click()`)
await c.wait(1500)
check('visualizador 3D do livro abriu', await c.evaluate(`!!document.querySelector('.book-3d-view canvas')`))
await c.evaluate(`document.querySelector('.book-3d-close')?.click()`)

summary('T9 BIBLIOTECA 3.0')
c.close()
