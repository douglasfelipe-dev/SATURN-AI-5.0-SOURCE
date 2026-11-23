import { connect } from './cdp.mjs'
const c = await connect()
const logs = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value || a.description).join(' '))
})
await c.send('Runtime.enable')
await c.clickText('button.nav-item', 'Música')
await c.wait(600)
const r = await c.rect('.queue .song-row .meta')
console.log('RECT', JSON.stringify(r))
await c.click('.queue .song-row .meta')
await c.wait(9000)
console.log('TIME', await c.evaluate(`document.querySelector('.mini-progress small')?.textContent`))
console.log('META', await c.evaluate(`document.querySelector('.mini-meta b')?.textContent`))
console.log('IFRAMES', await c.evaluate(`document.querySelectorAll('iframe').length`))
console.log('LOGS', logs.slice(0, 5).join('\n').slice(0, 1000))
c.close()
