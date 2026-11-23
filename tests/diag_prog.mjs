import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item','Cinema'); await c.wait(800)
console.log('BODY', (await c.evaluate(`document.querySelector('.cinema-controls-2d')?.innerText`)))
await c.evaluate(`document.querySelector('.song-row .meta')?.click()`); await c.wait(6000)
console.log('AFTER', (await c.evaluate(`document.querySelector('.cinema-controls-2d')?.innerText`)))
console.log('BTNS', await c.evaluate(`[...document.querySelectorAll('.cinema-controls-2d button')].map(b=>b.textContent.trim()||b.title).join('|')`))
c.close()
