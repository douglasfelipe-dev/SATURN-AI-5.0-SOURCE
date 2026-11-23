import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`(()=>{try{const old=window.api.app.select;window.api.app.select=async()=>['x'];return JSON.stringify({changed:window.api.app.select!==old,desc:Object.getOwnPropertyDescriptor(window.api,'app')}) }catch(e){return 'ERR '+e.message}})()`))
c.close()
