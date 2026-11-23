import { connect } from './cdp.mjs'
const c = await connect()
const q = sql => c.evaluate(`(async()=>JSON.stringify(await window.api.db.all(${JSON.stringify(sql)})))()`)
console.log('REM', await q('SELECT id,title,due_at,last_fired,repeat_mode,enabled FROM reminders'))
console.log('CHECK', await c.evaluate('(async()=>JSON.stringify(await window.api.reminder.check()))()').catch(e => 'ERR ' + e.message))
await c.wait(500)
console.log('NOTIF', await c.evaluate('(async()=>JSON.stringify(await window.api.notify.list()))()').catch(e => 'ERR ' + e.message))
console.log('REM2', await q('SELECT id,due_at,last_fired,enabled FROM reminders'))
c.close()
