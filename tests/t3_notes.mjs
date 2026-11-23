import { connect, check, summary } from './cdp.mjs'
const c = await connect()
const TAG = 'T' + Date.now().toString().slice(-6)
const NOTE = 'Nota ' + TAG, TASK = 'Tarefa ' + TAG, REM = 'Lembrete ' + TAG
const q = s => JSON.stringify(s)
const count = async sql => c.evaluate(`(async()=>(await window.api.db.all(${q(sql)})).rows[0]?.c||0)()`)
const one = async sql => c.evaluate(`(async()=>(await window.api.db.all(${q(sql)})).rows[0]||null)()`)
const clickExact = async (sel, text) => c.evaluate(`(()=>{const b=[...document.querySelectorAll(${q(sel)})].find(x=>x.textContent.trim()===${q(text)});if(b){b.click();return true}return false})()`)

await c.send('Page.enable')
await c.send('Page.reload', { ignoreCache: true })
await c.wait(3200)
await c.clickText('button.nav-item', 'Notas')
await c.wait(1200)
check('página de notas abriu', (await c.text('.page-title')) === 'Notas')

// Nota
await clickExact('button', 'Nova nota')
await c.wait(500)
check('modal de nota abriu', await c.evaluate(`!!document.querySelector('.modal')`))
await c.setInput('.modal input.input', NOTE)
await c.setInput('.modal textarea', 'Conteúdo de teste v5')
await clickExact('.modal button', 'Salvar')
await c.wait(900)
check('modal fechou após salvar', await c.evaluate(`!document.querySelector('.modal')`))
check('nota criada', (await count(`SELECT COUNT(*) c FROM notes WHERE title=${q(NOTE)}`)) === 1)

// Busca
await c.setInput('.page input.input', TAG)
await c.wait(500)
check('busca encontra a nota', await c.evaluate(`document.body.innerText.includes(${q(NOTE)})`))

// Tarefa
await c.clickText('button.tab', 'Tarefas')
await c.wait(1000)
await c.setInput('.page input.input', TASK)
await clickExact('button.btn.primary', '')
await c.wait(800)
const t = await one(`SELECT id,done FROM tasks WHERE title=${q(TASK)}`)
check('tarefa criada', !!t, JSON.stringify(t))
if (t) {
  await c.click('.task-row .check')
  await c.wait(900)
  check('tarefa concluída', (await one(`SELECT done FROM tasks WHERE id=${t.id}`))?.done === 1)
}

// Lembrete recorrente disparado no passado
await c.clickText('button.tab', 'Lembretes')
await c.wait(1000)
const beforeNotify = await count('SELECT COUNT(*) c FROM notifications')
await clickExact('button', 'Novo lembrete')
await c.wait(500)
check('modal de lembrete abriu', await c.evaluate(`!!document.querySelector('.modal')`))
await c.setInput('.modal input.input', REM)
await c.setInput('.modal textarea', 'Descrição do lembrete de teste')
const past = new Date(Date.now() - 60000)
const local = new Date(past.getTime() - past.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
await c.setInput('.modal input[type=datetime-local]', local)
await c.evaluate(`(()=>{const s=document.querySelector('.modal select');if(s){s.value='daily';s.dispatchEvent(new Event('change',{bubbles:true}))}})()`)
await clickExact('.modal button', 'Salvar lembrete')
await c.wait(6000)
const rec = await one(`SELECT * FROM reminders WHERE title=${q(REM)}`)
check('lembrete criado com recorrência diária', !!rec && rec.repeat_mode === 'daily', JSON.stringify(rec && { id: rec.id, repeat: rec.repeat_mode }))
check('notificação real disparada', (await count('SELECT COUNT(*) c FROM notifications')) > beforeNotify)
check('próxima ocorrência recalculada', !!rec && new Date(rec.due_at) > new Date(), String(rec?.due_at))

await c.clickText('button.tab', 'Calendário')
await c.wait(900)
check('calendário renderiza grade', await c.evaluate(`document.querySelectorAll('.cal-day').length > 20`))
await c.clickText('button.tab', 'Lembretes')
await c.wait(900)
check('lembrete aparece na lista', await c.evaluate(`document.body.innerText.includes(${q(REM)})`))

summary('T3 NOTAS/TAREFAS/LEMBRETES v5')
c.close()
