import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Arquivos')
await c.wait(800)
console.log('ROWS', await c.evaluate(`document.querySelectorAll('.file-row').length`))
console.log('BODY', (await c.evaluate('document.querySelector(".content")?.innerText||""')).slice(0, 900))
c.close()
