import React, { useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useThreeScene } from '../lib/useThree'

function roundedShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function woodTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 1024, 1024)
  g.addColorStop(0, '#8b5a38'); g.addColorStop(.5, '#6f452a'); g.addColorStop(1, '#593722')
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024)
  for (let i = 0; i < 140; i++) {
    x.strokeStyle = `rgba(${40 + Math.random()*40},${20 + Math.random()*20},10,${.03 + Math.random()*.09})`
    x.lineWidth = 1 + Math.random() * 3
    x.beginPath()
    const y0 = Math.random() * 1024
    x.moveTo(0, y0)
    for (let px = 0; px <= 1024; px += 40) x.lineTo(px, y0 + Math.sin(px * .012 + i) * 14 + (Math.random()-.5)*6)
    x.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function grooveTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024
  const x = c.getContext('2d'), m = 512
  const g = x.createRadialGradient(m, m, 60, m, m, m)
  g.addColorStop(0, '#1b1b1b'); g.addColorStop(.55, '#0f0f0f'); g.addColorStop(1, '#080808')
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024)
  for (let r = 190; r < 505; r += 3) {
    x.strokeStyle = r % 15 === 0 ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.018)'
    x.lineWidth = 1; x.beginPath(); x.arc(m, m, r, 0, Math.PI * 2); x.stroke()
  }
  for (let a = 0; a < Math.PI*2; a += .12) {
    x.strokeStyle = 'rgba(255,255,255,.02)'
    x.beginPath(); x.moveTo(m+Math.cos(a)*195,m+Math.sin(a)*195); x.lineTo(m+Math.cos(a)*500,m+Math.sin(a)*500); x.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function labelTexture(artUrl, title) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512
  const x = c.getContext('2d'), tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const finish = () => {
    const v = x.createRadialGradient(256, 256, 20, 256, 256, 256)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.32)')
    x.fillStyle = v; x.fillRect(0,0,512,512)
    x.textAlign = 'center'; x.fillStyle = '#fff'
    x.font = 'bold 30px DM Sans, sans-serif'; x.fillText(String(title||'DOUGLAS FELIPE.DEV').slice(0,20), 256, 292)
    x.font = '16px DM Sans, sans-serif'; x.fillText('33⅓ RPM · ESTÉREO', 256, 326)
    x.beginPath(); x.arc(256, 256, 15, 0, Math.PI*2); x.fillStyle = '#151515'; x.fill()
    tex.needsUpdate = true
  }
  x.fillStyle = '#8a9c86'; x.fillRect(0, 0, 512, 512); finish()
  if (artUrl) {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => {
      x.clearRect(0,0,512,512); x.save(); x.beginPath(); x.arc(256,256,256,0,Math.PI*2); x.clip()
      x.drawImage(img,0,0,512,512); x.restore(); finish()
    }
    img.src = artUrl
  }
  return tex
}

export default function Vinyl3D({ artUrl, title, playing, compact = false }) {
  const playingRef = useRef(playing); playingRef.current = playing
  const titleRef = useRef(title); titleRef.current = title

  const { ref } = useThreeScene((s) => {
    const { THREE: T, scene, camera, renderer } = s
    camera.position.set(0, compact ? 5.4 : 5.8, compact ? 6.0 : 6.8)
    camera.lookAt(0, 0, 0)

    scene.add(new T.AmbientLight(0xffffff, 1.55))
    const key = new T.DirectionalLight(0xfff1de, 2.5); key.position.set(4, 9, 6); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7
    scene.add(key)
    const fill = new T.PointLight(0xffc79a, 1.5, 20); fill.position.set(-5, 3, -3); scene.add(fill)
    const rim = new T.PointLight(0xa8d8ff, .8, 18); rim.position.set(5, 3, -5); scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = .07
    controls.enablePan = false; controls.minDistance = 5.2; controls.maxDistance = 11
    controls.minPolarAngle = .3; controls.maxPolarAngle = 1.12
    controls.target.set(0, 0, 0)

    const root = new T.Group(); root.rotation.y = -.22; scene.add(root)

    // Base arredondada com textura de madeera premium
    const wood = woodTexture()
    const baseGeo = new T.ExtrudeGeometry(roundedShape(7.6, 5.9, .55), { depth: .42, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 5, steps: 1 })
    baseGeo.rotateX(Math.PI / 2)
    const base = new T.Mesh(baseGeo, new T.MeshStandardMaterial({ map: wood, roughness: .42, metalness: .12 }))
    base.position.y = -.42; base.castShadow = true; base.receiveShadow = true; root.add(base)

    const topGeo = new T.ExtrudeGeometry(roundedShape(7.2, 5.5, .45), { depth: .08, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 3 })
    topGeo.rotateX(Math.PI / 2)
    const top = new T.Mesh(topGeo, new T.MeshStandardMaterial({ color: 0x26231f, roughness: .55, metalness: .25 }))
    top.position.y = -.1; top.receiveShadow = true; root.add(top)

    // Prato e disco
    const platter = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, .16, 96), new T.MeshStandardMaterial({ color: 0x3a3b3d, metalness: .8, roughness: .3 }))
    platter.position.set(-.7, -.01, .05); platter.castShadow = true; root.add(platter)
    const discGroup = new T.Group(); discGroup.position.set(-.7, .09, .05); root.add(discGroup)
    const groove = grooveTexture()
    const face = new T.MeshStandardMaterial({ color: 0x141414, roughness: .25, metalness: .1, map: groove })
    const side = new T.MeshStandardMaterial({ color: 0x0b0b0b, roughness: .3 })
    const disc = new T.Mesh(new T.CylinderGeometry(2.36, 2.36, .055, 128), [side, face, face])
    disc.castShadow = true; discGroup.add(disc)
    let labelTex = labelTexture(artUrl || '', titleRef.current || 'DOUGLAS FELIPE.DEV')
    const label = new T.Mesh(new T.CircleGeometry(.98, 64), new T.MeshStandardMaterial({ map: labelTex, roughness: .6, transparent: true, side: T.DoubleSide }))
    label.rotation.x = -Math.PI / 2; label.position.y = .031; discGroup.add(label)
    const spindle = new T.Mesh(new T.CylinderGeometry(.055, .055, .22, 24), new T.MeshStandardMaterial({ color: 0xe0e0e0, metalness: .95, roughness: .15 }))
    spindle.position.y = .13; discGroup.add(spindle)
    // Reflexo que gira junto com o vinil — deixa a rotação claramente visível
    const sheen = new T.Mesh(
      new T.RingGeometry(1.35, 2.2, 64, 1, -0.35, 0.5),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .11, side: T.DoubleSide, depthWrite: false })
    )
    sheen.rotation.x = -Math.PI / 2; sheen.position.y = .034; discGroup.add(sheen)

    // Braço articulado
    const pivot = new T.Group(); pivot.position.set(2.5, .2, -1.9); root.add(pivot)
    const pivotBase = new T.Mesh(new T.CylinderGeometry(.34, .38, .4, 40), new T.MeshStandardMaterial({ color: 0xc9c5bb, metalness: .9, roughness: .2 }))
    pivotBase.position.y = .12; pivotBase.castShadow = true; pivot.add(pivotBase)
    const pivotCap = new T.Mesh(new T.CylinderGeometry(.2, .2, .14, 32), new T.MeshStandardMaterial({ color: 0x9a968e, metalness: .85, roughness: .25 }))
    pivotCap.position.y = .36; pivot.add(pivotCap)
    const arm = new T.Group(); arm.position.y = .34; pivot.add(arm)
    const tube = new T.Mesh(new T.CylinderGeometry(.045, .055, 3.8, 20), new T.MeshStandardMaterial({ color: 0xdcd8cd, metalness: .95, roughness: .15 }))
    tube.rotation.z = Math.PI / 2; tube.position.x = -1.9; tube.castShadow = true; arm.add(tube)
    const head = new T.Mesh(new T.BoxGeometry(.55, .18, .28), new T.MeshStandardMaterial({ color: 0xe27f58, metalness: .3, roughness: .4 }))
    head.position.x = -3.8; head.castShadow = true; arm.add(head)
    const needle = new T.Mesh(new T.ConeGeometry(.045, .24, 12), new T.MeshStandardMaterial({ color: 0x2b2b2b, metalness: .6 }))
    needle.position.set(-3.8, -.18, 0); needle.rotation.z = Math.PI; arm.add(needle)
    const counter = new T.Mesh(new T.CylinderGeometry(.17, .17, .4, 24), new T.MeshStandardMaterial({ color: 0x45423d, metalness: .75, roughness: .3 }))
    counter.rotation.z = Math.PI / 2; counter.position.x = .35; arm.add(counter)

    // Controles metálicos
    const btnMat = new T.MeshStandardMaterial({ color: 0xded6c7, metalness: .75, roughness: .3 })
    for (let i = 0; i < 3; i++) {
      const b = new T.Mesh(new T.CylinderGeometry(.16, .16, .13, 28), btnMat)
      b.position.set(2.7, .04, .5 + i * .62); b.castShadow = true; root.add(b)
    }
    const led = new T.Mesh(new T.SphereGeometry(.08, 20, 20), new T.MeshStandardMaterial({ color: 0xff9259, emissive: 0xff6a2a, emissiveIntensity: 1.4 }))
    led.position.set(3.15, .04, -.85); root.add(led)

    const shadow = new T.Mesh(new T.PlaneGeometry(14, 12), new T.ShadowMaterial({ opacity: .22 }))
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.66; shadow.receiveShadow = true; scene.add(shadow)

    let appear = 0, armAngle = 0, drop = 0, spin = 0
    let lastArt = artUrl

    return {
      animate(t, dt) {
        if (lastArt !== artUrl) {
          lastArt = artUrl
          label.material.map?.dispose()
          labelTex = labelTexture(artUrl || '', titleRef.current)
          label.material.map = labelTex; label.material.needsUpdate = true
          appear = 0
        }
        appear = Math.min(1, appear + dt * 1.8)
        const e = 1 - Math.pow(1 - appear, 3)
        discGroup.scale.setScalar(.25 + .75 * e)
        discGroup.position.y = .09 - (1 - e) * .4

        const on = playingRef.current
        // O disco gira somente enquanto há reprodução real
        // 33⅓ RPM ≈ 3.49 rad/s — gira junto com o selo e o reflexo
        if (on) spin += dt * 3.49
        discGroup.rotation.y = -spin
        s.el.dataset.spin = spin.toFixed(2)
        s.el.dataset.playing = on ? 'true' : 'false'

        // Braço em 0 = agulha sobre o disco; ângulo negativo = braço no apoio
        const targetArm = on ? 0 : -.66
        armAngle += (targetArm - armAngle) * Math.min(1, dt * 2.4)
        arm.rotation.y = armAngle
        const targetDrop = on ? -.18 : 0
        drop += (targetDrop - drop) * Math.min(1, dt * 3.2)
        needle.position.y = -.18 + drop * .6
        head.position.y = drop * .32
        led.material.emissiveIntensity = on ? 1.3 + Math.sin(t*3)*.5 : .25
        controls.update()
      },
      dispose() { controls.dispose(); wood.dispose(); groove.dispose(); labelTex.dispose() }
    }
  }, [artUrl, compact])

  return <div className="canvas-host" ref={ref} />
}
