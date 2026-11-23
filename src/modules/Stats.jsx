import React, { useEffect, useState } from 'react'
import { BarChart3, Music2, Clock3, BookOpen, Images, FolderOpen, Timer, Flame, User, Headphones } from 'lucide-react'
import { all, value } from '../lib/db'
import { StatCard, LineChart, Empty } from '../components/common'
import { fmtDate } from '../lib/utils'

export default function Stats() {
  const [d, setD] = useState({})

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 13 * 86400000).toISOString()
      const [played, listen, appTime, songs, books, readPages, photos, files, artists, playlists, daily, weekly] = await Promise.all([
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='song_played'", [], 0),
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='listen_seconds'", [], 0),
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='app_seconds'", [], 0),
        value('SELECT COUNT(*) c FROM songs', [], 0),
        value('SELECT COUNT(*) c FROM books', [], 0),
        value('SELECT COALESCE(SUM(last_page),0) v FROM books', [], 0),
        value('SELECT COUNT(*) c FROM photos', [], 0),
        value('SELECT COUNT(*) c FROM files', [], 0),
        all("SELECT meta, SUM(value) v FROM stats WHERE type='song_played' AND meta!='' GROUP BY meta ORDER BY v DESC LIMIT 6"),
        all('SELECT p.name, COUNT(ps.id) c FROM playlists p LEFT JOIN playlist_songs ps ON ps.playlist_id=p.id GROUP BY p.id ORDER BY c DESC LIMIT 6'),
        all("SELECT substr(created_at,1,10) d, SUM(value) v FROM stats WHERE type='song_played' AND created_at>=? GROUP BY d ORDER BY d", [since]),
        all("SELECT substr(created_at,1,10) d, SUM(value) v FROM stats WHERE type='listen_seconds' AND created_at>=? GROUP BY d ORDER BY d", [since])
      ])
      const map = Object.fromEntries(daily.map(r => [r.d, r.v]))
      const map2 = Object.fromEntries(weekly.map(r => [r.d, r.v]))
      const chart = Array.from({ length: 14 }, (_, i) => {
        const ds = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10)
        return map[ds] || 0
      })
      const chart2 = Array.from({ length: 14 }, (_, i) => {
        const ds = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10)
        return Math.round((map2[ds] || 0) / 60)
      })
      setD({ played, listen, appTime, songs, books, readPages, photos, files, artists, playlists, chart, chart2 })
    })()
  }, [])

  return (
    <div className="page">
      <div className="page-head"><h1 className="page-title">Estatísticas</h1><p className="page-sub">Seu histórico real dentro do Douglas Felipe.DEV</p></div>
      <div className="grid grid-4">
        <StatCard color="green" icon={<Music2 size={17} />} label="Músicas reproduzidas" value={d.played || 0} foot="desde a instalação" />
        <StatCard color="yellow" icon={<Clock3 size={17} />} label="Tempo ouvindo" value={`${((d.listen || 0) / 3600).toFixed(1)}h`} foot="tempo real" />
        <StatCard color="coral" icon={<BookOpen size={17} />} label="Livros adicionados" value={d.books || 0} foot={`${d.readPages || 0} páginas registradas`} />
        <StatCard color="blue" icon={<Images size={17} />} label="Fotos importadas" value={d.photos || 0} foot={`${d.files || 0} arquivos no total`} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="chart-card">
          <div className="section-head" style={{ margin: '0 0 6px' }}><h3>Músicas por dia</h3><small style={{ color: 'var(--muted)' }}>últimos 14 dias</small></div>
          <LineChart data={d.chart || []} color="#e78c62" />
        </div>
        <div className="chart-card">
          <div className="section-head" style={{ margin: '0 0 6px' }}><h3>Minutos ouvidos por dia</h3><small style={{ color: 'var(--muted)' }}>últimos 14 dias</small></div>
          <LineChart data={d.chart2 || []} color="#6fa27c" />
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Artistas mais ouvidos</h3><Headphones size={17} style={{ color: 'var(--primary)' }} /></div>
          {(d.artists || []).length ? d.artists.map((a, i) => <div className="bar-row" key={a.meta}>
            <span className="bar-label">{i + 1}. {a.meta || 'Desconhecido'}</span>
            <div className="bar-track"><i style={{ width: `${(a.v / Math.max(...d.artists.map(x => x.v), 1)) * 100}%` }} /></div>
            <span className="bar-val">{a.v}</span>
          </div>) : <Empty icon="🎧" title="Toque músicas para ver artistas" />}
        </div>
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Playlists com mais músicas</h3><Music2 size={17} style={{ color: 'var(--primary)' }} /></div>
          {(d.playlists || []).length ? d.playlists.map((p, i) => <div className="bar-row" key={p.name}>
            <span className="bar-label">{i + 1}. {p.name}</span>
            <div className="bar-track"><i style={{ width: `${(p.c / Math.max(...d.playlists.map(x => x.c), 1)) * 100}%` }} /></div>
            <span className="bar-val">{p.c}</span>
          </div>) : <Empty icon="🎵" title="Nenhuma playlist" />}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <StatCard color="green" icon={<FolderOpen size={17} />} label="Arquivos armazenados" value={d.files || 0} foot="na biblioteca local" />
        <StatCard color="yellow" icon={<Timer size={17} />} label="Tempo no aplicativo" value={`${((d.appTime || 0) / 3600).toFixed(1)}h`} foot="sessões registradas" />
        <StatCard color="blue" icon={<Flame size={17} />} label="Músicas na biblioteca" value={d.songs || 0} foot="do YouTube" />
        <StatCard color="coral" icon={<BarChart3 size={17} />} label="Eventos registrados" value={d.played || 0} foot="atividades de música" />
      </div>
    </div>
  )
}
