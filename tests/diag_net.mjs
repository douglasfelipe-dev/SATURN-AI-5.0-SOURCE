import { connect } from './cdp.mjs'
const c = await connect()
const events = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Network.loadingFailed') events.push('FAIL ' + m.params.errorText + ' ' + m.params.type)
  if (m.method === 'Network.responseReceived' && m.params.response.url.includes('youtube')) events.push('RESP ' + m.params.response.status + ' ' + m.params.response.url.slice(0, 100))
})
await c.send('Network.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(4000)
await c.clickText('button.nav-item', 'Música')
await c.wait(500)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(8000)
console.log(events.slice(0, 25).join('\n').slice(0, 3000))
c.close()
