import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`JSON.stringify({dbg: window.__dbg ? {hasApi: !!window.__dbg.apiRef.current, current: window.__dbg.current?.youtube_id, pending: window.__dbg.pendingRef.current} : null, yt: window.__ytDbg, iframe: document.querySelector('iframe')?.src, time: document.querySelector('.mini-progress small')?.textContent})`))
c.close()
