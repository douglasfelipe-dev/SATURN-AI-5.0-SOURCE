import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Search, X, Music2, BookOpen, FolderOpen, FileText, StickyNote, Film, Video, Clock3, Bell } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MiniPlayer from './components/MiniPlayer'
import { Toasts } from './components/common'
import { PlayerProvider } from './lib/PlayerContext'
import { seedDefaults, setting, setSetting, addStat, THEMES, all, api } from './lib/db'
import { setSoundVolume, setSoundEnabled, sfx } from './lib/sound'
import Home from './modules/Home'
import Environment from './modules/Environment'
import Music from './modules/Music'
import Cinema from './modules/Cinema'
import Videos from './modules/Videos'
import LocalMusic from './modules/LocalMusic'
import Library from './modules/Library'
import Gallery from './modules/Gallery'
import Files from './modules/Files'
import Notes from './modules/Notes'
import Stats from './modules/Stats'
import Profile from './modules/Profile'
import Themes from './modules/Themes'
import Settings from './modules/Settings'

const TITLES = {
  home: 'Início', environment: 'Meu Ambiente', music: 'Música', cinema: 'Cinema', videos: 'Vídeos', localmusic: 'Músicas locais',
  books: 'Livros', gallery: 'Galeria de fotos', files: 'Arquivos', notes: 'Notas', stats: 'Estatísticas',
  profile: 'Perfil', themes: 'Temas', settings: 'Configurações'
}
const DEFAULT_SETTINGS = {
  theme: 'sage', dark: false, profileName: 'Douglas', avatar: '',
  soundEnabled: true, soundVolume: .35, animation: 100,
  quality: 'alta', maxFps: 60, autoLaunch: false, sidebarCollapsed: false,
  customColors: null
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('Erro no módulo:', error); this.props.onError?.(error.message) }
  render() { return this.state.error ? <div className="empty"><span className="em">⚠️</span><b>Este módulo encontrou um erro</b><div style={{ marginTop: 8, fontSize: 12 }}>{String(this.state.error?.message || this.state.error)}</div><button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => this.setState({ error: null })}>Tentar novamente</button></div> : this.props.children }
}

function Shell() {
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState('home')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [toasts, setToasts] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState([])
  const [notifications, setNotifications] = useState([])

  const toast = useCallback((text, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  useEffect(() => {
    const h = e => toast(e.detail?.text || '', e.detail?.type)
    const err = e => { if (e.reason) toast('Erro: ' + (e.reason.message || e.reason), 'error') }
    window.addEventListener('nova-toast', h)
    window.addEventListener('unhandledrejection', err)
    return () => { window.removeEventListener('nova-toast', h); window.removeEventListener('unhandledrejection', err) }
  }, [toast])

  const loadNotifications = useCallback(async () => {
    try { setNotifications(await api.notify.list()) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await seedDefaults()
        const s = { ...DEFAULT_SETTINGS }
        for (const k of Object.keys(DEFAULT_SETTINGS)) s[k] = await setting(k, DEFAULT_SETTINGS[k])
        setSettings(s)
        await loadNotifications()
      } catch (e) { console.error(e) }
      setTimeout(() => setReady(true), 1800)
    })()
  }, [loadNotifications])

  useEffect(() => {
    const off = api.onNotification?.(() => loadNotifications())
    return () => off?.()
  }, [loadNotifications])

  useEffect(() => {
    const t = THEMES[settings.theme] || THEMES.sage
    const base = settings.customColors && (settings.theme === 'custom' || !THEMES[settings.theme])
      ? settings.customColors : t
    const darken = (hex, f) => {
      const h = String(hex || '#888888').replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16)
      if (isNaN(n)) return '#2c302d'
      const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f)
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }
    const c = settings.dark && !base.dark ? {
      ...base,
      bg: darken(base.bg, .16),
      bg2: darken(base.bg, .20),
      card: darken(base.card, .17),
      sidebar: darken(base.sidebar || base.primary, .36),
      text: '#F2F4F1',
      muted: '#A9B2A9',
      line: 'rgba(255,255,255,.10)'
    } : { ...base, bg2: base.bg, muted: '#857d71', line: 'rgba(80,65,45,.10)' }
    const root = document.documentElement
    root.style.setProperty('--primary', c.primary)
    root.style.setProperty('--secondary', c.secondary)
    root.style.setProperty('--bg', c.bg)
    root.style.setProperty('--bg-2', c.bg2 || c.bg)
    root.style.setProperty('--card', c.card)
    root.style.setProperty('--accent', c.accent)
    root.style.setProperty('--sidebar', c.sidebar || t.sidebar || '#AABDA0')
    root.style.setProperty('--text', c.text || '#3d3730')
    root.style.setProperty('--muted', c.muted || (settings.dark ? '#A9B2A9' : '#857d71'))
    root.style.setProperty('--line', c.line || (settings.dark ? 'rgba(255,255,255,.10)' : 'rgba(80,65,45,.10)'))
    root.style.setProperty('--speed', String(Math.max(.05, (settings.animation ?? 100) / 100)))
    document.body.dataset.dark = settings.dark ? 'true' : 'false'
    setSoundVolume(settings.soundVolume ?? .35)
    setSoundEnabled(settings.soundEnabled !== false)
  }, [settings])

  useEffect(() => {
    const t = setInterval(() => addStat('app_seconds', 5), 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch() }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const update = useCallback((key, value) => { setSettings(s => ({ ...s, [key]: value })); setSetting(key, value) }, [])

  const navigate = useCallback(id => { setActive(id); setSearchOpen(false) }, [])

  const openSearch = async () => {
    setSearchOpen(true); setQuery('')
    try {
      const [songs, books, files, notes, vids, localVideos, localTracks] = await Promise.all([
        all('SELECT id,title AS name,artist AS sub,youtube_id AS ref FROM songs'),
        all('SELECT id,title AS name,author AS sub,file_path AS ref FROM books'),
        all('SELECT id,name,type AS sub,path AS ref FROM files'),
        all('SELECT id,title AS name,content AS sub FROM notes'),
        all('SELECT id,title AS name,channel AS sub,youtube_id AS ref FROM videos'),
        all('SELECT id,name,path AS sub,path AS ref FROM local_videos'),
        all('SELECT id,title AS name,artist AS sub,path AS ref FROM local_tracks')
      ])
      const modules = Object.entries(TITLES).map(([id, label]) => ({ id, name: label, sub: 'Seção', kind: 'module' }))
      setSearchData([
        ...modules.map(x => ({ ...x, kind: 'module' })),
        ...songs.map(x => ({ ...x, kind: 'song', module: 'music' })),
        ...books.map(x => ({ ...x, kind: 'book', module: 'books' })),
        ...files.map(x => ({ ...x, kind: 'file', module: 'files' })),
        ...notes.map(x => ({ ...x, kind: 'note', module: 'notes' })),
        ...vids.map(x => ({ ...x, kind: 'video', module: 'cinema' })),
        ...localVideos.map(x => ({ ...x, kind: 'localvideo', module: 'videos' })),
        ...localTracks.map(x => ({ ...x, kind: 'localtrack', module: 'localmusic' }))
      ])
    } catch (e) { toast('Erro ao carregar busca: ' + e.message, 'error') }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return searchData.slice(0, 10)
    return searchData.filter(x => (x.name + ' ' + (x.sub || '')).toLowerCase().includes(q)).slice(0, 20)
  }, [query, searchData])

  const props = { onNavigate: navigate, settings, update, onToast: toast }
  const modules = {
    home: <Home onNavigate={navigate} profileName={settings.profileName} avatar={settings.avatar} />,
    environment: <Environment {...props} />,
    music: <Music />,
    cinema: <Cinema />,
    videos: <Videos onToast={toast} />,
    localmusic: <LocalMusic onToast={toast} />,
    books: <Library onToast={toast} />,
    gallery: <Gallery onToast={toast} />,
    files: <Files onToast={toast} />,
    notes: <Notes {...props} onToast={toast} />,
    stats: <Stats />,
    profile: <Profile {...props} onToast={toast} />,
    themes: <Themes {...props} onToast={toast} />,
    settings: <Settings {...props} onToast={toast} onRestart={() => api.app.restart()} />
  }

  if (!ready) return <Splash />

  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <div className="app-shell">
        <Sidebar active={active} onNavigate={navigate} collapsed={!!settings.sidebarCollapsed} setCollapsed={v => update('sidebarCollapsed', v)} />
        <main className="main">
          <Topbar breadcrumb={TITLES[active] || active} dark={settings.dark}
            onToggleDark={() => update('dark', !settings.dark)} onOpenSearch={openSearch}
            avatar={settings.avatar ? `file:///${settings.avatar.replace(/\\/g, '/')}` : null}
            profileName={settings.profileName} onNavigate={navigate}
            notifications={notifications} unread={unread}
            onReadAll={async () => { await api.notify.read(); loadNotifications() }}
            onClear={async () => { await api.notify.clear(); loadNotifications() }}
            onNotificationClick={n => { if (n.kind === 'reminder') navigate('notes'); api.notify.read(n.id) }} />
          <div className="content">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: .28 * Math.max(.2, (settings.animation ?? 100) / 100) }}>
                <ErrorBoundary onError={m => toast('Erro no módulo: ' + m, 'error')}>{modules[active]}</ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
          <MiniPlayer onGoMusic={() => navigate('music')} />
        </main>
      </div>

      {searchOpen && <div className="overlay search-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSearchOpen(false) }}>
        <div className="search-modal">
          <div className="search-input-row"><Search size={20} />
            <input autoFocus placeholder="Buscar músicas, livros, arquivos, notas, vídeos, seções..." value={query} onChange={e => setQuery(e.target.value)} />
            <button className="mini-btn" onClick={() => setSearchOpen(false)}><X size={18} /></button>
          </div>
          <div className="search-results">
            {results.length === 0 && <div className="empty">Nenhum resultado para “{query}”</div>}
            {results.map((r, i) => {
              const Icon = r.kind === 'song' ? Music2 : r.kind === 'book' ? BookOpen : r.kind === 'file' ? FolderOpen : r.kind === 'note' ? StickyNote : r.kind === 'module' ? Sparkles : r.kind === 'localvideo' ? Video : Film
              return <button key={i} className="search-result" onClick={() => { sfx.nav(); navigate(r.module || r.id) }}>
                <span className="search-result-ico"><Icon size={17} /></span>
                <span><b>{r.name}</b><small>{r.sub || r.kind}</small></span>
                <span className="chip">{r.module || 'seção'}</span>
              </button>
            })}
          </div>
        </div>
      </div>}
      <Toasts items={toasts} />
    </>
  )
}

function Splash() {
  return <div className="splash"><div className="splash-inner">
    <div className="splash-logo"><Sparkles size={62} /></div>
    <h1>Douglas Felipe<span>.DEV</span></h1>
    <p>Seu universo digital está abrindo</p>
    <div className="bar"><i /></div>
  </div></div>
}

export default function App() {
  return <PlayerProvider><Shell /></PlayerProvider>
}
