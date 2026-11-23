import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Cinema')
await c.wait(1200)
console.log('TITLE:', await c.text('.page-title'))
console.log('BODY:', (await c.evaluate('document.querySelector(".content")?.innerText || ""')).slice(0, 1200))
console.log('ERRORS:', await c.evaluate('window.__errors || []'))
c.close()
