import { connect, check, summary } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
const doc = path.resolve('tests/fixtures/livro.pdf')
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Arquivos'); await c.wait(600)

const TAG = 'Pasta' + Date.now().toString().slice(-5)
const addFolder = async name => {
  await c.clickText('button', 'Nova pasta'); await c.wait(300)
  await c.typeInput('.modal input.input', name); await c.wait(200)
  await c.evaluate(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent.trim()==='Criar')?.click()`)
  await c.wait(700)
}
await addFolder(TAG)
check('pasta criada', await c.evaluate(`document.body.innerText.includes(${JSON.stringify(TAG)})`))

const physical = await c.evaluate(`(async()=>{const p=(await window.api.app.paths()).files;const r=await window.api.fs.op('list',{path:p});return r.ok && r.items.some(i=>i.dir && i.name===${JSON.stringify(TAG)})})()`)
check('pasta existe fisicamente no disco', physical)

// abrir pasta e criar subpasta
await c.evaluate(`(()=>{const card=[...document.querySelectorAll('.folder-card')].find(x=>x.textContent.includes(${JSON.stringify(TAG)}));card?.querySelector('svg')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
await c.wait(500)
const SUB = 'Sub' + TAG
await addFolder(SUB)
check('subpasta criada', await c.evaluate(`document.body.innerText.includes(${JSON.stringify(SUB)})`))

// entrar na subpasta e importar arquivo
await c.evaluate(`(()=>{const card=[...document.querySelectorAll('.folder-card')].find(x=>x.textContent.includes(${JSON.stringify(SUB)}));card?.querySelector('svg')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
await c.wait(600)
await c.dropFiles('.page', [doc]); await c.wait(2200)
const inFolder = await c.evaluate(`(async()=>{const rows=(await window.api.db.all('SELECT path FROM files ORDER BY id DESC LIMIT 3')).rows;return rows.some(r=>r.path.includes(${JSON.stringify(TAG)})&&r.path.includes(${JSON.stringify(SUB)}))})()`)
check('arquivo importado para a subpasta', inFolder)

// mover para raiz
await c.evaluate(`document.querySelector('.file-row .mini-btn[title="Mover"]')?.click()`); await c.wait(300)
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('.modal button')].find(x=>x.textContent.trim()==='Raiz');if(b)b.click()})()`)
await c.wait(800)
await c.clickText('button', 'Raiz'); await c.wait(600)
check('arquivo movido para raiz', await c.evaluate(`document.querySelectorAll('.file-row').length>0`))

// renomear arquivo
const beforeName = await c.evaluate(`document.querySelector('.file-row .fname')?.textContent`)
await c.evaluate(`document.querySelector('.file-row .mini-btn[title="Renomear"]')?.click()`); await c.wait(300)
await c.typeInput('.modal input.input', 'renomeado.pdf'); await c.wait(200)
await c.evaluate(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent.trim()==='Salvar')?.click()`); await c.wait(800)
check('arquivo renomeado', (await c.evaluate(`(async()=>(await window.api.db.all("SELECT COUNT(*) c FROM files WHERE name='renomeado.pdf'")).rows[0].c)()`)) >= 1, beforeName)

// copiar
await c.evaluate(`document.querySelector('.file-row .mini-btn[title="Copiar"]')?.click()`); await c.wait(800)
check('arquivo copiado', (await c.evaluate(`(async()=>(await window.api.db.all("SELECT COUNT(*) c FROM files WHERE name LIKE 'copia-%'")).rows[0].c)()`)) >= 1)

// excluir
await c.evaluate(`document.querySelector('.file-row .mini-btn[title="Excluir"]')?.click()`); await c.wait(300)
await c.evaluate(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent.includes('Excluir'))?.click()`); await c.wait(800)

await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Arquivos'); await c.wait(700)
check('estrutura de pastas persiste', await c.evaluate(`document.body.innerText.includes(${JSON.stringify(TAG)})`))

summary('T11 ARQUIVOS 3.0')
c.close()
