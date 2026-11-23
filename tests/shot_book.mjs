import { connect } from './cdp.mjs'
const c = await connect()
await c.clickText('button.nav-item', 'Livros')
await c.wait(800)
await c.evaluate(`document.querySelectorAll('.shelf-book-actions .mini-btn')[1]?.click()`)
await c.wait(2800)
c.close()
