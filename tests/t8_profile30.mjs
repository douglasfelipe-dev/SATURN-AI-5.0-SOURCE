import { connect, check, summary } from './cdp.mjs'
const c = await connect()
const getSetting = async k => c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT value FROM settings WHERE key=?',[${JSON.stringify(k)}]);return r.rows[0]?JSON.parse(r.rows[0].value):null})()`)
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
await c.clickText('button.nav-item', 'Perfil'); await c.wait(600)

check('seletor de foto removido', await c.evaluate(`!document.querySelector('input[type=file]') && !document.body.innerText.includes('Arquivo inválido')`))
check('somente campo de nome disponível', await c.evaluate(`!!document.querySelector('.page .field input.input')`))

await c.typeInput('.page .field input.input', 'Usuario V5')
await c.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Salvar nome'))?.click()`)
await c.wait(600)
check('nome salvo', (await getSetting('profileName')) === 'Usuario V5')
check('avatar removido', (await getSetting('avatar')) === '')

await c.clickText('button.nav-item', 'Início'); await c.wait(700)
check('nome aparece na dashboard', (await c.evaluate(`document.querySelector('.page-title')?.textContent`))?.includes('Usuario V5'))
check('avatar com inicial na dashboard', await c.evaluate(`!!document.querySelector('.dash-avatar span')`))

await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
check('nome persiste após reiniciar', (await c.evaluate(`document.querySelector('.page-title')?.textContent`))?.includes('Usuario V5'))

summary('T8 PERFIL v5')
c.close()
