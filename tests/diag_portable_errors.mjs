import { connect } from './cdp.mjs'
const c = await connect()
const logs = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map(a => a.value || a.description).join(' '))
  if (m.method === 'Runtime.exceptionThrown') logs.push('EX: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
})
await c.send('Runtime.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(4000)
await c.clickText('button.nav-item', 'Música')
await c.wait(800)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(6000)
console.log('LOGS\n' + logs.slice(0, 15).join('\n').slice(0, 3000))
c.close()
