import { connect } from './cdp.mjs'
const c = await connect()
console.log('PATHS', JSON.stringify(await c.evaluate('window.api.app.paths()')))
console.log('SETTINGS', JSON.stringify(await c.evaluate('window.api.db.all("SELECT key,value FROM settings")')))
console.log('ERRORS', JSON.stringify(await c.evaluate('window.__nova_errors||[]')))
c.close()
