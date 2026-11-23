import { connect, check, summary } from './cdp.mjs'
import path from 'node:path'
const c = await connect()
const video = path.resolve('../VIDEO PARA TESTE/2026-11-19 15-27-01.mp4')
const mp3 = path.resolve('tests/fixtures30/musica teste.mp3')
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

// --- Vídeo MP4 ---
await c.clickText('button.nav-item', 'Vídeos'); await c.wait(600)
await c.dropFiles('.page', [video]); await c.wait(4500)
check('MP4 importado', (await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM local_videos')).rows[0].c)()`)) >= 1)
check('player de vídeo presente', await c.evaluate(`!!document.querySelector('.page video')`))
await c.evaluate(`document.querySelector('.page .btn.icon.primary')?.click()`); await c.wait(3500)
const vstate = await c.evaluate(`(()=>{const v=document.querySelector('.page video');return JSON.stringify({ready:v?.readyState,err:!!v?.error,paused:v?.paused,t:v?.currentTime})})()`)
check('vídeo carregou sem erro de codec', !JSON.parse(vstate).err, vstate)
const vt = await c.evaluate(`document.querySelector('.page video')?.currentTime||0`)
check('vídeo reproduziu (tempo avançou)', vt > 0, String(vt))
await c.evaluate(`document.querySelector('.cinema-controls-2d button, .page .btn.icon.primary')?.click()`)
await c.wait(1200)
const vp = await c.evaluate(`document.querySelector('.page video')?.paused`)
check('pausa funcionou', vp === true)

// --- MP3 ---
await c.clickText('button.nav-item', 'Músicas locais'); await c.wait(600)
await c.dropFiles('.page', [mp3]); await c.wait(4000)
check('MP3 importado', (await c.evaluate(`(async()=>(await window.api.db.all('SELECT COUNT(*) c FROM local_tracks')).rows[0].c)()`)) >= 1)
check('faixa visível na playlist', await c.evaluate(`document.querySelectorAll('.song-row').length>0`))
await c.evaluate(`document.querySelector('.song-row .meta')?.click()`); await c.wait(4500)
const ast = await c.evaluate(`(()=>{const a=document.querySelector('audio');return JSON.stringify({err:!!a?.error,paused:a?.paused,t:a?.currentTime,d:a?.duration})})()`)
check('áudio carregou sem erro', !JSON.parse(ast).err, ast)
const at = await c.evaluate(`document.querySelector('audio')?.currentTime||0`)
check('MP3 reproduziu', at > 0, String(at))
await c.evaluate(`document.querySelector('.ctrl.play')?.click()`); await c.wait(1000)
check('pausa do MP3 funcionou', (await c.evaluate(`document.querySelector('audio')?.paused`)) === true)
await c.evaluate(`document.querySelector('.ctrl.play')?.click()`); await c.wait(1200)
check('retomada do MP3 funcionou', (await c.evaluate(`document.querySelector('audio')?.paused`)) === false)

summary('T12 MIDIA LOCAL 3.0')
c.close()
