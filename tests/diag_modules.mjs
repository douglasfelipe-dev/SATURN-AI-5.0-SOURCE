import { connect } from './cdp.mjs'
const c = await connect()
const errors = []
c.ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
})
await c.send('Runtime.enable')
const mods = ['Início','Meu Ambiente','Música','Cinema','Livros','Galeria de fotos','Arquivos','Vídeos','Notas','Estatísticas','Perfil','Temas','Configurações']
for (const m of mods) {
  errors.length = 0
  try { await c.clickText('button.nav-item', m) } catch (e) { console.log(m, 'NAVEGAÇÃO FALHOU', e.message); continue }
  await c.wait(900)
  const title = await c.text('.page-title')
  console.log(`${m}: ${title || 'SEM TÍTULO'} ${errors.length ? 'ERROS: ' + [...new Set(errors)].slice(0,2).join(' | ').slice(0,300) : 'OK'}`)
}
c.close()
