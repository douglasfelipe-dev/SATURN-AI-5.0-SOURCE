import React, { useEffect, useRef } from 'react'
import { thumb } from '../lib/utils'

export function loadYouTubeAPI(timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return }
      if (Date.now() - start > timeoutMs) { reject(new Error('API do YouTube indisponível')); return }
      setTimeout(check, 100)
    }
    if (!document.querySelector('script[data-yt-api]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.dataset.ytApi = '1'
      document.head.appendChild(s)
    } else if (window.onYouTubeIframeAPIReady) {
      // Garante que o callback global continue válido para carregamentos anteriores
    }
    check()
  })
}

/**
 * Player real do YouTube (IFrame Player API).
 * O elemento do player é criado fora do React para evitar conflito de reconciliação,
 * já que a API do YouTube substitui o div pelo iframe.
 */
export default function YouTubePlayer({ videoId, autoplay = false, controls = 0, onState, onTime, onReady, apiRef, className = '', poster }) {
  const hostRef = useRef(null)
  const holderRef = useRef(null)
  const idRef = useRef('yt-' + Math.random().toString(36).slice(2))
  const playerRef = useRef(null)
  const cbs = useRef({ onState, onTime, onReady })
  cbs.current = { onState, onTime, onReady }

  useEffect(() => {
    let disposed = false
    const host = hostRef.current
    if (!host) return
    const holder = document.createElement('div')
    holder.id = idRef.current
    holder.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
    host.appendChild(holder)
    holderRef.current = holder

    loadYouTubeAPI().then(YT => {
      if (disposed || !host.isConnected) return
      const options = {
        width: '100%', height: '100%',
        playerVars: {
          controls, rel: 0, modestbranding: 1, playsinline: 1,
          autoplay: autoplay ? 1 : 0
        },
        events: {
          onReady: e => {
            try { e.target.setVolume(70) } catch (_) {}
            cbs.current.onReady?.(e.target)
          },
          onStateChange: e => cbs.current.onState?.(e.data, e.target),
          onError: e => cbs.current.onState?.(-1, e.target, e.data)
        }
      }
      if (videoId) options.videoId = videoId
      playerRef.current = new YT.Player(holder, options)
      if (apiRef) {
        apiRef.current = {
          play: () => playerRef.current?.playVideo?.(),
          pause: () => playerRef.current?.pauseVideo?.(),
          stop: () => playerRef.current?.stopVideo?.(),
          seek: s => playerRef.current?.seekTo?.(s, true),
          setVolume: v => playerRef.current?.setVolume?.(Math.round(v * 100)),
          mute: () => playerRef.current?.mute?.(),
          unMute: () => playerRef.current?.unMute?.(),
          getTime: () => playerRef.current?.getCurrentTime?.() || 0,
          getDuration: () => playerRef.current?.getDuration?.() || 0,
          getState: () => playerRef.current?.getPlayerState?.(),
          load: (id, auto = false) => {
            try { auto ? playerRef.current?.loadVideoById?.(id) : playerRef.current?.cueVideoById?.(id) } catch (_) {}
          },
          getPlayer: () => playerRef.current
        }
      }
    }).catch(() => {})

    const timer = setInterval(() => {
      const p = playerRef.current
      if (p && typeof p.getCurrentTime === 'function') {
        try { cbs.current.onTime?.(p.getCurrentTime() || 0, p.getDuration() || 0) } catch (_) {}
      }
    }, 400)
    return () => {
      disposed = true
      clearInterval(timer)
      try { playerRef.current?.destroy?.() } catch (_) {}
      playerRef.current = null
      if (apiRef) apiRef.current = null
      if (holder.parentNode === host) host.removeChild(holder)
      holderRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!videoId || !playerRef.current) return
    try { playerRef.current.loadVideoById(videoId) } catch (_) {}
  }, [videoId])

  return (
    <div className={className} ref={hostRef}
      style={{
        position: 'relative', width: '100%', height: '100%', background: '#000',
        backgroundImage: videoId ? `url(${thumb(videoId, 'maxres')})` : poster ? `url(${poster})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center'
      }} />
  )
}
