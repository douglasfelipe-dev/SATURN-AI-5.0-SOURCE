import React, { useEffect, useState } from 'react'
import {
  Play, Shuffle, Music2, Heart, Clock3, Flame, BookOpen, ArrowUpRight, Home as HomeIcon,
  Film, FolderOpen, Sparkles, GripVertical, Plus, Trash2, Palette, ArrowUp, ArrowDown,
  Pencil, Check, RotateCcw, StickyNote, Maximize2, Minimize2
} from 'lucide-react'
import { all, value, mediaUrl, run } from '../lib/db'
import { usePlayer } from '../lib/PlayerContext'
import { sfx } from '../lib/sound'
import { greeting, todayLong, thumb, cx } from '../lib/utils'
import Vinyl3D from '../components/Vinyl3D'
import { Ring, StatCard, LineChart, Empty, Modal } from '../components/common'

const DEFAULT_WIDGETS = [
  { widget: 'hero', color: '', span: 1 },
  { widget: 'stats', color: '', span: 1 },
  { widget: 'listening', color: '', span: 1 },
  { widget: 'recent', color: '', span: 1 },
  { widget: 'shortcuts', color: '', span: 1 }
]
const AVAILABLE = [
  { id: 'hero', label: 'Toca-discos / Música atual', icon: Music2 },
  { id: 'stats', label: 'Estatísticas', icon: BarChartIcon },
  { id: 'listening', label: 'Gráfico de escuta', icon: Flame },
  { id: 'recent', label: 'Recentes (livros, fotos, atividade)', icon: BookOpen },
  { id: 'shortcuts', label: 'Atalhos', icon: ArrowUpRight },
  { id: 'clock', label: 'Relógio digital', icon: Clock3 },
  { id: 'note', label: 'Nota rápida', icon: StickyNote }
]
function BarChartIcon(props) { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg> }

const SHORTCUTS = [
  { id: 'music', label: 'Música', icon: Music2, color: 'var(--coral)' },
  { id: 'cinema', label: 'Cinema', icon: Film, color: 'var(--blue)' },
  { id: 'environment', label: 'Meu Ambiente', icon: HomeIcon, color: 'var(--green)' },
  { id: 'themes', label: 'Temas', icon: Sparkles, color: 'var(--yellow)' },
  { id: 'books', label: 'Livros', icon: BookOpen, color: 'var(--primary-soft)' },
  { id: 'files', label: 'Arquivos', icon: FolderOpen, color: 'var(--card)' }
]
const COLORS = ['', '#F7E3B3', '#D9E5D2', '#F7C8B6', '#D6E0EE', '#EFE0F0']

export default function Home({ onNavigate, profileName = 'Douglas' }) {
  const p = usePlayer()
  const [d, setD] = useState({})
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS)
  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [colorFor, setColorFor] = useState(null)
  const [note, setNote] = useState('')
  const [now, setNow] = useState(new Date())

  const loadData = async () => {
    try {
      const since = new Date(Date.now() - 6 * 86400000).toISOString()
      const [songs, played, listen, days, books, photos, history, genres, likes, streak] = await Promise.all([
        value('SELECT COUNT(*) c FROM songs', [], 0),
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='song_played'", [], 0),
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='listen_seconds'", [], 0),
        all("SELECT substr(created_at,1,10) d, SUM(value) v FROM stats WHERE type='song_played' AND created_at>=? GROUP BY d ORDER BY d", [since]),
        all('SELECT * FROM books ORDER BY added_at DESC LIMIT 3'),
        all('SELECT * FROM photos ORDER BY added_at DESC LIMIT 4'),
        all('SELECT * FROM history ORDER BY created_at DESC LIMIT 5'),
        all('SELECT p.name, COUNT(ps.id) c FROM playlists p LEFT JOIN playlist_songs ps ON ps.playlist_id=p.id GROUP BY p.id ORDER BY c DESC LIMIT 5'),
        value("SELECT COUNT(*) c FROM playlist_songs WHERE playlist_id IN (SELECT id FROM playlists WHERE lower(name) LIKE '%favorit%')", [], 0),
        value("SELECT COUNT(DISTINCT substr(created_at,1,10)) c FROM stats WHERE type='song_played'", [], 0)
      ])
      const map = Object.fromEntries(days.map(r => [r.d, r.v]))
      const chart = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10)
        return map[dt] || 0
      })
      setD({ songs, played, listen, books, photos, history, genres, likes, streak, chart })
    } catch (e) { console.error(e) }
  }

  const loadLayout = async () => {
    const rows = await all('SELECT widget,pos,color,span FROM home_layout ORDER BY pos')
    if (rows.length) setWidgets(rows.map(r => ({ widget: r.widget, color: r.color || '', span: r.span || 1 })))
    const n = await value("SELECT value FROM settings WHERE key='home_note'", [], '')
    setNote(typeof n === 'string' ? n : '')
  }
  useEffect(() => { loadData(); loadLayout() }, [])
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  const persist = async (arr) => {
    setWidgets(arr)
    await run('DELETE FROM home_layout')
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i]
      await run('INSERT INTO home_layout (widget,pos,color,span) VALUES (?,?,?,?)', [w.widget, i, w.color || '', w.span || 1])
    }
  }
  const addWidget = async id => {
    if (widgets.some(w => w.widget === id)) { setAddOpen(false); return }
    await persist([...widgets, { widget: id, color: '', span: 1 }])
    sfx.confirm(); setAddOpen(false)
  }
  const removeWidget = async id => { await persist(widgets.filter(w => w.widget !== id)); sfx.close() }
  const move = async (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= widgets.length) return
    const arr = [...widgets]; [arr[i], arr[j]] = [arr[j], arr[i]]
    await persist(arr); sfx.click()
  }
  const setColor = async (i, color) => { const arr = [...widgets]; arr[i].color = color; await persist(arr); setColorFor(null); sfx.confirm() }
  const toggleSpan = async i => { const arr = [...widgets]; arr[i].span = arr[i].span === 2 ? 1 : 2; await persist(arr); sfx.click() }
  const restore = async () => {
    await persist(DEFAULT_WIDGETS.map((w, i) => ({ ...w })))
    sfx.confirm()
  }
  const saveNote = async text => {
    setNote(text)
    await run("INSERT INTO settings (key,value) VALUES ('home_note',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [text])
  }

  const content = (id) => {
    switch (id) {
      case 'hero': return (
        <div className="hero-card">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="badge"><span className="spin" style={{ width: 7, height: 7, borderRadius: '50%', background: '#e78c62' }} /> {p.current ? 'Tocando agora' : 'Seu vinil'}</span>
            <h1 className="hero-title">{p.current?.title || 'Seu vinil espera por você'}</h1>
            <p className="hero-artist">{p.current?.artist || 'Adicione músicas do YouTube e comece a ouvir'}</p>
            <div className="hero-actions">
              <button className="pill primary" onClick={() => { sfx.play(); p.current ? p.toggle() : onNavigate('music') }}>
                <Play size={15} fill="currentColor" /> {p.current ? (p.playing ? 'Pausar' : 'Reproduzir') : 'Play something'}
              </button>
              <button className="pill light" onClick={() => onNavigate('music')}><Shuffle size={15} /> Explorar biblioteca</button>
            </div>
            <div className="hero-meta">
              <Ring value={Math.min(100, Math.round((d.songs || 0) * 8))} />
              <div><b>Sua coleção</b><small>{d.songs || 0} músicas na biblioteca<br />{d.likes || 0} favoritas</small></div>
            </div>
          </div>
          <div className="vinyl-wrap" style={{ minWidth: 0 }}>
            <Vinyl3D artUrl={p.current ? thumb(p.current.youtube_id) : null} title={p.current?.title} playing={p.playing} />
          </div>
        </div>
      )
      case 'stats': return (
        <div className="grid grid-4">
          <StatCard color="green" icon={<Music2 size={17} />} label="Músicas reproduzidas" value={d.played || 0} foot="na biblioteca" />
          <StatCard color="coral" icon={<Heart size={17} />} label="Músicas curtidas" value={d.likes || 0} foot="em favoritas" />
          <StatCard color="yellow" icon={<Clock3 size={17} />} label="Horas ouvidas" value={((d.listen || 0) / 3600).toFixed(1)} foot="tempo real" />
          <StatCard color="blue" icon={<Flame size={17} />} label="Sequência atual" value={d.streak || 0} foot="dias com música" />
        </div>
      )
      case 'listening': return (
        <div className="grid grid-2">
          <div className="card">
            <div className="section-head" style={{ margin: '0 0 6px' }}><div><h3>Sua escuta</h3><p className="page-sub">Últimos 7 dias</p></div><span className="chip">7 dias</span></div>
            <LineChart data={d.chart || []} />
          </div>
          <div className="card">
            <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Seus gêneros</h3><span className="link" onClick={() => onNavigate('music')}>Ver tudo →</span></div>
            {(d.genres || []).length === 0 ? <Empty icon="♪" title="Nenhuma playlist ainda" /> : d.genres.map(g => (
              <div className="bar-row" key={g.name}><span className="bar-label">{g.name}</span><div className="bar-track"><i style={{ width: `${(g.c / Math.max(...d.genres.map(x => x.c), 1)) * 100}%` }} /></div><span className="bar-val">{g.c}</span></div>
            ))}
          </div>
        </div>
      )
      case 'recent': return (
        <div className="grid grid-3">
          <div className="card">
            <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Livros recentes</h3><span className="link" onClick={() => onNavigate('books')}>Ver →</span></div>
            {(d.books || []).length ? d.books.map(b => <div key={b.id} className="song-row" onClick={() => onNavigate('books')}>
              <div style={{ width: 34, height: 44, borderRadius: 6, background: b.cover ? `url(${mediaUrl(b.cover)}) center/cover` : 'var(--primary-soft)', flex: '0 0 34px' }} />
              <div className="meta"><b>{b.title}</b><span>{b.author || 'Sem autor'}</span></div></div>) : <Empty icon="📖" title="Nenhum livro importado" />}
          </div>
          <div className="card">
            <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Fotos recentes</h3><span className="link" onClick={() => onNavigate('gallery')}>Ver →</span></div>
            {(d.photos || []).length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {d.photos.map(f => <img key={f.id} src={mediaUrl(f.path)} alt="" style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 10 }} />)}
            </div> : <Empty icon="📷" title="Nenhuma foto importada" />}
          </div>
          <div className="card">
            <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Atividade recente</h3><span className="link" onClick={() => onNavigate('stats')}>Ver →</span></div>
            {(d.history || []).length ? d.history.slice(0, 5).map(h => <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 11.5 }}>
              <Sparkles size={13} style={{ color: 'var(--primary)' }} /><span style={{ flex: 1 }}>{h.module} · {h.action}</span>
              <small style={{ color: 'var(--muted)' }}>{new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>) : <Empty icon="✦" title="Suas atividades aparecem aqui" />}
          </div>
        </div>
      )
      case 'shortcuts': return (
        <div>
          <div className="section-head"><h3>Atalhos</h3></div>
          <div className="grid grid-3">{SHORTCUTS.map(sc => {
            const I = sc.icon
            return <button key={sc.id} className="card hoverable" onClick={() => { sfx.nav(); onNavigate(sc.id) }} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, background: sc.color, display: 'grid', placeItems: 'center' }}><I size={19} /></span>
              <b style={{ fontSize: 13, flex: 1 }}>{sc.label}</b><ArrowUpRight size={16} style={{ color: 'var(--muted)' }} />
            </button>
          })}</div>
        </div>
      )
      case 'clock': return (
        <div className="card home-clock">
          <div style={{ fontSize: 44, fontWeight: 700 }}>{now.toLocaleTimeString('pt-BR')}</div>
          <small style={{ color: 'var(--muted)' }}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
        </div>
      )
      case 'note': return (
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 8px' }}><h3>Nota rápida</h3></div>
          <textarea className="textarea" value={note} onChange={e => saveNote(e.target.value)} placeholder="Escreva algo..." style={{ minHeight: 90 }} />
        </div>
      )
      default: return null
    }
  }

  return (
    <div className="page">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="dash-avatar" title={profileName}><span>{(profileName || 'U').slice(0, 1).toUpperCase()}</span></div>
          <div>
            <h1 className="page-title">{greeting()}, {profileName}</h1>
            <p className="page-sub">{todayLong()} · {d.songs || 0} músicas na sua biblioteca · {d.streak || 0} dias de sequência</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing && <>
            <button className="btn sm ghost" onClick={() => setAddOpen(true)}><Plus size={14} /> Adicionar</button>
            <button className="btn sm ghost" onClick={restore}><RotateCcw size={14} /> Restaurar</button>
            <button className="btn sm primary" onClick={() => { setEditing(false); sfx.confirm() }}><Check size={14} /> Concluir</button>
          </>}
          {!editing && <button className="btn sm ghost" onClick={() => { setEditing(true); sfx.click() }}><Pencil size={14} /> Editar página</button>}
        </div>
      </div>

      <div className={cx('home-widgets', editing && 'editing')}>
        {widgets.map((w, i) => {
          const meta = AVAILABLE.find(a => a.id === w.widget) || { label: w.widget, icon: GripVertical }
          const Icon = meta.icon
          return <div key={w.widget} className={cx('home-widget', w.span === 2 && 'wide')}
            style={{ background: w.color || 'transparent' }}>
            {editing && <div className="home-widget-bar">
              <GripVertical size={14} />
              <b>{meta.label}</b>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                <button className="mini-btn" title="Subir" onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
                <button className="mini-btn" title="Descer" onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
                <button className="mini-btn" title={w.span === 2 ? 'Largura normal' : 'Largura dupla'} onClick={() => toggleSpan(i)}>{w.span === 2 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
                <button className="mini-btn" title="Cor" onClick={() => setColorFor(colorFor === i ? null : i)}><Palette size={13} /></button>
                <button className="mini-btn" title="Remover" onClick={() => removeWidget(w.widget)}><Trash2 size={13} /></button>
              </div>
              {colorFor === i && <div className="color-pop">{COLORS.map(c => <button key={c || 'none'} style={{ background: c || 'var(--card)' }} onClick={() => setColor(i, c)} />)}</div>}
            </div>}
            {content(w.widget)}
          </div>
        })}
      </div>

      {addOpen && <Modal title="Adicionar widget à página inicial" onClose={() => setAddOpen(false)}>
        <div className="widget-palette">{AVAILABLE.map(a => {
          const Icon = a.icon
          return <button key={a.id} className="btn ghost" onClick={() => addWidget(a.id)}><Icon size={16} /> {a.label}</button>
        })}</div>
      </Modal>}
    </div>
  )
}
