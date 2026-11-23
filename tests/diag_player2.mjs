import { connect } from './cdp.mjs'
const c = await connect()
const logs = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.exceptionThrown') logs.push('EX ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) logs.push(m.params.type.toUpperCase() + ' ' + m.params.args.map(a => a.value || a.description).join(' '))
})
await c.send('Runtime.enable')
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3500)
await c.clickText('button.nav-item', 'Música')
await c.wait(800)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(6000)
console.log('DEBUG', await c.evaluate(`(()=>{const p=window.__novaPlayer;const a=p?.apiRef?.current;return JSON.stringify({hasApi:!!a,current:p?.current?.youtube_id,pending:p?.pendingRef?.current,state:a?.getState?.(),iframes:document.querySelectorAll('iframe').length})})()`))
console.log('LOGS', logs.slice(0, 12).join('\n').slice(0, 2500))
c.close()
