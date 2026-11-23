import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Música')
await c.wait(500)
await c.evaluate(`document.querySelector('.queue .song-row .meta')?.click()`)
await c.wait(5000)
console.log(await c.evaluate(`(()=>{const p=window.__novaPlayer;if(!p)return 'no debug';const a=p.apiRef.current;return JSON.stringify({hasApi:!!a,current:p.current?.youtube_id,pending:p.pendingRef.current,state:a?.getState?.(),time:a?.getTime?.(),dur:a?.getDuration?.(),iframeSrc:document.querySelector('iframe')?.src})})()`))
c.close()
