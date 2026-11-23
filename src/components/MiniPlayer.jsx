import React from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music2, Shuffle, Repeat2 } from 'lucide-react'
import { usePlayer } from '../lib/PlayerContext'
import { fmtTime, thumb } from '../lib/utils'
import { Progress } from './common'
import { sfx } from '../lib/sound'

export default function MiniPlayer({ onGoMusic }) {
  const p = usePlayer()
  const s = p.current
  return (
    <div className="mini-player">
      <img src={s ? thumb(s.youtube_id) : undefined} alt="" onDoubleClick={onGoMusic}
        style={{ cursor: 'pointer', background: 'var(--bg)' }} onClick={onGoMusic} />
      <div className="mini-meta" onClick={onGoMusic} style={{ cursor: 'pointer' }}>
        <b>{s?.title || 'Nada tocando agora'}</b>
        <span>{s?.artist || 'Escolha uma música na biblioteca'}</span>
      </div>
      <div className="mini-ctrls">
        <button className="ctrl" onClick={() => { sfx.click(); p.prev() }} title="Anterior"><SkipBack size={17} fill="currentColor" /></button>
        <button className="ctrl play" onClick={() => { sfx.play(); p.toggle() }} title={p.playing ? 'Pausar' : 'Reproduzir'}>
          {p.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button className="ctrl" onClick={() => { sfx.click(); p.next() }} title="Próxima"><SkipForward size={17} fill="currentColor" /></button>
      </div>
      <div className="mini-progress">
        <small>{fmtTime(p.time)}</small>
        <Progress value={p.duration ? (p.time / p.duration) * 100 : 0} onClick={p.seek} />
        <small>{fmtTime(p.duration)}</small>
      </div>
      <div className="volume">
        <button className="mini-btn" onClick={() => p.setVolume(p.volume > 0 ? 0 : 0.7)}>
          {p.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input type="range" min="0" max="1" step="0.01" value={p.volume} onChange={e => p.setVolume(+e.target.value)} />
      </div>
      <button className={`mini-btn ${p.shuffled ? 'active' : ''}`} onClick={() => { sfx.click(); p.toggleShuffle() }} title="Aleatório"><Shuffle size={15} /></button>
      <button className={`mini-btn ${p.repeat !== 'off' ? 'active' : ''}`} onClick={() => { sfx.click(); p.setRepeat(p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off') }} title="Repetir">
        <Repeat2 size={15} />{p.repeat === 'one' && <sup style={{ fontSize: 8 }}>1</sup>}
      </button>
      {!s && <Music2 size={16} style={{ color: 'var(--muted)' }} />}
    </div>
  )
}
