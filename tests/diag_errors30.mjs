import { connect } from './cdp.mjs'
const c = await connect()
const logs=[]
c.ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.method==='Runtime.exceptionThrown')logs.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)})
await c.send('Runtime.enable')
for(const m of ['Início','Meu Ambiente','Música','Cinema','Livros','Galeria de fotos','Arquivos','Vídeos','Músicas locais','Notas','Estatísticas','Perfil','Temas','Configurações']){
  logs.length=0
  try{await c.clickText('button.nav-item',m)}catch(e){console.log(m,'NAV FALHOU');continue}
  await c.wait(800)
  const title=await c.text('.page-title')
  console.log(`${m}: ${title||'SEM TITULO'} ${logs.length?'ERROS: '+[...new Set(logs)].slice(0,2).join(' | ').slice(0,200):'OK'}`)
}
c.close()
