import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`(async()=>JSON.stringify(await window.api.db.all('SELECT widget,x,y FROM widget_layout')))()`))
console.log('DOM', await c.evaluate(`JSON.stringify([...document.querySelectorAll('.widget')].map(w=>w.id))`))
c.close()
