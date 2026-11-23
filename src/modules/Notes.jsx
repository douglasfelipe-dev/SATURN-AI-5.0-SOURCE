import React, { useEffect, useMemo, useState } from 'react'
import { StickyNote, ListChecks, AlarmClock, CalendarDays, Plus, Trash2, Pencil, Pin, Search, Check, Bell, BellRing, Clock3, RefreshCw } from 'lucide-react'
import { all, run, now, api } from '../lib/db'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'
import { Modal, Confirm, Empty, Switch } from '../components/common'

const NOTE_COLORS = ['#F7E3B3', '#D9E5D2', '#F7C8B6', '#D6E0EE', '#EFE0F0', '#FFFFFF']
const REPEATS = [['once','Uma vez'],['daily','Todos os dias'],['weekly','Dias específicos / semanal'],['monthly','Mensal']]
const DAYS = [['D','Domingo'],['S','Segunda'],['T','Terça'],['Q','Quarta'],['Q','Quinta'],['S','Sexta'],['S','Sábado']]

export default function Notes({ onToast }) {
  const [tab, setTab] = useState('notes')
  const [notes, setNotes] = useState([])
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [events, setEvents] = useState([])
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const load = async () => {
    const [n, t, r, e] = await Promise.all([
      all('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC'),
      all('SELECT * FROM tasks ORDER BY done, id DESC'),
      all('SELECT * FROM reminders ORDER BY due_at'),
      all('SELECT * FROM events ORDER BY date, time')
    ])
    setNotes(n); setTasks(t); setReminders(r); setEvents(e)
  }
  useEffect(() => { load() }, [])

  const categories = useMemo(() => ['Todas', ...new Set(notes.map(n => n.category || 'Geral'))], [notes])
  const shownNotes = notes.filter(n => (catFilter === 'Todas' || (n.category || 'Geral') === catFilter) &&
    (!query || (n.title + ' ' + n.content).toLowerCase().includes(query.toLowerCase())))

  const openNote = (n = {}) => { setDraft({ color: NOTE_COLORS[0], category: 'Geral', ...n }); setModal('note') }
  const saveNote = async () => {
    if (!(draft.title || '').trim()) { onToast('Informe o título da nota', 'error'); return }
    if (draft.id) await run('UPDATE notes SET title=?,content=?,color=?,category=?,pinned=?,updated_at=? WHERE id=?',
      [draft.title, draft.content || '', draft.color, draft.category || 'Geral', draft.pinned ? 1 : 0, now(), draft.id])
    else await run('INSERT INTO notes (title,content,color,category,pinned,updated_at) VALUES (?,?,?,?,?,?)',
      [draft.title, draft.content || '', draft.color, draft.category || 'Geral', draft.pinned ? 1 : 0, now()])
    setModal(null); setDraft({}); sfx.confirm(); load()
  }
  const autoSaveNote = async (n, patch) => {
    await run('UPDATE notes SET title=?,content=?,color=?,category=?,pinned=?,updated_at=? WHERE id=?',
      [patch.title ?? n.title, patch.content ?? n.content, patch.color ?? n.color, patch.category ?? n.category, patch.pinned ?? n.pinned, now(), n.id])
    load()
  }
  const addTask = async () => {
    if (!(draft.title || '').trim()) return
    await run('INSERT INTO tasks (title,done,due,priority,created_at) VALUES (?,0,?,?,?)', [draft.title, draft.due || null, draft.priority || 'normal', now()])
    setDraft({}); sfx.confirm(); load()
  }
  const toggleTask = async t => { await run('UPDATE tasks SET done=? WHERE id=?', [t.done ? 0 : 1, t.id]); sfx.click(); load() }

  const toLocalInput = d => {
    const off = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - off).toISOString().slice(0, 16)
  }
  const openReminder = (r = {}) => {
    const due = r.due_at ? new Date(r.due_at) : new Date(Date.now() + 3600000)
    setDraft({ title: r.title || '', description: r.description || '', due: toLocalInput(due), repeat_mode: r.repeat_mode || 'once', weekdays: r.weekdays || '1,2,3,4,5', enabled: r.enabled !== 0, ...(r.id ? { id: r.id } : {}) })
    setModal('reminder')
  }
  const saveReminder = async () => {
    if (!(draft.title || '').trim() || !draft.due) { onToast('Informe título e data/hora do lembrete', 'error'); return }
    const due = new Date(draft.due).toISOString()
    if (draft.id) {
      await run('UPDATE reminders SET title=?,description=?,due_at=?,repeat_mode=?,weekdays=?,enabled=?,last_fired=NULL WHERE id=?',
        [draft.title, draft.description, due, draft.repeat_mode, draft.weekdays, draft.enabled ? 1 : 0, draft.id])
      await run('UPDATE events SET title=?,date=?,time=?,description=? WHERE reminder_id=?', [draft.title, draft.due.slice(0,10), draft.due.slice(11,16), draft.description, draft.id])
    } else {
      const res = await run('INSERT INTO reminders (title,description,due_at,repeat_mode,weekdays,enabled,created_at) VALUES (?,?,?,?,?,?,?)',
        [draft.title, draft.description, due, draft.repeat_mode, draft.weekdays, draft.enabled ? 1 : 0, now()])
      const rid = res?.lastInsertRowid
      await run('INSERT INTO events (title,date,time,description,reminder_id,created_at) VALUES (?,?,?,?,?,?)',
        [draft.title, draft.due.slice(0,10), draft.due.slice(11,16), draft.description, rid, now()])
    }
    await api.reminder.check()
    setModal(null); setDraft({}); sfx.confirm(); load(); onToast('Lembrete salvo. A notificação será exibida no horário.')
  }
  const testNotify = async () => {
    const r = await api.notify.test()
    sfx.confirm(); load()
    onToast(r.supported ? 'Notificação de teste enviada' : 'Notificações do sistema indisponíveis; avisos aparecem na central do cabeçalho')
  }

  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth() + (selectedDay?.offset || 0), 1)
  const first = base.getDay(), days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const dateStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const dayKey = dateStr(new Date(base.getFullYear(), base.getMonth(), selectedDay?.day || today.getDate()))

  return (
    <div className="page">
      <div className="page-head"><h1 className="page-title">Notas</h1><p className="page-sub">Notas, tarefas, lembretes e compromissos em um só lugar</p></div>
      <div className="tabs">
        {[['notes','Notas',StickyNote],['tasks','Tarefas',ListChecks],['reminders','Lembretes',AlarmClock],['calendar','Calendário',CalendarDays]].map(([id,l,Icon])=>
          <button key={id} className={cx('tab', tab===id && 'active')} onClick={()=>{sfx.nav(); setTab(id)}}><Icon size={14}/> {l}</button>)}
      </div>

      {tab==='notes' && <>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          <input className="input" style={{ width:220 }} placeholder="Pesquisar notas..." value={query} onChange={e=>setQuery(e.target.value)} />
          <div className="chip-row">{categories.map(c=><button key={c} className={cx('chip',catFilter===c&&'active')} onClick={()=>setCatFilter(c)}>{c}</button>)}</div>
          <button className="btn primary" style={{ marginLeft:'auto' }} onClick={()=>openNote()}><Plus size={15}/> Nova nota</button>
        </div>
        <div className="grid grid-3">{shownNotes.map(n=><div key={n.id} className="note-card" style={{ background:n.color }}>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {n.pinned ? <Pin size={13} style={{color:'var(--primary)'}}/> : null}
            <b style={{ flex:1 }}>{n.title}</b>
            <button className="mini-btn" onClick={()=>autoSaveNote(n,{pinned:n.pinned?0:1})} title="Fixar"><Pin size={13}/></button>
            <button className="mini-btn" onClick={()=>openNote(n)}><Pencil size={13}/></button>
            <button className="mini-btn" onClick={()=>setConfirm({type:'note',item:n})}><Trash2 size={13}/></button>
          </div>
          <p>{n.content || 'Sem conteúdo'}</p>
          <small style={{ color:'#776', fontSize:10 }}>{n.category || 'Geral'} · {new Date(n.updated_at).toLocaleDateString('pt-BR')}</small>
        </div>)}</div>
        {!shownNotes.length && <Empty icon="📝" title="Nenhuma nota encontrada"/>}
      </>}

      {tab==='tasks' && <div className="grid grid-2">
        <div className="card">
          <div className="section-head" style={{margin:'0 0 12px'}}><h3>Tarefas pendentes</h3><span className="chip">{tasks.filter(t=>!t.done).length}</span></div>
          <div className="add-bar"><input className="input" placeholder="Nova tarefa..." value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})} onKeyDown={e=>e.key==='Enter'&&addTask()}/><button className="btn primary" onClick={addTask}><Plus size={15}/></button></div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input type="date" className="input" value={draft.due||''} onChange={e=>setDraft({...draft,due:e.target.value})}/>
            <select className="select" value={draft.priority||'normal'} onChange={e=>setDraft({...draft,priority:e.target.value})}>
              <option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option>
            </select>
          </div>
          {tasks.filter(t=>!t.done).map(t=><div key={t.id} className="task-row">
            <button className="check" onClick={()=>toggleTask(t)}/>
            <span className="t-title">{t.title}<small style={{display:'block',color:'var(--muted)'}}>{t.priority}{t.due?' · '+t.due:''}</small></span>
            <button className="mini-btn" onClick={()=>setConfirm({type:'task',item:t})}><Trash2 size={13}/></button>
          </div>)}
          {!tasks.filter(t=>!t.done).length && <Empty icon="✓" title="Nenhuma tarefa pendente"/>}
        </div>
        <div className="card">
          <div className="section-head" style={{margin:'0 0 12px'}}><h3>Concluídas</h3><span className="chip">{tasks.filter(t=>t.done).length}</span></div>
          {tasks.filter(t=>t.done).map(t=><div key={t.id} className="task-row done">
            <button className="check on" onClick={()=>toggleTask(t)}><Check size={13}/></button><span className="t-title">{t.title}</span>
            <button className="mini-btn" onClick={()=>setConfirm({type:'task',item:t})}><Trash2 size={13}/></button>
          </div>)}
          {!tasks.filter(t=>t.done).length && <Empty icon="🏁" title="Nenhuma tarefa concluída ainda"/>}
        </div>
      </div>}

      {tab==='reminders' && <>
        <div style={{ display:'flex',gap:8,marginBottom:14 }}>
          <button className="btn primary" onClick={()=>openReminder()}><Plus size={15}/> Novo lembrete</button>
          <button className="btn ghost" onClick={testNotify}><BellRing size={15}/> Testar notificação</button>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)', alignSelf:'center' }}>Notificações reais via sistema operacional + central do cabeçalho</span>
        </div>
        <div className="grid grid-2">{reminders.map(r=>{
          const next = new Date(r.due_at)
          return <div key={r.id} className="card" style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:42,height:42,borderRadius:13,background:r.enabled?'var(--green)':'var(--coral)',display:'grid',placeItems:'center',flex:'0 0 42px' }}>
              {r.enabled?<Bell size={19}/>:<Bell size={19} style={{opacity:.4}}/>}
            </div>
            <div style={{flex:1}}>
              <b style={{fontSize:13}}>{r.title}</b>
              {r.description && <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{r.description}</div>}
              <div style={{fontSize:11,marginTop:6}}><Clock3 size={12} style={{verticalAlign:-2}}/> {next.toLocaleString('pt-BR')}</div>
              <div style={{fontSize:10.5,color:'var(--muted)'}}><RefreshCw size={11} style={{verticalAlign:-2}}/> {REPEATS.find(x=>x[0]===r.repeat_mode)?.[1]}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <button className="mini-btn" onClick={()=>openReminder(r)}><Pencil size={13}/></button>
              <div title={r.enabled ? 'Desativar' : 'Ativar'} onClick={async()=>{await run('UPDATE reminders SET enabled=? WHERE id=?',[r.enabled?0:1,r.id]);sfx.click();load()}}><Switch on={!!r.enabled} onChange={()=>{}}/></div>
              <button className="mini-btn" onClick={()=>setConfirm({type:'reminder',item:r})}><Trash2 size={13}/></button>
            </div>
          </div>
        })}</div>
        {!reminders.length && <Empty icon="⏰" title="Nenhum lembrete criado"/>}
      </>}

      {tab==='calendar' && <div className="grid grid-2">
        <div className="card">
          <div className="section-head" style={{margin:'0 0 12px'}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="mini-btn" onClick={()=>setSelectedDay(s=>({ ...(s||{}), offset:(s?.offset||0)-1 }))}>‹</button>
              <h3>{base.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h3>
              <button className="mini-btn" onClick={()=>setSelectedDay(s=>({ ...(s||{}), offset:(s?.offset||0)+1 }))}>›</button>
            </div>
            <button className="btn sm ghost" onClick={()=>setSelectedDay(null)}>Hoje</button>
          </div>
          <div className="calendar-grid">{DAYS.map((d,i)=><small key={i} style={{textAlign:'center',color:'var(--muted)'}}>{d[0]}</small>)}
            {Array.from({length:first}).map((_,i)=><div key={'e'+i}/>)}
            {Array.from({length:days},(_,i)=>i+1).map(d=>{
              const ds = dateStr(new Date(base.getFullYear(),base.getMonth(),d))
              const has = events.some(e=>e.date===ds) || reminders.some(r=>r.due_at?.slice(0,10)===ds)
              const isToday = d===today.getDate()&&base.getMonth()===today.getMonth()&&base.getFullYear()===today.getFullYear()
              return <button key={d} className={cx('cal-day',isToday&&'today',selectedDay?.day===d&&'selected')} onClick={()=>setSelectedDay({day:d,offset:selectedDay?.offset||0})}>{d}{has&&<span className="cal-dot"/>}</button>
            })}
          </div>
        </div>
        <div className="card">
          <div className="section-head" style={{margin:'0 0 12px'}}><h3>Compromissos do dia</h3><button className="btn sm primary" onClick={()=>{
            const d = selectedDay ? new Date(base.getFullYear(),base.getMonth(),selectedDay.day) : today
            openReminder({ due_at: new Date(d.getFullYear(),d.getMonth(),d.getDate(),9,0).toISOString() })
          }}><Plus size={14}/> Novo</button></div>
          {[...events.filter(e=>e.date===dayKey), ...reminders.filter(r=>r.due_at?.slice(0,10)===dayKey)].map((e,i)=>
            <div key={i} className="task-row"><CalendarDays size={15} style={{color:'var(--primary)'}}/>
              <span className="t-title">{e.title}<small style={{display:'block',color:'var(--muted)'}}>{e.time || (e.due_at?e.due_at.slice(11,16):'')}</small></span></div>)}
          {!events.filter(e=>e.date===dayKey).length && !reminders.filter(r=>r.due_at?.slice(0,10)===dayKey).length && <Empty icon="📅" title="Nada agendado para este dia"/>}
        </div>
      </div>}

      {modal==='note' && <Modal title={draft.id?'Editar nota':'Nova nota'} onClose={()=>setModal(null)}
        actions={<><button className="btn ghost" onClick={()=>setModal(null)}>Cancelar</button><button className="btn primary" onClick={saveNote}>Salvar</button></>}>
        <div className="field"><label>Título</label><input className="input" autoFocus value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
        <div className="field"><label>Conteúdo (salvamento automático ao salvar)</label><textarea className="textarea" style={{minHeight:150}} value={draft.content||''} onChange={e=>setDraft({...draft,content:e.target.value})}/></div>
        <div className="field"><label>Categoria</label><input className="input" value={draft.category||''} onChange={e=>setDraft({...draft,category:e.target.value})} placeholder="Geral"/></div>
        <div className="field"><label>Cor</label><div className="chip-row">{NOTE_COLORS.map(c=><button key={c} className="theme-swatch" style={{width:34,background:c,border:draft.color===c?'3px solid var(--primary)':'3px solid transparent'}} onClick={()=>setDraft({...draft,color:c})}/>)}</div></div>
        <Switch on={!!draft.pinned} onChange={v=>setDraft({...draft,pinned:v})}/> <span style={{fontSize:12}}>Fixar nota</span>
      </Modal>}

      {modal==='reminder' && <Modal title={draft.id?'Editar lembrete':'Novo lembrete'} onClose={()=>setModal(null)}
        actions={<><button className="btn ghost" onClick={()=>setModal(null)}>Cancelar</button><button className="btn primary" onClick={saveReminder}>Salvar lembrete</button></>}>
        <div className="field"><label>Título</label><input className="input" autoFocus value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Ex.: Tomar medicamento"/></div>
        <div className="field"><label>Descrição</label><textarea className="textarea" style={{minHeight:70}} value={draft.description||''} onChange={e=>setDraft({...draft,description:e.target.value})}/></div>
        <div className="field"><label>Data e horário</label><input type="datetime-local" className="input" value={draft.due||''} onChange={e=>setDraft({...draft,due:e.target.value})}/></div>
        <div className="field"><label>Repetição</label><select className="select" value={draft.repeat_mode||'once'} onChange={e=>setDraft({...draft,repeat_mode:e.target.value})}>
          {REPEATS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select></div>
        {draft.repeat_mode==='weekly' && <div className="field"><label>Dias da semana</label><div className="chip-row">{DAYS.map(([s,l],i)=>{
          const arr=String(draft.weekdays||'').split(',').filter(Boolean)
          const on=arr.includes(String(i))
          return <button key={i} className={cx('chip',on&&'active')} onClick={()=>setDraft({...draft,weekdays:(on?arr.filter(x=>x!==String(i)):[...arr,String(i)]).join(',')})}>{l}</button>
        })}</div></div>}
        <div className="settings-row"><div className="s-info"><b>Ativo</b><small>O lembrete vai disparar no horário</small></div><Switch on={draft.enabled!==false} onChange={v=>setDraft({...draft,enabled:v})}/></div>
      </Modal>}

      {confirm && <Confirm title="Excluir" message={`Excluir “${confirm.item.title}”?`} danger onCancel={()=>setConfirm(null)}
        onConfirm={async()=>{
          const t=confirm.type
          if(t==='note') await run('DELETE FROM notes WHERE id=?',[confirm.item.id])
          else if(t==='task') await run('DELETE FROM tasks WHERE id=?',[confirm.item.id])
          else { await run('DELETE FROM reminders WHERE id=?',[confirm.item.id]); await run('DELETE FROM events WHERE reminder_id=?',[confirm.item.id]) }
          setConfirm(null); sfx.close(); load()
        }}/>}
    </div>
  )
}
