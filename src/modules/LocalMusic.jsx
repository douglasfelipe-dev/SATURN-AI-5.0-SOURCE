import React, { useEffect, useRef, useState } from 'react'
import { Upload, Play, Pause, SkipBack, SkipForward, Volume2, Trash2, Music2, AlertCircle, Search } from 'lucide-react'
import { api, all, run, now, logEvent, mediaUrl } from '../lib/db'
import { sfx } from '../lib/sound'
import { fmtBytes, fmtTime, cx } from '../lib/utils'
import { Empty, Progress } from '../components/common'

const EXT = ['mp3','wav','ogg','m4a','aac','flac']

export default function LocalMusic({ onToast }) {
  const [tracks, setTracks] = useState([])
  const [current, setCurrent] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const audioRef = useRef(null)

  const load = async () => { setTracks(await all('SELECT * FROM local_tracks ORDER BY added_at DESC')) }
  useEffect(() => { load() }, [])

  const importTracks = async (paths) => {
    const valid = paths.filter(p => EXT.includes(p.split('.').pop()?.toLowerCase()))
    const invalid = paths.length - valid.length
    if (invalid) onToast?.(`${invalid} arquivo(s) ignorado(s): use MP3, WAV, OGG, M4A`, 'error')
    if (!valid.length) return
    setBusy(true)
    try {
      const copied = await api.app.copyFiles(valid, 'music')
      for (const f of copied) {
        if (f.error) continue
        if (await all('SELECT id FROM local_tracks WHERE path=?', [f.path]).then(r => r.length)) continue
        const base = f.name.replace(/\.[^.]+$/, '')
        const parts = base.split(' - ')
        const title = parts.length > 1 ? parts.slice(1).join(' - ') : base
        const artist = parts.length > 1 ? parts[0] : 'Artista desconhecido'
        await run('INSERT INTO local_tracks (title,artist,path,size,added_at) VALUES (?,?,?,?,?)', [title, artist, f.path, f.size, now()])
      }
      logEvent('music', 'local_imported', `${copied.length} faixa(s)`)
      sfx.confirm(); onToast?.(`${copied.length} música(s) importada(s)`); await load()
    } catch (e) { sfx.error(); onToast?.('Erro: ' + e.message, 'error') }
    setBusy(false)
  }
  const pick = async () => {
    try { importTracks(await api.app.select({ multi: true, filters: [{ name: 'Áudios', extensions: EXT }], title: 'Importar músicas MP3' })) }
    catch (e) { onToast?.('Erro no seletor: ' + e.message, 'error') }
  }

  const play = t => {
    setError(''); setCurrent(t); setTime(0); setPlaying(true)
    setTimeout(() => {
      const el = audioRef.current; if (!el) return
      el.volume = volume
      el.play().catch(e => { setError('Não foi possível reproduzir: ' + e.message); setPlaying(false) })
    }, 150)
  }
  const toggle = () => {
    const el = audioRef.current; if (!el) return
    if (el.paused) el.play().then(() => setPlaying(true)).catch(e => setError(e.message))
    else { el.pause(); setPlaying(false) }
  }
  const next = () => { const i = tracks.findIndex(t => t.id === current?.id); if (tracks.length) play(tracks[(i+1)%tracks.length]) }
  const prev = () => { const i = tracks.findIndex(t => t.id === current?.id); if (tracks.length) play(tracks[(i-1+tracks.length)%tracks.length]) }
  const remove = async t => { await run('DELETE FROM local_tracks WHERE id=?', [t.id]); if (current?.id === t.id) { setCurrent(null); setPlaying(false) } sfx.close(); load() }

  const shown = tracks.filter(t => !query || (t.title + t.artist).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="page" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); importTracks(Array.from(e.dataTransfer.files).map(f => f.path)) }}>
      <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div><h1 className="page-title">Músicas locais</h1><p className="page-sub">Seus arquivos MP3 com reprodução real e playlist persistente</p></div>
        <button className="btn primary" onClick={pick} disabled={busy}>{busy ? <span className="spin"><Upload size={15}/></span> : <Upload size={15}/>} Importar MP3</button>
      </div>
      <div className={cx('dropzone', over && 'over')} style={{ padding:14, marginBottom:14 }}><Music2 size={18}/> Arraste MP3, WAV, OGG ou M4A para cá</div>

      <div className="grid grid-2" style={{ gridTemplateColumns:'1fr 320px' }}>
        <div className="card" style={{ textAlign:'center', padding:28 }}>
          <div style={{ width:120, height:120, borderRadius:28, background:'var(--primary-soft)', display:'grid', placeItems:'center', margin:'0 auto 18px' }}>
            <Music2 size={56} style={{ color:'var(--primary)' }}/>
          </div>
          <h2 style={{ fontFamily:'Fraunces, serif', margin:'0 0 4px' }}>{current?.title || 'Nenhuma faixa selecionada'}</h2>
          <p style={{ color:'var(--muted)', fontSize:12, margin:'0 0 20px' }}>{current?.artist || 'Importe músicas do seu computador'}</p>
          {error && <div style={{ color:'#b05', fontSize:11.5, display:'flex', gap:6, justifyContent:'center' }}><AlertCircle size={13}/>{error}</div>}
          <div style={{ display:'flex', gap:10, justifyContent:'center', alignItems:'center' }}>
            <button className="ctrl" onClick={prev}><SkipBack size={18} fill="currentColor"/></button>
            <button className="ctrl play" onClick={toggle}>{playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}</button>
            <button className="ctrl" onClick={next}><SkipForward size={18} fill="currentColor"/></button>
          </div>
          <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--muted)' }}>{fmtTime(time)}</span>
            <div style={{ flex:1 }}><Progress value={duration ? time/duration*100 : 0} onClick={p => { if (audioRef.current) audioRef.current.currentTime = p*duration }}/></div>
            <span style={{ fontSize:11, color:'var(--muted)' }}>{fmtTime(duration)}</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'center', marginTop:14 }}>
            <Volume2 size={16}/><input type="range" min="0" max="1" step="0.01" value={volume} style={{ width:140 }}
              onChange={e => { setVolume(+e.target.value); if (audioRef.current) audioRef.current.volume = +e.target.value }}/>
          </div>
        </div>
        <div className="panel">
          <h4>Playlist <span className="chip">{tracks.length}</span></h4>
          <input className="input" placeholder="Buscar faixa..." value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom:8 }}/>
          {!shown.length ? <Empty icon="🎵" title="Nenhuma música importada"/> : shown.map(t => <div key={t.id} className={cx('song-row', current?.id === t.id && 'active')}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--primary-soft)', display:'grid', placeItems:'center', flex:'0 0 36px' }}><Music2 size={16}/></div>
            <div className="meta" onClick={() => play(t)} style={{ cursor:'pointer' }}><b>{t.title}</b><span>{t.artist} · {fmtBytes(t.size)}</span></div>
            <button className="mini-btn" onClick={() => remove(t)}><Trash2 size={13}/></button>
          </div>)}
        </div>
      </div>
      {current && <audio ref={audioRef} src={mediaUrl(current.path)} style={{ display:'none' }}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => { setDuration(e.currentTarget.duration); e.currentTarget.volume = volume }}
        onEnded={next} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={e => setError('Arquivo de áudio inválido ou codec não suportado (código ' + e.currentTarget.error?.code + ')')}/>}
    </div>
  )
}
