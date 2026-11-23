import { connect } from './cdp.mjs'
const c = await connect()
console.log(await c.evaluate(`JSON.stringify({hasYT: !!window.YT, hasPlayer: !!window.YT?.Player, readyCb: typeof window.onYouTubeIframeAPIReady, scripts: [...document.querySelectorAll('script')].filter(s=>s.src.includes('youtube')).map(s=>s.src), ytDebug: window.__ytDbg})`))
c.close()
