import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)
await c.clickText('button.nav-item', 'Música')
await c.wait(500)

const IDS = ['dQw4w9WgXcQ', 'kJQP7kiw5Fk', 'JGwWNGJdvx8', 'OPf0YbXqDm0', 'fJ9rUzIMcZQ']
const waitBtn = async (text, ms = 12000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    const ok = await c.evaluate(`[...document.querySelectorAll('button:not([disabled])')].some(b=>b.textContent.includes(${JSON.stringify(text)}))`)
    if (ok) return
    await c.wait(200)
  }
  throw new Error('Botão não ficou disponível: ' + text)
}
for (const id of IDS) {
  await waitBtn('Adicionar')
  await c.setInput('.add-bar input.input', `https://www.youtube.com/watch?v=${id}`)
  await c.clickText('button', 'Adicionar')
  await c.wait(700)
}
await waitBtn('Adicionar')
const rows = await c.evaluate(`document.querySelectorAll('.queue .song-row').length`)
check('5 músicas adicionadas à fila', rows === 5, String(rows))
const dbSongs = await c.evaluate(`(async()=>{const r=await window.api.db.all('SELECT COUNT(*) c FROM songs');return r.rows[0].c})()`)
check('músicas persistidas no banco', dbSongs >= 5, String(dbSongs))

const thumbs = await c.evaluate(`[...document.querySelectorAll('.queue .song-row img')].map(i=>i.src).filter(Boolean).length`)
check('miniaturas reais carregadas', thumbs >= 5, String(thumbs))

// Reproduzir primeira música (clique confiável via Input)
await c.evaluate(`document.querySelector('.queue .song-row .meta').click()`)
await c.wait(7000)
const timeText = async () => c.evaluate(`document.querySelector('.mini-progress small')?.textContent?.trim() || '0:00'`)
const t1 = await timeText()
const secs = s => { const [m, ss] = s.split(':').map(Number); return m * 60 + (ss || 0) }
check('reprodução real iniciou (tempo avançou)', secs(t1) > 0, `tempo=${t1}`)

// Pausa
await c.click('.mini-player .ctrl.play')
await c.wait(2500)
const t2 = await timeText()
await c.wait(2000)
const t3 = await timeText()
check('pausa realmente parou o áudio', secs(t2) === secs(t3), `${t2} -> ${t3}`)

// Retomada
await c.click('.mini-player .ctrl.play')
await c.wait(3000)
const t4 = await timeText()
check('retomada avançou o tempo', secs(t4) > secs(t3), `${t3} -> ${t4}`)

// Volume
await c.evaluate(`(()=>{const i=document.querySelector('.mini-player .volume input[type=range]');const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(i,'0.3');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()`)
await c.wait(400)
check('volume alterado', !!(await c.evaluate(`document.querySelector('.mini-player .volume input[type=range]')?.value === '0.3'`)))

// Próxima / anterior
const title1 = await c.evaluate(`document.querySelector('.mini-meta b')?.textContent`)
await c.click('.mini-player .ctrl:last-of-type')
await c.wait(2500)
const title2 = await c.evaluate(`document.querySelector('.mini-meta b')?.textContent`)
check('próxima música trocou a faixa', title1 !== title2, `${title1} -> ${title2}`)

// Aleatório e repetição
await c.click('.mini-player .mini-btn[title="Aleatório"]')
await c.click('.mini-player .mini-btn[title="Repetir"]')
await c.wait(300)
check('modos aleatório/repetição ativos', await c.evaluate(`document.querySelectorAll('.mini-player .mini-btn.active').length >= 2`))

// Vinil 3D
check('toca-discos 3D renderizado', await c.evaluate(`!!document.querySelector('.turntable-stage canvas')`))

summary('T4 MÚSICA/YOUTUBE')
c.close()
