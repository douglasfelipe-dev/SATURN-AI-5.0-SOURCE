import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Música')
await c.wait(600)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
for (let i = 1; i <= 4; i++) {
  await c.wait(5000)
  console.log(i * 5, await c.evaluate(`(()=>{const f=document.querySelector('iframe');const p=window.YT?.get(f?.id);return JSON.stringify({state:p?.getPlayerState?.(),time:p?.getCurrentTime?.(),mini:document.querySelector('.mini-progress small')?.textContent})})()`))
}
c.close()
