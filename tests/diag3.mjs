import { connect } from './cdp.mjs'
const c = await connect()
const events = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.exceptionThrown') events.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) events.push('CONSOLE: ' + m.params.args.map(a => a.value || a.description).join(' '))
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') events.push('LOG: ' + m.params.entry.text)
})
await c.send('Runtime.enable')
await c.send('Log.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(4000)
console.log(events.join('\n').slice(0, 5000))
console.log('BODY:', (await c.evaluate('document.body.innerText')).slice(0, 500))
c.close()
