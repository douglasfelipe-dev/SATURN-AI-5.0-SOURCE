import { connect } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(4000)
await c.clickText('button.nav-item', 'Música'); await c.wait(600)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(3000)
console.log('YT?', await c.evaluate(`typeof window.YT + ' ' + typeof window.YT?.Player`))
await c.evaluate(`(()=>{
  const d=document.createElement('div');d.id='testyt';d.style.cssText='position:fixed;left:10px;top:10px;width:300px;height:200px;z-index:9999';document.body.appendChild(d)
  window.__testPlayer=new YT.Player('testyt',{videoId:'dQw4w9WgXcQ',playerVars:{origin:location.origin,autoplay:1,controls:1},events:{onReady:e=>{window.__ready=e.target.getPlayerState()},onError:e=>{window.__err=e.data},onStateChange:e=>{window.__state=e.data}}})
})()`)
await c.wait(10000)
console.log(await c.evaluate(`JSON.stringify({origin:location.origin,ready:window.__ready,err:window.__err,state:window.__state,time:window.__testPlayer?.getCurrentTime?.(),src:document.querySelector('#testyt iframe')?.src})`))
c.close()
