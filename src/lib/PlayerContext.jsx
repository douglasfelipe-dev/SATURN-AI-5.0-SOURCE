import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import YouTubePlayer from '../components/YouTubePlayer'
import { shuffle } from './utils'
import { addStat, logEvent } from './db'

const Ctx = createContext(null)
export const usePlayer = () => useContext(Ctx)

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [repeat, setRepeat] = useState('off') // off | all | one
  const [shuffled, setShuffled] = useState(false)
  const apiRef = useRef(null)
  const pendingRef = useRef(null)
  const stateRef = useRef({ queue: [], index: -1, repeat: 'off' })
  stateRef.current = { queue, index, repeat }

  const current = queue[index] || null

  const loadAndPlay = useCallback((song) => {
    if (!song?.youtube_id) return
    if (apiRef.current) apiRef.current.load(song.youtube_id, true)
    else pendingRef.current = song.youtube_id
    setTime(0); setDuration(0); setPlaying(false)
  }, [])

  const playAt = useCallback((i, list) => {
    const arr = list || stateRef.current.queue
    if (!arr?.length) return
    const real = i < 0 ? 0 : i >= arr.length ? 0 : i
    setIndex(real)
    setQueue(arr)
    loadAndPlay(arr[real])
  }, [loadAndPlay])

  const playSong = useCallback((song, list) => {
    const arr = list?.length ? list : [song]
    const i = arr.findIndex(s => s.youtube_id === song.youtube_id)
    playAt(i < 0 ? 0 : i, arr)
  }, [playAt])

  const next = useCallback((manual = true) => {
    const { queue: q, index: i, repeat: r } = stateRef.current
    if (!q.length) return
    if (r === 'one' && !manual) { apiRef.current?.seek(0); apiRef.current?.play(); return }
    let ni = i + 1
    if (ni >= q.length) {
      if (r === 'all') ni = 0
      else { if (manual) ni = 0; else { apiRef.current?.pause(); setPlaying(false); return } }
    }
    playAt(ni, q)
  }, [playAt])

  const prev = useCallback(() => {
    const { queue: q, index: i } = stateRef.current
    if (!q.length) return
    const t = apiRef.current?.getTime?.() || 0
    if (t > 4) { apiRef.current?.seek(0); return }
    playAt(i <= 0 ? q.length - 1 : i - 1, q)
  }, [playAt])

  const toggle = useCallback(() => {
    const st = apiRef.current?.getState?.()
    if (!current) return
    if (st === 1) apiRef.current?.pause()
    else apiRef.current?.play()
    // O estado visual é atualizado somente pelo evento real do player (onState)
  }, [current])

  const stop = useCallback(() => { apiRef.current?.stop(); setPlaying(false); setTime(0) }, [])
  const seek = useCallback(p => { const d = apiRef.current?.getDuration?.() || 0; apiRef.current?.seek(p * d); setTime(p * d) }, [])
  const setVolume = useCallback(v => { setVolumeState(v); apiRef.current?.setVolume(v) }, [])

  const toggleShuffle = useCallback(() => {
    setShuffled(s => {
      const n = !s
      setQueue(q => n ? shuffle(q) : q)
      return n
    })
  }, [])

  const setQueueAndPlay = useCallback((list, i = 0) => playAt(i, list), [playAt])

  const countedRef = useRef(null)
  const onState = useCallback((data) => {
    if (data === 1) {
      setPlaying(true)
      const id = stateRef.current.queue[stateRef.current.index]?.youtube_id
      if (id && countedRef.current !== id) {
        countedRef.current = id
        addStat('song_played', 1, id)
        logEvent('music', 'play', stateRef.current.queue[stateRef.current.index]?.title || id)
      }
    } else if (data === 2) setPlaying(false)
    else if (data === 0) next(false)
  }, [next])

  const onTime = useCallback((t, d) => { setTime(t); setDuration(d) }, [])
  const onReady = useCallback(() => {
    if (pendingRef.current) {
      apiRef.current?.load(pendingRef.current, true)
      pendingRef.current = null
    }
  }, [])

  useEffect(() => { apiRef.current?.setVolume(volume) }, [volume])

  // Tempo real de escuta (somente quando há reprodução de fato)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => addStat('listen_seconds', 5), 5000)
    return () => clearInterval(t)
  }, [playing])

  const value = {
    queue, index, current, playing, time, duration, volume, repeat, shuffled,
    playSong, playAt, playQueue: setQueueAndPlay, next, prev, toggle, stop, seek, setVolume,
    setRepeat, toggleShuffle, setQueue
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && <div style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', left: -10, top: -10 }}>
        <YouTubePlayer videoId={current.youtube_id} autoplay apiRef={apiRef} onState={onState} onTime={onTime} onReady={onReady} controls={0} />
      </div>}
    </Ctx.Provider>
  )
}
