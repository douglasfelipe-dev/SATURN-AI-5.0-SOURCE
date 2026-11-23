import { connect } from './cdp.mjs'
const c = await connect()
const logs=[]
c.ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')logs.push(m.params.args.map(a=>a.value||a.description).join(' '))})
await c.send('Runtime.enable')
await c.clickText('button.nav-item','Música'); await c.wait(2500)
console.log(await c.evaluate(`JSON.stringify({canvas:document.querySelectorAll('.turntable-stage canvas').length,stage:!!document.querySelector('.turntable-stage'),body:(document.querySelector('.content')?.innerText||'').slice(0,150)})`))
console.log(logs.slice(0,3).join('\n').slice(0,800))
c.close()
