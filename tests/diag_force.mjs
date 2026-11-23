import { connect } from './cdp.mjs'
const c = await connect()
console.log('BEFORE', await c.evaluate(`(()=>{const f=document.querySelector('iframe');const p=window.YT?.get(f?.id);return JSON.stringify({id:f?.id,hasPlayer:!!p,state:p?.getPlayerState?.()})})()`))
await c.evaluate(`(()=>{const f=document.querySelector('iframe');const p=window.YT?.get(f?.id);if(p)p.loadVideoById('dQw4w9WgXcQ')})()`)
await c.wait(6000)
console.log('AFTER', await c.evaluate(`(()=>{const f=document.querySelector('iframe');const p=window.YT?.get(f?.id);return JSON.stringify({src:f?.src,state:p?.getPlayerState?.(),time:p?.getCurrentTime?.(),mini:document.querySelector('.mini-progress small')?.textContent})})()`))
c.close()
