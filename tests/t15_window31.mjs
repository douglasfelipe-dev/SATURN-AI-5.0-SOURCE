import { connect, check, summary } from './cdp.mjs'
import { execSync } from 'node:child_process'
const c = await connect()
await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); await c.wait(3000)

const win = (action = 'info', x = 0, y = 0, w = 0, h = 0) => JSON.parse(
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File tests/win_ops.ps1 -Action ${action} -X ${x} -Y ${y} -W ${w} -H ${h}`, { encoding: 'utf8' }).trim()
)

const i0 = win()
check('janela nativa do Windows encontrada', !i0.error, JSON.stringify(i0))
check('borda redimensionável (WS_THICKFRAME)', i0.thick === true, JSON.stringify(i0))

const b1 = await c.evaluate(`window.api.win.bounds()`)
check('bounds via IPC disponíveis', b1 && b1.width > 0, JSON.stringify(b1))

const i1 = win('move', 1000, 150, 900, 650)
check('janela moveu no Windows (monitor principal)', Math.abs(i1.x - 1000) < 20 && Math.abs(i1.w - 900) < 20, JSON.stringify(i1))
const b2 = await c.evaluate(`window.api.win.bounds()`)
check('IPC reflete nova posição', Math.abs(b2.x - 1000) < 20, JSON.stringify(b2))

// Simular segundo monitor: posição além da largura do monitor principal
const i2 = win('move', 1950, 120, 1000, 700)
check('janela pode ir para região de segundo monitor', i2.x >= 1900, JSON.stringify(i2))

// Voltar e testar controles
win('move', 300, 80, 900, 650)
await c.wait(500)
await c.evaluate(`window.api.win.minimize()`); await c.wait(900)
check('minimizar executou', (await c.evaluate(`window.api.win.bounds()`)) !== null)
await c.evaluate(`window.api.win.setBounds({x:300,y:80,width:900,height:650,maximized:false})`); await c.wait(700)
await c.evaluate(`window.api.win.toggle()`); await c.wait(900)
check('maximizar', (await c.evaluate(`window.api.win.bounds()`)).maximized === true)
await c.evaluate(`window.api.win.toggle()`); await c.wait(700)
check('restaurar', (await c.evaluate(`window.api.win.bounds()`)).maximized === false)

const drag = await c.evaluate(`getComputedStyle(document.querySelector('.topbar')).webkitAppRegion || getComputedStyle(document.querySelector('.topbar')).appRegion`)
check('topbar é região de arraste nativa', drag === 'drag', String(drag))
const noDrag = await c.evaluate(`getComputedStyle(document.querySelector('.window-controls button')).webkitAppRegion`)
check('botões não bloqueiam arraste', noDrag === 'no-drag', String(noDrag))

summary('T15 JANELA WINDOWS 3.0')
c.close()
