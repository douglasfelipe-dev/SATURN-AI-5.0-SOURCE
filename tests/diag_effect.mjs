import { connect } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3500)
console.log(await c.evaluate(`JSON.stringify({effect: window.__ytEffect, dbg: window.__ytDbg, yt: !!window.YT?.Player, iframes: document.querySelectorAll('iframe').length})`))
c.close()
