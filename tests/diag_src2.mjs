import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`(async()=>{const t=await (await fetch('/src/modules/Files.jsx?t='+Date.now())).text();const i=t.indexOf('let shown');return JSON.stringify({snippet:t.slice(i,i+120),hasFav:t.includes('(!fav || f.favorite)')})})()`))
c.close()
