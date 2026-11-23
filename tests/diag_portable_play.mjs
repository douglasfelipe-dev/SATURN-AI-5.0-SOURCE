import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Música')
await c.wait(800)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(6000)
console.log(await c.evaluate(`(()=>{
  const fs=[...document.querySelectorAll('iframe')]
  return JSON.stringify(fs.map(f=>{const p=window.YT?.get(f.id);return {id:f.id,src:f.src.slice(0,90),title:f.title,state:p?.getPlayerState?.(),time:p?.getCurrentTime?.()}}))
})()`))
console.log('MINI', await c.evaluate(`document.querySelector('.mini-progress small')?.textContent`))
c.close()
