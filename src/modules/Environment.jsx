import React, { useEffect, useRef, useState } from 'react'
import { Clock3, CalendarDays, CloudSun, StickyNote, Zap, ListChecks, Plus, Trash2, GripVertical, Maximize2, Palette, RefreshCw, Pencil, Eraser, Brush, Undo2, Redo2, Save, Download, BookHeart, Wrench, RotateCcw } from 'lucide-react'
import { all, run, now, setting, setSetting, mediaUrl } from '../lib/db'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'
import { Modal } from '../components/common'

const WIDGETS = [
  { id: 'clock', label: 'Relógio digital', icon: Clock3 },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays },
  { id: 'weather', label: 'Previsão do tempo', icon: CloudSun },
  { id: 'note', label: 'Notas rápidas', icon: StickyNote },
  { id: 'shortcuts', label: 'Atalhos', icon: Zap },
  { id: 'tasks', label: 'Lista de tarefas', icon: ListChecks },
  { id: 'date', label: 'Indicador de data', icon: CalendarDays },
  { id: 'draw', label: 'Ferramentas de desenho', icon: Brush },
  { id: 'diary', label: 'Diário', icon: BookHeart },
  { id: 'tools', label: 'Ferramentas', icon: Wrench }
]
const COLORS = ['#F7E3B3','#D9E5D2','#F7C8B6','#D6E0EE','#FFFFFF','#EFE0F0']
const DEFAULT_POS = {
  clock:[0,0,280,150], calendar:[300,0,360,300], weather:[690,0,300,190], date:[1010,0,280,150],
  note:[0,180,300,240], tasks:[330,330,360,260], shortcuts:[720,210,300,210],
  draw:[0,450,520,400], diary:[700,420,340,300], tools:[1050,200,240,220]
}

function Weather() {
  const [city, setCity] = useState(() => localStorage.getItem('nova_weather_city') || 'São Paulo')
  const [data, setData] = useState(null), [error, setError] = useState('')
  const load = async (name = city) => {
    setError(''); setData(null)
    try {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`)
      const gj = await g.json()
      if (!gj.results?.length) { setError('Cidade não encontrada.'); return }
      const { latitude, longitude } = gj.results[0]
      const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`)
      const wj = await w.json()
      setData({ ...wj.current, max: wj.daily?.temperature_2m_max?.[0], min: wj.daily?.temperature_2m_min?.[0], city: gj.results[0].name })
      localStorage.setItem('nova_weather_city', name)
    } catch { setError('Não foi possível consultar o clima (verifique a internet).') }
  }
  useEffect(() => { load() }, [])
  const desc = {0:'Céu limpo',1:'Parcialmente nublado',2:'Nublado',3:'Nublado',45:'Neblina',51:'Garoa',61:'Chuva',71:'Neve',80:'Pancadas',95:'Tempestade'}
  return <div className="w-weather">
    <div style={{ display:'flex', gap:6 }}><input className="input" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key==='Enter'&&load()} placeholder="Cidade"/><button className="btn icon sm" onClick={() => load()}><RefreshCw size={14}/></button></div>
    {error && <div className="w-error">{error}</div>}
    {!data && !error && <div className="w-muted">Carregando...</div>}
    {data && <><div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}><CloudSun size={34} style={{ color:'var(--primary)' }}/><div><div style={{ fontSize:30, fontWeight:700 }}>{Math.round(data.temperature_2m)}°</div><small className="w-muted">{desc[data.weather_code]||'Clima'} · {data.city}</small></div></div><div className="w-muted" style={{ marginTop:6 }}>Máx {Math.round(data.max)}° · Mín {Math.round(data.min)}° · Umidade {data.relative_humidity_2m}%</div></>}
  </div>
}

function MiniCalendar({ onPick }) {
  const [offset, setOffset] = useState(0)
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+offset)
  const first = base.getDay(), days = new Date(base.getFullYear(), base.getMonth()+1, 0).getDate(), today = new Date()
  return <div>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
      <button className="mini-btn" onClick={() => setOffset(o=>o-1)}>‹</button>
      <b style={{ fontSize:12 }}>{base.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</b>
      <button className="mini-btn" onClick={() => setOffset(o=>o+1)}>›</button>
    </div>
    <div className="minical-grid">{['D','S','T','Q','Q','S','S'].map((d,i)=><small key={i} style={{textAlign:'center',color:'var(--muted)'}}>{d}</small>)}
      {Array.from({length:first}).map((_,i)=><div key={'e'+i}/>)}
      {Array.from({length:days},(_,i)=>i+1).map(d=>{
        const t = d===today.getDate()&&base.getMonth()===today.getMonth()&&base.getFullYear()===today.getFullYear()
        return <button key={d} className={cx('minical-day',t&&'today')} onClick={()=>onPick?.(new Date(base.getFullYear(),base.getMonth(),d))}>{d}</button>
      })}
    </div>
  </div>
}

/* ---------- Mesa de desenho ---------- */
function DrawingWidget({ height }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#3d3730')
  const [size, setSize] = useState(4)
  const [undo, setUndo] = useState([])
  const [redo, setRedo] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const saved = await setting('env_drawing', null)
      const c = canvasRef.current; if (!c) return
      const ctx = c.getContext('2d')
      if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = saved }
      else { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height) }
    })()
  }, [])

  const pos = e => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (canvasRef.current.width / r.width), y: (e.clientY - r.top) * (canvasRef.current.height / r.height) }
  }
  const snapshot = () => canvasRef.current.toDataURL('image/png')
  const start = e => {
    const c = canvasRef.current, ctx = c.getContext('2d')
    setUndo(u => [...u, snapshot()].slice(-25)); setRedo([])
    drawing.current = true
    const p = pos(e)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = tool === 'pencil' ? Math.max(1, size / 2) : tool === 'eraser' ? size * 3 : size
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }
  const move = e => {
    if (!drawing.current) return
    const p = pos(e), ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  const end = async () => {
    if (!drawing.current) return
    drawing.current = false
    await setSetting('env_drawing', snapshot())
  }
  const restore = data => new Promise(r => { const img = new Image(); img.onload = () => { canvasRef.current.getContext('2d').drawImage(img,0,0); r() }; img.src = data })
  const doUndo = async () => { if (!undo.length) return; const prev = undo[undo.length-1]; setRedo(r => [...r, snapshot()]); setUndo(u => u.slice(0,-1)); await restore(prev); await setSetting('env_drawing', prev) }
  const doRedo = async () => { if (!redo.length) return; const next = redo[redo.length-1]; setUndo(u => [...u, snapshot()]); setRedo(r => r.slice(0,-1)); await restore(next); await setSetting('env_drawing', next) }
  const clear = async () => { setUndo(u => [...u, snapshot()].slice(-25)); const c = canvasRef.current, ctx = c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); await setSetting('env_drawing', snapshot()) }
  const savePng = async () => {
    const data = snapshot().split(',')[1]
    const p = await window.api.app.saveBase64(`desenho-${Date.now()}.png`, data, 'photos')
    if (p) { const r = await window.api.app.openPath(p); setMsg(r ? 'Erro ao abrir' : 'Salvo na galeria'); setTimeout(()=>setMsg(''),2500) }
  }

  return <div className="widget-body draw-widget">
    <div className="draw-tools">
      <button className={cx('btn sm',tool==='pen'?'primary':'ghost')} onClick={()=>setTool('pen')} title="Caneta"><Pencil size={13}/></button>
      <button className={cx('btn sm',tool==='pencil'?'primary':'ghost')} onClick={()=>setTool('pencil')} title="Lápis"><Brush size={13}/></button>
      <button className={cx('btn sm',tool==='eraser'?'primary':'ghost')} onClick={()=>setTool('eraser')} title="Borracha"><Eraser size={13}/></button>
      <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{ width:34,height:28,border:0,background:'none' }}/>
      <input type="range" min="1" max="30" value={size} onChange={e=>setSize(+e.target.value)} title="Espessura" style={{ width:70 }}/>
      <button className="mini-btn" onClick={doUndo} title="Desfazer"><Undo2 size={13}/></button>
      <button className="mini-btn" onClick={doRedo} title="Refazer"><Redo2 size={13}/></button>
      <button className="mini-btn" onClick={clear} title="Limpar"><Trash2 size={13}/></button>
      <button className="mini-btn" onClick={savePng} title="Salvar PNG"><Save size={13}/></button>
    </div>
    {msg && <small style={{ color:'var(--primary)' }}>{msg}</small>}
    <canvas ref={canvasRef} width={800} height={Math.max(240, height-90)} className="draw-canvas"
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}/>
  </div>
}

function DiaryWidget() {
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')
  const load = async () => setEntries(await all('SELECT * FROM diary ORDER BY id DESC LIMIT 20'))
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!text.trim()) return
    await run('INSERT INTO diary (text,created_at) VALUES (?,?)', [text, now()])
    setText(''); sfx.confirm(); load()
  }
  const del = async id => { await run('DELETE FROM diary WHERE id=?', [id]); sfx.close(); load() }
  return <div className="widget-body diary-widget">
    <textarea className="textarea" style={{ minHeight:60 }} value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva no seu diário..."/>
    <button className="btn sm primary" style={{ width:'100%', marginTop:6 }} onClick={add}>Registrar</button>
    <div className="diary-list">{entries.map(e => <div key={e.id} className="diary-entry">
      <small>{new Date(e.created_at).toLocaleString('pt-BR')}</small>
      <span>{e.text}</span>
      <button className="mini-btn" onClick={()=>del(e.id)}><Trash2 size={12}/></button>
    </div>)}</div>
  </div>
}

function TasksWidget() {
  const [tasks, setTasks] = useState([]), [title, setTitle] = useState('')
  const load = async () => setTasks(await all('SELECT * FROM tasks ORDER BY done,id DESC LIMIT 10'))
  useEffect(() => { load() }, [])
  const add = async () => { if(!title.trim())return; await run('INSERT INTO tasks (title,done,priority,created_at) VALUES (?,0,normal,?)',[title,now()]); setTitle(''); sfx.confirm(); load() }
  const toggle = async t => { await run('UPDATE tasks SET done=? WHERE id=?',[t.done?0:1,t.id]); sfx.click(); load() }
  return <div className="widget-body"><div style={{display:'flex',gap:6}}><input className="input" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Nova tarefa..."/><button className="btn sm primary" onClick={add}><Plus size={14}/></button></div>
    <div style={{marginTop:8,maxHeight:150,overflow:'auto'}}>{tasks.map(t=><div key={t.id} className="task-row" style={{padding:'6px 8px'}}>
      <button className={cx('check',t.done&&'on')} onClick={()=>toggle(t)}>{t.done?'✓':''}</button><span className={cx('t-title',t.done&&'done')}>{t.title}</span></div>)}</div>
  </div>
}

export default function Environment({ onToast, onNavigate }) {
  const [layout, setLayout] = useState([])
  const [note, setNote] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(null)
  const [nowTime, setNowTime] = useState(new Date())

  const load = async () => {
    setLayout(await all('SELECT * FROM widget_layout ORDER BY id'))
    const n = await setting('env_quick_note', '')
    setNote(typeof n === 'string' ? n : '')
  }
  useEffect(() => { load() }, [])
  useEffect(() => { const t=setInterval(()=>setNowTime(new Date()),1000); return()=>clearInterval(t) }, [])

  const persist = async item => {
    await run('INSERT INTO widget_layout (widget,x,y,w,h,color,settings) VALUES (?,?,?,?,?,?,?) ON CONFLICT(widget) DO UPDATE SET x=excluded.x,y=excluded.y,w=excluded.w,h=excluded.h,color=excluded.color',
      [item.widget, Math.round(item.x), Math.round(item.y), Math.round(item.w), Math.round(item.h), item.color||'#FFFFFF', '{}'])
  }
  const addWidget = async id => {
    const p = DEFAULT_POS[id] || [0,0,320,220]
    await run('INSERT OR IGNORE INTO widget_layout (widget,x,y,w,h,color,settings) VALUES (?,?,?,?,?,?,?)', [id,...p,'#FFFFFF','{}'])
    sfx.confirm(); setAddOpen(false); load()
  }
  const resetLayout = async () => {
    await run('DELETE FROM widget_layout')
    for (const [id,p] of Object.entries(DEFAULT_POS)) await run('INSERT INTO widget_layout (widget,x,y,w,h,color,settings) VALUES (?,?,?,?,?,?,?)',[id,...p,'#FFFFFF','{}'])
    sfx.confirm(); onToast?.('Layout original restaurado'); load()
  }
  const removeWidget = async w => { await run('DELETE FROM widget_layout WHERE widget=?',[w]); sfx.close(); load() }
  const setColor = async (w,c) => { await run('UPDATE widget_layout SET color=? WHERE widget=?',[c,w]); setColorOpen(null); sfx.confirm(); load() }
  const saveNote = async text => { setNote(text); await setSetting('env_quick_note', text) }

  /* Arraste e redimensionamento com Pointer Events (funciona com mouse e toque) */
  const beginMove = (e,item) => {
    if (e.button !== 0 || e.target.closest('button,input,textarea,select,canvas')) return
    e.preventDefault()
    const host = e.currentTarget.closest('.widget-board')
    const node = document.getElementById('widget-'+item.widget)
    const sx=e.clientX, sy=e.clientY, ox=item.x, oy=item.y
    const move = ev => {
      item.x = Math.max(0, Math.min(host.clientWidth-item.w, ox+ev.clientX-sx))
      item.y = Math.max(0, oy+ev.clientY-sy)
      if (node) { node.style.left=item.x+'px'; node.style.top=item.y+'px' }
    }
    const up = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); persist(item) }
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
  }
  const beginResize = (e,item) => {
    e.preventDefault(); e.stopPropagation()
    const node = document.getElementById('widget-'+item.widget)
    const sx=e.clientX, sy=e.clientY, ow=item.w, oh=item.h
    const move = ev => {
      item.w = Math.max(220, ow+ev.clientX-sx); item.h = Math.max(140, oh+ev.clientY-sy)
      if (node) { node.style.width=item.w+'px'; node.style.minHeight=item.h+'px' }
    }
    const up = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); persist(item) }
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
  }

  const render = w => {
    switch (w.widget) {
      case 'clock': return <div className="widget-body clock-body"><div style={{fontSize:Math.min(58,w.w/5)}}>{nowTime.toLocaleTimeString('pt-BR')}</div><small className="w-muted">Sua mesa digital</small></div>
      case 'date': return <div className="widget-body"><div style={{fontSize:20,fontWeight:700}}>{nowTime.toLocaleDateString('pt-BR',{weekday:'long'})}</div><div style={{fontSize:34,fontWeight:700}}>{String(nowTime.getDate()).padStart(2,'0')}</div><small className="w-muted">{nowTime.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</small></div>
      case 'calendar': return <div className="widget-body"><MiniCalendar/></div>
      case 'weather': return <div className="widget-body"><Weather/></div>
      case 'note': return <div className="widget-body"><textarea className="textarea" style={{minHeight:Math.max(100,w.h-80),border:0,background:'transparent'}} value={note} onChange={e=>saveNote(e.target.value)} placeholder="Notas rápidas..."/></div>
      case 'tasks': return <TasksWidget/>
      case 'shortcuts': return <div className="widget-body"><div className="w-shortcuts">{[['Música','music'],['Cinema','cinema'],['Livros','books'],['Notas','notes'],['Arquivos','files'],['Temas','themes']].map(([l,id])=><button key={id} className="btn sm ghost" onClick={()=>onNavigate(id)}>{l}</button>)}</div></div>
      case 'draw': return <DrawingWidget height={w.h}/>
      case 'diary': return <DiaryWidget/>
      case 'tools': return <div className="widget-body"><div className="w-shortcuts"><button className="btn sm ghost" onClick={()=>onNavigate('notes')}>Notas</button><button className="btn sm ghost" onClick={()=>onNavigate('stats')}>Estatísticas</button><button className="btn sm ghost" onClick={()=>onNavigate('settings')}>Configurações</button></div></div>
      default: return null
    }
  }

  return <div className="page">
    <div className="page-head" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
      <div><h1 className="page-title">Meu Ambiente</h1><p className="page-sub">Sua mesa de trabalho virtual — arraste pelos cabeçalhos, redimensione pelo canto</p></div>
      <div style={{display:'flex',gap:8}}><button className="btn ghost" onClick={resetLayout}><RotateCcw size={15}/> Restaurar layout</button><button className="btn primary" onClick={()=>setAddOpen(true)}><Plus size={15}/> Adicionar widget</button></div>
    </div>
    <div className="widget-board">
      {layout.map(w=>{
        const meta=WIDGETS.find(x=>x.id===w.widget)||{label:w.widget,icon:GripVertical}
        const Icon=meta.icon
        return <div key={w.widget} id={'widget-'+w.widget} className="widget"
          style={{left:w.x,top:w.y,width:w.w,minHeight:w.h,background:w.color||'#fff'}}>
          <div className="widget-head" onPointerDown={e=>beginMove(e,w)}>
            <span><Icon size={15}/> {meta.label}</span>
            <div style={{display:'flex'}}>
              <button className="mini-btn" title="Cor" onPointerDown={e=>e.stopPropagation()} onClick={()=>setColorOpen(w.widget)}><Palette size={13}/></button>
              <button className="mini-btn" title="Remover" onPointerDown={e=>e.stopPropagation()} onClick={()=>removeWidget(w.widget)}><Trash2 size={13}/></button>
            </div>
          </div>
          {render(w)}
          <button className="widget-resize" title="Redimensionar" onPointerDown={e=>beginResize(e,w)}><Maximize2 size={12}/></button>
          {colorOpen===w.widget && <div className="color-pop">{COLORS.map(c=><button key={c} style={{background:c}} onClick={()=>setColor(w.widget,c)}/>)}</div>}
        </div>
      })}
      {!layout.length && <div className="empty" style={{marginTop:40}}><span className="em">🧩</span><b>Mesa vazia</b><div style={{marginTop:8}}>Adicione widgets ou restaure o layout.</div></div>}
    </div>
    {addOpen && <Modal title="Adicionar widget" onClose={()=>setAddOpen(false)}><div className="widget-palette">{WIDGETS.map(w=>{const Icon=w.icon;return <button key={w.id} className="btn ghost" onClick={()=>addWidget(w.id)}><Icon size={16}/>{w.label}</button>})}</div></Modal>}
  </div>
}
