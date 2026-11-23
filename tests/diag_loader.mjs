import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`(async()=>{const m=await import('/src/components/YouTubePlayer.jsx');const p=m.loadYouTubeAPI();const r=await Promise.race([p,new Promise(x=>setTimeout(()=>x('TIMEOUT'),3000))]);return JSON.stringify({resolved:r==='TIMEOUT'?'TIMEOUT':!!r,dbg:window.__ytDbg})})()`))
c.close()
