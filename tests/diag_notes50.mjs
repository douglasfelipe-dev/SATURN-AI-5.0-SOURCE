import { connect } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)
console.log('TITLE0', await c.text('.page-title'))
try { await c.clickText('button.nav-item','Notas') } catch(e){ console.log('NAV ERR',e.message) }
await c.wait(800)
console.log('TITLE1', await c.text('.page-title'))
console.log('BODY', (await c.evaluate(`document.querySelector('.content')?.innerText||''`)).slice(0,400))
c.close()
