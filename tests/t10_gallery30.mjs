import { connect, check, summary } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
const f = n => path.resolve('tests/fixtures30', n)
const imgs = ['foto 1.png','foto_1.jpg','foto 1.webp','foto 2.png','foto_2.jpg','foto 2.webp']
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Galeria de fotos'); await c.wait(600)

// importar individualmente os 3 primeiros
for (const n of imgs.slice(0,3)) { await c.dropFiles('.page', [f(n)]); await c.wait(1400) }
const afterSingle = await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM photos')).rows[0].c)()`)
check('importação individual (PNG/JPG/WebP)', afterSingle >= 3, String(afterSingle))

// importar em conjunto os restantes
await c.dropFiles('.page', imgs.slice(3).map(f)); await c.wait(2500)
const afterBatch = await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM photos')).rows[0].c)()`)
check('importação em conjunto', afterBatch >= afterSingle + 3, `${afterSingle} -> ${afterBatch}`)

const thumbs = await c.evaluate(`(async()=>{
  const rows=(await window.api.db.all('SELECT path FROM photos ORDER BY id DESC LIMIT 10')).rows
  let ok=0
  for(const r of rows){const u=location.origin+'/media?path='+encodeURIComponent(r.path);const good=await new Promise(res=>{const i=new Image();i.onload=()=>res(i.naturalWidth>0);i.onerror=()=>res(false);i.src=u});if(good)ok++}
  return ok+'/'+rows.length
})()`)
check('todas as miniaturas carregam', thumbs.startsWith(thumbs.split('/')[1]) , thumbs)

await c.evaluate(`document.querySelector('.media-card')?.click()`); await c.wait(700)
check('visualizador em tamanho original abriu', await c.evaluate(`!!document.querySelector('.lightbox img') && document.querySelector('.lightbox img').naturalWidth>0`))
await c.evaluate(`document.querySelectorAll('.lightbox .lb-btn')[5]?.click()`); await c.wait(400)

await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Galeria de fotos'); await c.wait(700)
check('fotos persistem após reiniciar', (await c.evaluate(`document.querySelectorAll('.media-card').length`)) >= 6)

summary('T10 GALERIA 3.0')
c.close()
