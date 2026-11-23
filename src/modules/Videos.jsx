import React, { useEffect, useRef, useState } from 'react'
import { Upload, Play, Pause, SkipBack, SkipForward, Volume2, Trash2, Film, AlertCircle, FolderOpen, Maximize2, Search } from 'lucide-react'
import { api, all, run, now, logEvent, mediaUrl } from '../lib/db'
import { sfx } from '../lib/sound'
import { fmtBytes, fmtTime, cx } from '../lib/utils'
import { Empty, Progress } from '../components/common'

const EXT = ['mp4','webm','mkv','avi','mov','m4v','ogv']

export default function Videos({ onToast }) {
  const [videos, setVideos] = useState([])
  const [current, setCurrent] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const videoRef = useRef(null)

  const load = async () => {
    const rows = await all('SELECT * FROM local_videos ORDER BY added_at DESC')
    setVideos(rows)
    setCurrent(c => c || rows[0] || null)
  }
  useEffect(() => { load() }, [])

  const importVideos = async (paths) => {
    const valid = paths.filter(p => EXT.includes(p.split('.').pop()?.toLowerCase()))
    const invalid = paths.length - valid.length
    if (invalid) onToast?.(`${invalid} arquivo(s) ignorado(s): formato não suportado`, 'error')
    if (!valid.length) return
    setBusy(true)
    try {
      const copied = await api.app.copyFiles(valid, 'videos')
      for (const f of copied) {
        if (f.error) continue
        if (!await all('SELECT id FROM local_videos WHERE path=?', [f.path]).then(r => r.length)) {
          await run('INSERT INTO local_videos (name,path,size,added_at) VALUES (?,?,?,?)', [f.name, f.path, f.size, now()])
        }
      }
      logEvent('videos', 'local_imported', `${copied.length} vídeo(s)`)
      sfx.confirm(); onToast?.(`${copied.length} vídeo(s) importado(s)`); await load()
    } catch (e) { sfx.error(); onToast?.('Erro: ' + e.message, 'error') }
    setBusy(false)
  }
  const pick = async () => {
    try { importVideos(await api.app.select({ multi: true, filters: [{ name: 'Vídeos', extensions: EXT }], title: 'Importar vídeos locais' })) }
    catch (e) { onToast?.('Erro no seletor: ' + e.message, 'error') }
  }

  const play = v => {
    setError(''); setCurrent(v); setTime(0); setPlaying(true)
    setTimeout(() => {
      const el = videoRef.current
      if (!el) return
      el.volume = volume
      el.play().catch(e => {
        const name = e?.name || ''
        setError(name === 'NotSupportedError'
          ? 'Este vídeo usa um codec não suportado por este computador (H.264/AAC são recomendados).'
          : 'Não foi possível reproduzir este vídeo: ' + e.message)
        setPlaying(false)
      })
    }, 150)
  }
  const toggle = () => {
    const el = videoRef.current; if (!el) return
    if (el.paused) el.play().then(() => setPlaying(true)).catch(e => setError(e.message))
    else { el.pause(); setPlaying(false) }
  }
  const next = () => { const i = videos.findIndex(v => v.id === current?.id); if (videos.length) play(videos[(i + 1) % videos.length]) }
  const prev = () => { const i = videos.findIndex(v => v.id === current?.id); if (videos.length) play(videos[(i - 1 + videos.length) % videos.length]) }
  const remove = async v => { await run('DELETE FROM local_videos WHERE id=?', [v.id]); if (current?.id === v.id) { setCurrent(null); setPlaying(false) } sfx.close(); load() }

  const shown = videos.filter(v => !query || v.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="page" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); importVideos(Array.from(e.dataTransfer.files).map(f => f.path)) }}>
      <div className="page-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div><h1 className="page-title">Vídeos</h1><p className="page-sub">Vídeos locais — reprodução real, separada da Sala de Cinema</p></div>
        <button className="btn primary" onClick={pick} disabled={busy}>{busy ? <span className="spin"><Upload size={15}/></span> : <Upload size={15}/>} Importar vídeos</button>
      </div>
      <div className={cx('dropzone', over && 'over')} style={{ padding:14, marginBottom:14 }}><Film size={18}/> Arraste MP4, WebM, MKV, MOV ou AVI para cá</div>

      <div className="grid grid-2" style={{ gridTemplateColumns:'1fr 300px' }}>
        <div>
          <div style={{ background:'#000', borderRadius:20, overflow:'hidden', boxShadow:'var(--shadow)' }}>
            {current ? <>
              <video ref={videoRef} src={mediaUrl(current.path)} controls={false} playsInline
                style={{ width:'100%', maxHeight:'52vh', display:'block', background:'#000' }}
                onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={e => { setDuration(e.currentTarget.duration); e.currentTarget.volume = volume }}
                onEnded={next} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onError={e => {
                  const code = e.currentTarget.error?.code
                  setError(code === 4 || code === 3
                    ? 'Codec não suportado ou arquivo incompleto. Use H.264/AAC em MP4 quando possível.'
                    : 'Arquivo de vídeo indisponível ou corrompido.')
                  setPlaying(false)
                }}/>
              <div style={{ padding:12, background:'var(--card)' }}>
                <b style={{ fontSize:13 }}>{current.name}</b>
                {error && <div style={{ color:'#b05', fontSize:11.5, display:'flex', gap:6, marginTop:6 }}><AlertCircle size={13}/>{error}</div>}
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10 }}>
                  <button className="btn icon sm ghost" onClick={prev}><SkipBack size={15}/></button>
                  <button className="btn icon primary" onClick={toggle}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button>
                  <button className="btn icon sm ghost" onClick={next}><SkipForward size={15}/></button>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>{fmtTime(time)}</span>
                  <div style={{ flex:1 }}><Progress value={duration ? time/duration*100 : 0} onClick={p => { if (videoRef.current) videoRef.current.currentTime = p*duration }}/></div>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>{fmtTime(duration)}</span>
                  <Volume2 size={15}/>
                  <input type="range" min="0" max="1" step="0.01" value={volume} style={{ width:80 }}
                    onChange={e => { setVolume(+e.target.value); if (videoRef.current) videoRef.current.volume = +e.target.value }}/>
                  <button className="btn icon sm ghost" onClick={() => videoRef.current?.requestFullscreen?.()}><Maximize2 size={14}/></button>
                </div>
              </div>
            </> : <div style={{ padding:70, textAlign:'center', color:'#fff' }}><Film size={44}/><div style={{ marginTop:12 }}>Nenhum vídeo carregado</div></div>}
          </div>
        </div>
        <div className="panel">
          <h4>Fila de vídeos <span className="chip">{videos.length}</span></h4>
          <input className="input" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom:8 }}/>
          {!shown.length ? <Empty icon="🎬" title="Nenhum vídeo importado"/> : shown.map(v => <div key={v.id} className={cx('song-row', current?.id === v.id && 'active')}>
            <Film size={18} style={{ flex:'0 0 18px' }}/>
            <div className="meta" onClick={() => play(v)} style={{ cursor:'pointer' }}><b>{v.name}</b><span>{fmtBytes(v.size)}</span></div>
            <button className="mini-btn" onClick={() => api.app.openPath(v.path)} title="Abrir"><FolderOpen size={13}/></button>
            <button className="mini-btn" onClick={() => remove(v)}><Trash2 size={13}/></button>
          </div>)}
        </div>
      </div>
    </div>
  )
}
