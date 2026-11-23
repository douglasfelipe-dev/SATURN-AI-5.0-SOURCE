import { connect } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
await c.clickText('button.nav-item', 'Perfil')
await c.wait(500)
console.log('INPUTS', await c.evaluate(`[...document.querySelectorAll('input')].map(i=>({type:i.type,accept:i.accept,display:getComputedStyle(i).display}))`))
await c.fileInput('input[type=file]', [path.resolve('tests/fixtures/foto.jpg')])
await c.wait(1000)
console.log('FILES', await c.evaluate(`[...document.querySelectorAll('input[type=file]')].map(i=>i.files?.length||0)`))
console.log('PATH', await c.evaluate(`document.querySelector('input[type=file]')?.files?.[0]?.path`))
console.log('AVATAR', await c.evaluate(`document.querySelector('.avatar-big')?.outerHTML?.slice(0,200)`))
console.log('BODY', (await c.evaluate('document.querySelector(".content")?.innerText||""')).slice(0,500))
c.close()
