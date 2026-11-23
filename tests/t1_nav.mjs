import { connect, check, summary } from './cdp.mjs'
const c = await connect()
await c.wait(1500)

const title = await c.text('h1')
check('splash/dashboard carregou', !!title, title || '')

const navTexts = await c.evaluate(`[...document.querySelectorAll('.nav-item')].map(x=>x.textContent.trim())`)
check('menu sem Aquário', !navTexts.some(x => x.includes('Aquário')))
check('menu sem Android', !navTexts.some(x => x.includes('Android')))
check('menu sem Terminal', !navTexts.some(x => x.includes('Terminal')))
check('sem Nova Plus', !(await c.evaluate(`document.body.textContent.includes('Nova Plus')`)))
check('Meu Ambiente no menu', navTexts.some(x => x.includes('Meu Ambiente')))
check('Temas no menu', navTexts.some(x => x.includes('Temas')))
check('Vídeos no menu', navTexts.some(x => x.includes('Vídeos')))

const modules = [
  ['Meu Ambiente', 'Meu Ambiente'], ['Música', 'Música'], ['Cinema', 'Cinema'],
  ['Livros', 'Biblioteca'], ['Galeria de fotos', 'Galeria de fotos'], ['Arquivos', 'Arquivos'],
  ['Vídeos', 'Vídeos'], ['Notas', 'Notas'], ['Estatísticas', 'Estatísticas'],
  ['Perfil', 'Perfil'], ['Temas', 'Temas'], ['Configurações', 'Configurações']
]
for (const [nav, expected] of modules) {
  await c.clickText('button.nav-item', nav)
  await c.wait(400)
  const h = await c.text('.page-title')
  check(`navegar para ${nav}`, h === expected, h || 'sem título')
}
summary('T1 NAVEGAÇÃO')
c.close()
