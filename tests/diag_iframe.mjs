import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({src:f.src,title:f.title,w:f.width,h:f.height,outer:f.outerHTML.slice(0,300)})))`))
c.close()
