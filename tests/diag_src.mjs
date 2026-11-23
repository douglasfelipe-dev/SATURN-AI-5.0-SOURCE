import { connect } from './cdp.mjs'
const c = await connect()
const txt = await c.evaluate(`(async()=>{const r=await fetch('/src/components/YouTubePlayer.jsx?t='+Date.now());const t=await r.text();return JSON.stringify({hasNew:t.includes('timeoutMs'),hasDbg:t.includes('__ytDbg'),len:t.length})})()`)
console.log(txt)
c.close()
