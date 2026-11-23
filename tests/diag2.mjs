import { connect } from './cdp.mjs'
const c = await connect()
console.log('URL', await c.evaluate('location.href'))
console.log('BODY TEXT', (await c.evaluate('document.body.innerText')).slice(0, 1500))
console.log('NAV', await c.evaluate('[...document.querySelectorAll(".nav-item")].map(x=>x.textContent.trim())'))
c.close()
