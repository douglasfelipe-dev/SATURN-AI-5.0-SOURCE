import { connect } from './cdp.mjs'
const c = await connect()
const errors = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
})
await c.send('Runtime.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)
await c.clickText('button.nav-item', 'Configurações')
await c.wait(1200)
console.log(errors.slice(0,2).join('\n---\n').slice(0, 4000))
console.log('BODY', (await c.evaluate('document.querySelector(".content")?.innerText||""')).slice(0,600))
c.close()
