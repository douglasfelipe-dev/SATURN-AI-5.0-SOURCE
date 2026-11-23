import { connect, check, summary } from './cdp.mjs'
const c = await connect()
const cids = ['dQw4w9WgXcQ', 'kJQP7kiw5Fk', 'JGwWNGJdvx8', 'OPf0YbXqDm0', 'fJ9rUzIMcZQ']
await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3000)
await c.clickText('button.nav-item', 'Cinema')
await c.wait(600)
check('sala 3D renderizada', await c.evaluate(`!!document.querySelector('.cinema-room canvas')`))
check('tela segue a câmera', await c.evaluate(`(()=>{const e=document.querySelector('.cinema-screen-follow');return !!e && e.style.width !== ''})()`))

for (const id of cids) {
  await c.setInput('.cinema-toolbar input.input', `https://youtu.be/${id}`)
  await c.clickText('button', 'Adicionar')
  await c.wait(600)
}
const qtd = await c.evaluate(`document.querySelectorAll('.song-row').length`)
check('5 vídeos na fila', qtd === 5, String(qtd))

await c.evaluate(`document.querySelector('.song-row .meta')?.click()`)
await c.wait(7000)
const ctrlText = async () => c.evaluate(`document.querySelector('.cinema-controls')?.innerText||''`)
const time = async () => { const m = (await ctrlText()).match(/(\d+:\d+)\s*\//); return m ? m[1] : '0:00' }
const secs = s => { const [a,b] = s.split(':').map(Number); return a*60+b }
const t1 = await time()
check('vídeo reproduzindo de verdade', secs(t1) > 0, `tempo=${t1}`)

await c.click('.cinema-controls .btn.icon.primary')
await c.wait(1500)
const p1 = await time(); await c.wait(1500); const p2 = await time()
check('pausa parou o vídeo', secs(p1) === secs(p2), `${p1} -> ${p2}`)
await c.click('.cinema-controls .btn.icon.primary')
await c.wait(2500)
const t2 = await time()
check('retomada avançou', secs(t2) > secs(p2), `${p2} -> ${t2}`)

// Próximo (3º botão dos controles: anterior, play, próximo)
const title1 = await c.evaluate(`document.querySelector('.cinema-title')?.textContent`)
await c.click('.cinema-controls button:nth-child(3)')
await c.wait(2500)
const title2 = await c.evaluate(`document.querySelector('.cinema-title')?.textContent`)
check('próximo vídeo trocou a faixa', title1 !== title2, `${title1} -> ${title2}`)

// Captura
await c.clickText('button[title="Capturar quadro atual"]', '')
await c.wait(1500)
check('captura gerou retorno visual', await c.evaluate(`document.body.innerText.includes('Captura salva') || document.body.innerText.includes('Não foi possível capturar')`))

// Remoção e limpeza
const before = await c.evaluate(`document.querySelectorAll('.song-row').length`)
await c.evaluate(`document.querySelector('.song-row .mini-btn')?.click()`)
await c.wait(500)
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Confirmar');if(b)b.click()})()`)
await c.wait(800)
const after = await c.evaluate(`document.querySelectorAll('.song-row').length`)
check('remover vídeo da fila', after === before - 1, `${before} -> ${after}`)
await c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Limpar fila'));if(b)b.click()})()`)
await c.wait(800)
check('limpar fila', (await c.evaluate(`document.querySelectorAll('.song-row').length`)) === 0)

summary('T5 CINEMA')
c.close()
