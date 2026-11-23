/* Efeitos sonoros sintetizados com Web Audio — sem arquivos externos */
let ctx = null
let volume = 0.35
let enabled = true

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setSoundVolume(v) { volume = Math.max(0, Math.min(1, v)) }
export function setSoundEnabled(v) { enabled = !!v }
export function getSoundState() { return { enabled, volume } }

function tone(freq, dur, type = 'sine', gain = 0.2, delay = 0) {
  const c = ensure()
  if (!c || !enabled || volume <= 0) return
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * volume), t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g); g.connect(c.destination)
  osc.start(t); osc.stop(t + dur + 0.02)
}

export const sfx = {
  click: () => tone(520, 0.07, 'sine', 0.14),
  nav: () => { tone(420, 0.08, 'sine', 0.12); tone(620, 0.09, 'sine', 0.1, 0.06) },
  open: () => { tone(330, 0.1, 'sine', 0.14); tone(495, 0.12, 'sine', 0.11, 0.07); tone(660, 0.14, 'sine', 0.08, 0.14) },
  close: () => { tone(480, 0.09, 'sine', 0.11); tone(320, 0.11, 'sine', 0.09, 0.06) },
  confirm: () => { tone(660, 0.09, 'sine', 0.13); tone(880, 0.13, 'sine', 0.1, 0.08) },
  error: () => { tone(220, 0.16, 'triangle', 0.12); tone(180, 0.18, 'triangle', 0.1, 0.1) },
  play: () => { tone(392, 0.08, 'sine', 0.12); tone(523, 0.14, 'sine', 0.1, 0.07) },
  hover: () => tone(720, 0.035, 'sine', 0.05),
  purr: () => { for (let i = 0; i < 6; i++) tone(90 + Math.random() * 20, 0.12, 'triangle', 0.07, i * 0.09) },
  bubble: () => tone(800 + Math.random() * 300, 0.06, 'sine', 0.05)
}
