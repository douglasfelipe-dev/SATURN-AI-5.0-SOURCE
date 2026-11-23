import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Música')
await c.wait(600)
console.log(await c.evaluate(`(()=>{const a=window.__novaPlayer?.apiRef?.current;return JSON.stringify({debug:window.__ytDebug,apiTime:a?.getTime?.(),state:a?.getState?.(),iframes:document.querySelectorAll('iframe').length,smalls:[...document.querySelectorAll('.mini-progress small')].map(s=>s.textContent),mini:document.querySelector('.mini-player')?.innerText.slice(0,120)})})()`))
c.close()
