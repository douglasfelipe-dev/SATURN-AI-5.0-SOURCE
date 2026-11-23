import { connect } from './cdp.mjs'
const c = await connect()
const logs = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '))
})
await c.send('Runtime.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)
await c.clickText('button.nav-item', 'Configurações')
await c.wait(1200)
console.log(logs.join('\n---\n').slice(0, 6000))
c.close()
