import React, { useEffect, useState, useRef } from 'react'
import {
  Plus, Trash2, Pencil, Play, Pause, SkipBack, SkipForward, Repeat2, Shuffle,
  Volume2, Search, Music2, GripVertical, ArrowUp, ArrowDown, Link2, CheckCircle2,
  XCircle, ListMusic, ChevronRight, Square, Eraser
} from 'lucide-react'
import { api, all, run, get, value, logEvent, now } from '../lib/db'
import { usePlayer } from '../lib/PlayerContext'
import { sfx } from '../lib/sound'
import { fmtTime, thumb, cx, parseYoutubeId } from '../lib/utils'
import Vinyl3D from '../components/Vinyl3D'
import { Modal, Confirm, Empty, Progress, Switch } from '../components/common'

export default function Music() {
  const p = usePlayer()
  const [playlists, setPlaylists] = useState([])
  const [selected, setSelected] = useState(null)
  const [songs, setSongs] = useState([])
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [checking, setChecking] = useState({})
  const dragIdx = useRef(null)

  const loadPlaylists = async () => {
    const rows = await all('SELECT * FROM playlists ORDER BY id')
    setPlaylists(rows)
    setSelected(prev => prev && rows.some(r => r.id === prev) ? prev : rows[0]?.id || null)
  }
  const loadSongs = async () => {
    if (!selected) { setSongs([]); return }
    const rows = await all(`SELECT s.*, ps.id AS psid, ps.position FROM playlist_songs ps
      JOIN songs s ON s.id=ps.song_id WHERE ps.playlist_id=? ORDER BY ps.position, ps.id`, [selected])
    setSongs(rows)
  }
  useEffect(() => { loadPlaylists() }, [])
  useEffect(() => { loadSongs() }, [selected])

  const addSong = async () => {
    const link = url.trim()
    if (!link) return
    const localId = parseYoutubeId(link)
    if (!localId) {
      sfx.error()
      window.dispatchEvent(new CustomEvent('nova-toast', { detail: { text: 'Link do YouTube inválido.', type: 'error' } }))
      return
    }
    setBusy(true)
    try {
      // Dados básicos vêm do ID — não dependem de rede nem de IPC
      let info = { ok: true, id: localId, title: `Vídeo ${localId}`, channel: 'YouTube', thumb: thumb(localId) }
      const meta = await Promise.race([
        Promise.resolve().then(() => api.yt?.info?.(link)).catch(() => null),
        new Promise(res => setTimeout(() => res(null), 3000))
      ])
      if (meta?.ok) info = meta
      await run('INSERT OR IGNORE INTO songs (title,artist,youtube_id,thumb,added_at) VALUES (?,?,?,?,?)',
        [info.title, info.channel, info.id, info.thumb, now()])
      const song = await get('SELECT * FROM songs WHERE youtube_id=?', [info.id])
      const pos = await value('SELECT COALESCE(MAX(position),0)+1 p FROM playlist_songs WHERE playlist_id=?', [selected], 1)
      await run('INSERT OR IGNORE INTO playlist_songs (playlist_id,song_id,position) VALUES (?,?,?)', [selected, song.id, pos])
      await logEvent('music', 'song_added', info.title)
      setUrl(''); sfx.confirm()
      await loadSongs()
    } catch (e) { sfx.error(); window.dispatchEvent(new CustomEvent('nova-toast', { detail: { text: e.message, type: 'error' } })) }
    setBusy(false)
  }

  const createPlaylist = async () => {
    const name = (draft.name || '').trim()
    if (!name) return
    await run('INSERT INTO playlists (name,color,created_at) VALUES (?,?,?)', [name, draft.color || '#D9E5D2', now()])
    sfx.confirm(); setModal(null); setDraft({}); await loadPlaylists()
  }
  const renamePlaylist = async () => {
    if (!(draft.name || '').trim()) return
    await run('UPDATE playlists SET name=?, color=? WHERE id=?', [draft.name.trim(), draft.color || '#D9E5D2', selected])
    sfx.confirm(); setModal(null); await loadPlaylists()
  }
  const removeFromPlaylist = async (row) => {
    await run('DELETE FROM playlist_songs WHERE id=?', [row.psid])
    sfx.click(); await loadSongs()
  }
  const moveSong = async (idx, dir) => {
    const target = idx + dir
    if (target < 0 || target >= songs.length) return
    const a = songs[idx], b = songs[target]
    await run('UPDATE playlist_songs SET position=? WHERE id=?', [b.position, a.psid])
    await run('UPDATE playlist_songs SET position=? WHERE id=?', [a.position, b.psid])
    sfx.click(); await loadSongs()
  }
  const onDrop = async (idx) => {
    const from = dragIdx.current
    if (from == null || from === idx) return
    const arr = [...songs]
    const [item] = arr.splice(from, 1)
    arr.splice(idx, 0, item)
    for (let i = 0; i < arr.length; i++) await run('UPDATE playlist_songs SET position=? WHERE id=?', [i + 1, arr[i].psid])
    dragIdx.current = null; sfx.confirm(); await loadSongs()
  }
  const verifyLink = async (s) => {
    setChecking(x => ({ ...x, [s.id]: 'loading' }))
    try {
      const info = await Promise.race([
        Promise.resolve().then(() => api.yt?.info?.(s.youtube_id)).catch(() => null),
        new Promise(res => setTimeout(() => res(null), 3000))
      ])
      setChecking(x => ({ ...x, [s.id]: info?.ok ? 'ok' : 'bad' }))
      if (info?.ok) await run('UPDATE songs SET title=?, artist=?, thumb=? WHERE id=?', [info.title, info.channel, info.thumb, s.id])
    } catch (_) { setChecking(x => ({ ...x, [s.id]: 'bad' })) }
  }

  const filtered = query ? songs.filter(s => (s.title + s.artist).toLowerCase().includes(query.toLowerCase())) : songs
  const currentPlaylist = playlists.find(x => x.id === selected)
  const curIndex = songs.findIndex(s => s.youtube_id === p.current?.youtube_id)

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Música</h1>
        <p className="page-sub">Seu toca-discos virtual com reprodução real do YouTube · {playlists.length} playlists</p>
      </div>

      <div className="music-layout">
        {/* Playlists */}
        <div className="panel">
          <h4>Playlists <button className="mini-btn" onClick={() => { sfx.click(); setDraft({ name: '', color: '#D9E5D2' }); setModal('create') }}><Plus size={16} /></button></h4>
          {playlists.map(pl => (
            <div key={pl.id} className={cx('playlist-item', selected === pl.id && 'active')} onClick={() => { sfx.click(); setSelected(pl.id) }}>
              <span className="swatch" style={{ background: pl.color }} />
              <span className="grow">{pl.name}</span>
              <ChevronRight size={14} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
            <button className="btn sm ghost" style={{ width: '100%' }} onClick={() => { sfx.click(); setDraft({ name: currentPlaylist?.name, color: currentPlaylist?.color }); setModal('rename') }}>
              <Pencil size={14} /> Renomear playlist
            </button>
          </div>
        </div>

        {/* Toca-discos */}
        <div>
          <div className="turntable-stage">
            <Vinyl3D artUrl={p.current ? thumb(p.current.youtube_id) : null} title={p.current?.title} playing={p.playing} />
            <div className="now-playing">
              <h2>{p.current?.title || 'Nenhum disco na agulha'}</h2>
              <p>{p.current?.artist || 'Adicione um link do YouTube para começar'}</p>
            </div>
          </div>
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="add-bar">
              <input className="input" placeholder="Cole o link do YouTube (música, playlist não)" value={url}
                onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSong()} />
              <button className="btn primary" onClick={addSong} disabled={busy || !selected}>
                {busy ? <span className="spin"><Link2 size={16} /></span> : <Plus size={16} />} Adicionar
              </button>
            </div>
            <Progress value={p.duration ? (p.time / p.duration) * 100 : 0} onClick={p.seek} />
            <div className="time-row"><span>{fmtTime(p.time)}</span><span>{fmtTime(p.duration)}</span></div>
            <div className="controls" style={{ marginTop: 8 }}>
              <button className="ctrl" onClick={() => p.prev()} title="Anterior"><SkipBack size={18} fill="currentColor" /></button>
              <button className="ctrl play" onClick={() => { sfx.play(); if (p.current) p.toggle(); else if (songs[0]) p.playSong(songs[0], songs) }} title="Play/Pause">
                {p.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
              </button>
              <button className="ctrl" onClick={() => p.next()} title="Próxima"><SkipForward size={18} fill="currentColor" /></button>
              <button className="ctrl" onClick={() => p.stop()} title="Parar"><Square size={16} fill="currentColor" /></button>
              <button className={cx('ctrl', p.repeat !== 'off' && 'active')} onClick={() => p.setRepeat(p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off')} title="Repetir">
                <Repeat2 size={17} />{p.repeat === 'one' && <sup style={{ fontSize: 8 }}>1</sup>}
              </button>
              <button className={cx('ctrl', p.shuffled && 'active')} onClick={p.toggleShuffle} title="Aleatório"><Shuffle size={17} /></button>
              <div className="volume" style={{ width: 130 }}>
                <Volume2 size={16} style={{ color: 'var(--muted)' }} />
                <input type="range" min="0" max="1" step="0.01" value={p.volume} onChange={e => p.setVolume(+e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Fila */}
        <div className="panel queue-panel">
          <h4><span><ListMusic size={15} style={{ verticalAlign: -3, marginRight: 6 }} />Fila · {songs.length}</span>
            <button className="mini-btn" onClick={() => { sfx.click(); setDraft({}); setModal('clear') }} title="Limpar playlist"><Eraser size={15} /></button>
          </h4>
          <input className="input" placeholder="Filtrar na fila..." value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom: 10 }} />
          <div className="queue">
            {filtered.length === 0 ? <Empty icon="♪" title="Fila vazia">Adicione músicas pelo link do YouTube acima.</Empty> : filtered.map((s, i) => (
              <div key={s.id} draggable onDragStart={() => dragIdx.current = i} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)}
                className={cx('song-row', p.current?.youtube_id === s.youtube_id && 'active')}>
                <GripVertical size={13} style={{ color: 'var(--muted)', cursor: 'grab', flex: '0 0 13px' }} />
                <img src={s.thumb} alt="" />
                <div className="meta" onClick={() => { sfx.play(); p.playSong(s, songs) }} style={{ cursor: 'pointer' }}>
                  <b>{s.title}</b><span>{s.artist}</span>
                </div>
                <div className="row-actions">
                  <button className="mini-btn" onClick={() => moveSong(i, -1)} title="Mover para primeiro"><ArrowUp size={13} /></button>
                  <button className="mini-btn" onClick={() => moveSong(i, 1)} title="Mover para último"><ArrowDown size={13} /></button>
                  <button className="mini-btn" onClick={() => verifyLink(s)} title="Verificar link">
                    {checking[s.id] === 'loading' ? <span className="spin"><Link2 size={13} /></span> : checking[s.id] === 'ok' ? <CheckCircle2 size={13} color="#4f8b62" /> : checking[s.id] === 'bad' ? <XCircle size={13} color="#c55" /> : <Link2 size={13} />}
                  </button>
                  <button className="mini-btn" onClick={() => setConfirm(s)} title="Remover"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => { if (songs.length) p.playSong(songs[0], songs) }}><Play size={13} /> Do início</button>
            <button className="btn sm ghost" style={{ flex: 1 }} onClick={() => { if (songs.length) p.playSong(songs[songs.length - 1], songs) }}>No fim</button>
          </div>
        </div>
      </div>

      {modal === 'create' && <Modal title="Nova playlist" subtitle="Crie uma playlist para organizar suas músicas"
        onClose={() => setModal(null)} actions={<>
          <button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn primary" onClick={createPlaylist}>Criar</button>
        </>}>
        <div className="field"><label>Nome</label><input className="input" autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Pagode" /></div>
        <div className="field"><label>Cor</label><input type="color" value={draft.color || '#D9E5D2'} onChange={e => setDraft({ ...draft, color: e.target.value })} style={{ width: 60, height: 38, border: 0, background: 'none' }} /></div>
      </Modal>}

      {modal === 'rename' && <Modal title="Editar playlist" onClose={() => setModal(null)} actions={<>
        <button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button>
        <button className="btn primary" onClick={renamePlaylist}>Salvar</button>
      </>}>
        <div className="field"><label>Nome</label><input className="input" value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
        <div className="field"><label>Cor</label><input type="color" value={draft.color || '#D9E5D2'} onChange={e => setDraft({ ...draft, color: e.target.value })} /></div>
        <button className="btn ghost sm" onClick={async () => { setConfirm({ playlist: true }); setModal(null) }}><Trash2 size={13} /> Excluir playlist</button>
      </Modal>}

      {modal === 'clear' && <Confirm title="Limpar playlist" message="Remover todas as músicas desta playlist? As músicas continuam na biblioteca." danger
        onCancel={() => setModal(null)} onConfirm={async () => {
          await run('DELETE FROM playlist_songs WHERE playlist_id=?', [selected]); sfx.confirm(); setModal(null); await loadSongs()
        }} />}

      {confirm && <Confirm title="Remover música" message={`Remover "${confirm.title}" desta playlist?`} danger
        onCancel={() => setConfirm(null)} onConfirm={async () => { await removeFromPlaylist(confirm); setConfirm(null) }} />}
    </div>
  )
}
