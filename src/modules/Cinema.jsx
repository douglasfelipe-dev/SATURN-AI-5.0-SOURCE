import React, { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Play, Pause, Volume2, Film, Camera, SkipForward, SkipBack, Eraser, GripVertical, Maximize2, Minimize2, AlertTriangle } from 'lucide-react'
import { api, all, run, logEvent, now } from '../lib/db'
import YouTubePlayer from '../components/YouTubePlayer'
import { sfx } from '../lib/sound'
import { thumb, cx, parseYoutubeId, fmtTime } from '../lib/utils'
import { Confirm, Empty, Progress } from '../components/common'

const SITES = [
  { name:'YouTube', url:'https://www.youtube.com' }, { name:'Netflix', url:'https://www.netflix.com' },
  { name:'Prime Video', url:'https://www.primevideo.com' }, { name:'Disney+', url:'https://www.disneyplus.com' },
  { name:'Vimeo', url:'https://vimeo.com' }, { name:'Twitch', url:'https://www.twitch.tv' }
]

export default function Cinema({ initialTab = 'sala' }) {
  const [tab, setTab] = useState(initialTab)
  const [videos, setVideos] = useState([])
  const [current, setCurrent] = useState(null)
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [site, setSite] = useState('https://www.youtube.com')
  const [siteInput, setSiteInput] = useState('https://www.youtube.com')
  const [confirm, setConfirm] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [full, setFull] = useState(false)
  const ytApi = useRef(null)
  const screenRef = useRef(null)

  const load = async () => setVideos(await all('SELECT * FROM videos ORDER BY added_at DESC'))
  useEffect(() => { load() }, [])

  const addVideo = async () => {
    const id = parseYoutubeId(url.trim())
    if (!id) { sfx.error(); window.dispatchEvent(new CustomEvent('nova-toast',{detail:{text:'Link do YouTube inválido.',type:'error'}})); return }
    let info = { ok:true, id, title:`Vídeo ${id}`, channel:'YouTube', thumb:thumb(id) }
    try {
      const meta = await Promise.race([
        Promise.resolve().then(()=>api.yt?.info?.(url.trim())).catch(()=>null),
        new Promise(r=>setTimeout(()=>r(null),3000))
      ])
      if (meta?.ok) info = meta
    } catch (_) {}
    await run('INSERT OR IGNORE INTO videos (title,youtube_id,thumb,channel,added_at) VALUES (?,?,?,?,?)',[info.title,info.id,info.thumb,info.channel,now()])
    logEvent('cinema','video_added',info.title)
    setUrl(''); sfx.confirm(); load()
    window.dispatchEvent(new CustomEvent('nova-toast',{detail:{text:'Vídeo adicionado à fila'}}))
  }
  const playVideo = v => { sfx.play(); setCurrent(v); setTime(0); setTimeout(()=>ytApi.current?.load(v.youtube_id,true),120) }
  const nextVideo = () => { if(videos.length){const i=videos.findIndex(v=>v.id===current?.id);playVideo(videos[(i+1)%videos.length])} }
  const prevVideo = () => { if(videos.length){const i=videos.findIndex(v=>v.id===current?.id);playVideo(videos[(i-1+videos.length)%videos.length])} }
  const onState = d => { if(d===1)setPlaying(true); else if(d===2)setPlaying(false); else if(d===0)nextVideo() }
  const onTime = (t,d) => { setTime(t); setDuration(d) }
  const toggle = () => { if(!current)return; const st=ytApi.current?.getState?.(); if(st===1)ytApi.current?.pause(); else ytApi.current?.play() }
  const move = (from,to) => {
    if(from==null||from===to)return
    setVideos(prev=>{const a=[...prev];const [it]=a.splice(from,1);a.splice(to,0,it);return a}); setDragIdx(null); sfx.confirm()
  }
  const clearQueue = async () => { await run('DELETE FROM videos'); setCurrent(null); setPlaying(false); sfx.close(); load() }
  const capture = async () => {
    try {
      const r = screenRef.current?.getBoundingClientRect()
      const rect = r ? {x:Math.max(0,r.left),y:Math.max(0,r.top),width:Math.max(10,r.width),height:Math.max(10,r.height)} : null
      const res = await api.capture.save(rect)
      window.dispatchEvent(new CustomEvent('nova-toast',{detail:res.ok?{text:`Captura salva: ${res.path}`}:{text:'Não foi possível capturar: '+res.error,type:'error'}}))
    } catch(e){ window.dispatchEvent(new CustomEvent('nova-toast',{detail:{text:'Erro: '+e.message,type:'error'}})) }
  }
  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) { await screenRef.current?.requestFullscreen?.(); setFull(true) }
      else { await document.exitFullscreen(); setFull(false) }
    } catch (_) {}
  }

  return <div className="page">
    <div className="page-head"><h1 className="page-title">Cinema</h1><p className="page-sub">Sua sala de exibição — vídeos do YouTube em tela grande</p></div>
    <div className="tabs">
      {[['sala','Sala de cinema'],['navegador','Navegador do Cinema'],['lista','Fila de vídeos']].map(([id,l])=><button key={id} className={cx('tab',tab===id&&'active')} onClick={()=>{sfx.nav();setTab(id)}}>{l}</button>)}
    </div>

    {tab==='sala' && <>
      <div className="cinema-screen-wrap">
        <div className="cinema-add-bar">
          <input className="input" placeholder="Cole um link do YouTube..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addVideo()}/>
          <button className="btn primary" onClick={addVideo}><Plus size={15}/> Adicionar</button>
        </div>
        <div className="cinema-bigscreen" ref={screenRef}>
          <div className="cinema-screen-inner">
            {current ? <YouTubePlayer videoId={current.youtube_id} controls={0} autoplay apiRef={ytApi} onState={onState} onTime={onTime}/> :
              <div className="cinema-placeholder"><Film size={54}/><div style={{marginTop:12}}>Adicione vídeos para começar</div></div>}
          </div>
          <div className="cinema-title-overlay">{current?.title || 'Nenhum vídeo carregado'}</div>
        </div>
        <div className="cinema-controls-2d">
          <button className="btn icon sm ghost" onClick={prevVideo} title="Vídeo anterior"><SkipBack size={15}/></button>
          <button className="btn icon sm ghost" onClick={() => ytApi.current?.seek(Math.max(0, time - 5))} title="Voltar 5 segundos">−5s</button>
          <button className="btn icon primary" onClick={toggle}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
          <button className="btn icon sm ghost" onClick={() => ytApi.current?.seek(Math.min(duration, time + 5))} title="Avançar 5 segundos">+5s</button>
          <button className="btn icon sm ghost" onClick={nextVideo} title="Próximo vídeo"><SkipForward size={15}/></button>
          <span style={{fontSize:11,color:'var(--muted)',minWidth:36}}>{fmtTime(time)}</span>
          <div style={{flex:1,minWidth:120}}><Progress value={duration?time/duration*100:0} onChange={p=>{ if(duration) ytApi.current?.seek(p*duration) }} color="var(--primary)"/></div>
          <span style={{fontSize:11,color:'var(--muted)',minWidth:36}}>{fmtTime(duration)}</span>
          <Volume2 size={16}/>
          <input type="range" min="0" max="1" step="0.01" value={volume} style={{width:90}} onChange={e=>{setVolume(+e.target.value);ytApi.current?.setVolume(+e.target.value)}}/>
          <button className="btn icon sm ghost" onClick={capture} title="Capturar quadro"><Camera size={15}/></button>
          <button className="btn icon sm ghost" onClick={toggleFull} title="Tela cheia">{full?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button>
        </div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <div className="section-head" style={{margin:'0 0 12px'}}><h3>Fila de reprodução</h3>
          <div style={{display:'flex',gap:8}}><span className="chip">{videos.length} vídeos</span><button className="btn sm ghost" onClick={clearQueue}><Eraser size={13}/> Limpar fila</button></div></div>
        <div style={{maxHeight:280,overflow:'auto'}}>
          {!videos.length?<Empty icon="🎬" title="Fila vazia"/>:videos.map((v,i)=><div key={v.id}
            draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>move(dragIdx,i)}
            className={cx('song-row',current?.id===v.id&&'active')}>
            <GripVertical size={13} style={{color:'var(--muted)'}}/>
            <img src={v.thumb} alt=""/>
            <div className="meta" onClick={()=>playVideo(v)} style={{cursor:'pointer'}}><b>{v.title}</b><span>{v.channel}</span></div>
            <button className="mini-btn" onClick={()=>setConfirm(v)}><Trash2 size={13}/></button>
          </div>)}
        </div>
      </div>
    </>}

    {tab==='navegador' && <>
      <div className="card" style={{marginBottom:12}}>
        <div className="browser-bar"><input className="input" value={siteInput} onChange={e=>setSiteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setSite(siteInput)}/><button className="btn primary" onClick={()=>setSite(siteInput)}>Abrir</button><button className="btn ghost" onClick={()=>api.app.openExternal(site)}>Abrir fora do app</button></div>
        <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:6,alignItems:'center'}}><AlertTriangle size={13}/> DRM e autenticações são respeitados.</div>
      </div>
      <div className="browser-host"><webview key={site} src={site} allowpopups="true" style={{width:'100%',height:'100%',border:0}}/></div>
      <div className="quick-sites">{SITES.map(s=><button key={s.name} className="site-chip" onClick={()=>{setSite(s.url);setSiteInput(s.url)}}>{s.name}</button>)}</div>
    </>}

    {tab==='lista' && <div className="card">
      <div className="section-head" style={{margin:'0 0 12px'}}><h3>Fila de vídeos</h3><button className="btn sm ghost" onClick={clearQueue}>Limpar</button></div>
      <div className="media-grid">{videos.map(v=><div key={v.id} className="media-card" onClick={()=>{playVideo(v);setTab('sala')}}><img src={v.thumb} alt=""/><div className="cap">{v.title}</div></div>)}</div>
      {!videos.length&&<Empty icon="🎞" title="Nenhum vídeo na fila"/>}
    </div>}

    {confirm && <Confirm title="Remover vídeo" message={`Remover “${confirm.title}”?`} danger onCancel={()=>setConfirm(null)}
      onConfirm={async()=>{await run('DELETE FROM videos WHERE id=?',[confirm.id]);setConfirm(null);load()}}/>}
  </div>
}
