import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

check('versão 5.0 na interface', await c.evaluate(`document.title.includes('5.0') && document.querySelector('.brand-text')?.textContent.includes('5.0')`))
check('sem opção de foto no perfil', (await (async () => { await c.clickText('button.nav-item','Perfil'); await c.wait(500); return c.evaluate(`!document.querySelector('input[type=file]')`) })()))

// --- Widgets da home editáveis ---
await c.clickText('button.nav-item', 'Início'); await c.wait(700)
// remove relógio pré-existente para garantir teste determinístico
await c.evaluate(`(async()=>{await window.api.db.run("DELETE FROM home_layout WHERE widget='clock'")})()`)
await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Início'); await c.wait(700)
const before = await c.evaluate(`document.querySelectorAll('.home-widget').length`)
await c.clickText('button', 'Editar página'); await c.wait(400)
check('modo edição ativado', await c.evaluate(`document.querySelector('.home-widgets')?.classList.contains('editing')`))
await c.clickText('button', 'Adicionar'); await c.wait(400)
check('paleta de widgets abriu', await c.evaluate(`!!document.querySelector('.modal')`))
await c.evaluate(`[...document.querySelectorAll('.modal button')].find(b=>b.textContent.includes('Relógio digital'))?.click()`); await c.wait(700)
const after = await c.evaluate(`document.querySelectorAll('.home-widget').length`)
check('widget relógio adicionado', after === before + 1, `${before} -> ${after}`)
check('relógio digital renderizado', await c.evaluate(`!!document.querySelector('.home-clock')`))
// mover para cima
await c.evaluate(`(()=>{const bars=[...document.querySelectorAll('.home-widget-bar')];const last=bars[bars.length-1];last?.querySelector('button[title="Subir"]')?.click()})()`); await c.wait(500)
check('widget movido', await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT pos FROM home_layout ORDER BY pos');return r.rows.length>0})()`))
// cor
await c.evaluate(`(()=>{const bars=[...document.querySelectorAll('.home-widget-bar')];bars[0]?.querySelector('button[title="Cor"]')?.click()})()`); await c.wait(300)
await c.evaluate(`document.querySelector('.home-widget-bar .color-pop button:nth-child(2)')?.click()`); await c.wait(500)
check('cor do widget salva', await c.evaluate(`(async()=>{const r=await window.api.db.all("SELECT color FROM home_layout WHERE pos=0");return !!r.rows[0]?.color})()`))
// remover
await c.evaluate(`(()=>{const bars=[...document.querySelectorAll('.home-widget-bar')];bars[0]?.querySelector('button[title="Remover"]')?.click()})()`); await c.wait(500)
check('widget removido', (await c.evaluate(`document.querySelectorAll('.home-widget').length`)) === after - 1)
await c.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Concluir'))?.click()`); await c.wait(300)

await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Início'); await c.wait(600)
check('layout da home persiste', await c.evaluate(`document.querySelectorAll('.home-widget').length === ${after-1}`))

// --- PDF: navegação rápida sem erro de canvas ---
await c.clickText('button.nav-item', 'Livros'); await c.wait(700)
await c.evaluate(`document.querySelector('.shelf-book-actions .mini-btn')?.click()`); await c.wait(2500)
for (let i = 0; i < 5; i++) {
  await c.evaluate(`document.querySelector('.pdf-toolbar button[title="Próxima página (→)"]')?.click()`)
  await c.wait(220)
}
await c.wait(2500)
const errText = await c.evaluate(`document.querySelector('.pdf-viewer')?.innerText || ''`)
check('sem erro de renderização no PDF', !errText.includes('Cannot use the same canvas') && !errText.includes('Falha ao renderizar'), errText.slice(0,120))
const w = await c.evaluate(`document.querySelector('.pdf-canvas-wrap canvas')?.width || 0`)
check('página do livro com bom tamanho', w > 700, String(w))
check('leitor já abre com mais espaço (modo leitura)', await c.evaluate(`document.querySelector('.pdf-viewer')?.classList.contains('reading-focus') && getComputedStyle(document.querySelector('.pdf-side')).display === 'none'`))
await c.evaluate(`document.querySelector('.pdf-toolbar .btn.icon')?.click()`)

// --- Notificações / lembretes ---
const notifBefore = await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM notifications')).rows[0].c)()`)
await c.evaluate(`window.api.notify.test()`); await c.wait(600)
const notifAfter = await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM notifications')).rows[0].c)()`)
check('notificação de teste criada', notifAfter > notifBefore, `${notifBefore} -> ${notifAfter}`)
await c.evaluate(`document.querySelector('.icon-btn[title="Notificações"]')?.click()`); await c.wait(400)
check('central de notificações abriu', await c.evaluate(`!!document.querySelector('.notif-panel')`))

summary('T21 v5.0')
c.close()
