import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Cria uma cena Three.js gerenciada dentro de um <div>.
 * initFn(state) deve configurar a cena e pode retornar { animate, dispose, onMove, onClick }.
 * O estado retornado em stateRef pode ser alterado a qualquer momento pelas atualizações do React.
 */
export function useThreeScene(initFn, deps = [], opts = {}) {
  const ref = useRef(null)
  const stateRef = useRef(null)
  const initRef = useRef(initFn)
  initRef.current = initFn

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.alpha !== false })
    } catch (e) {
      el.innerHTML = '<div style="padding:24px;color:#a33">WebGL indisponível neste computador.</div>'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(opts.fov || 45, Math.max(1, el.clientWidth) / Math.max(1, el.clientHeight), 0.1, 200)
    camera.position.set(0, 2, 8)

    const state = {
      THREE, renderer, scene, camera, el,
      clock: new THREE.Clock(),
      mouse: new THREE.Vector2(-10, -10),
      raycaster: new THREE.Raycaster(),
      objects: {},
      data: {},
      quality: opts.quality || 'alta',
      width: el.clientWidth,
      height: el.clientHeight
    }
    stateRef.current = state

    const handlers = initRef.current(state) || {}
    const animate = handlers.animate || (() => {})

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(state.clock.getDelta(), 0.1)
      const t = state.clock.elapsedTime
      animate(t, dt)
      renderer.render(scene, camera)
    }
    loop()

    let resizeScheduled = false
    const resize = () => {
      if (resizeScheduled) return
      resizeScheduled = true
      requestAnimationFrame(() => {
        resizeScheduled = false
        if (!el.clientWidth || !el.clientHeight) return
        state.width = el.clientWidth; state.height = el.clientHeight
        renderer.setSize(el.clientWidth, el.clientHeight)
        camera.aspect = el.clientWidth / el.clientHeight
        camera.updateProjectionMatrix()
        handlers.resize?.(state)
      })
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const setMouse = e => {
      const r = renderer.domElement.getBoundingClientRect()
      state.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
      state.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
      state.pointerEvent = e
    }
    const onMove = e => { setMouse(e); handlers.onMove?.(state, e) }
    const onClick = e => { setMouse(e); handlers.onClick?.(state, e) }
    const onDown = e => { setMouse(e); handlers.onDown?.(state, e) }
    const onUp = e => { setMouse(e); handlers.onUp?.(state, e) }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('click', onClick)

    const visibility = () => {
      state.visible = !document.hidden
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!raf) loop()
    }
    document.addEventListener('visibilitychange', visibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('click', onClick)
      try { handlers.dispose?.(state) } catch (_) {}
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose?.()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach(m => {
            for (const k of Object.keys(m)) {
              const v = m[k]
              if (v && v.isTexture) v.dispose()
            }
            m.dispose?.()
          })
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
      stateRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ref, state: stateRef }
}

export function raycast(state, objects) {
  state.raycaster.setFromCamera(state.mouse, state.camera)
  return state.raycaster.intersectObjects(objects, true)
}

export function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
