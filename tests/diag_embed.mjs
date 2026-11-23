import { connect } from './cdp.mjs'
const c = await connect()
await c.evaluate(`(()=>{const f=document.querySelectorAll('iframe')[1];if(f)f.src='https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1'})()`)
await c.wait(7000)
console.log(await c.evaluate(`(()=>{const f=document.querySelectorAll('iframe')[1];return JSON.stringify({src:f?.src,title:f?.title})})()`))
c.close()
