import React from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'

export function Modal({ title, subtitle, onClose, children, actions, width }) {
  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) { sfx.close(); onClose?.() } }}>
      <div className="modal" style={width ? { width } : undefined}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h3>{title}</h3>{subtitle && <p className="m-sub">{subtitle}</p>}</div>
          <button className="btn icon ghost" onClick={() => { sfx.close(); onClose?.() }}><X size={17} /></button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  )
}

export function Confirm({ title = 'Confirmar', message, onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel}
      actions={<>
        <button className="btn ghost" onClick={() => { sfx.close(); onCancel?.() }}>Cancelar</button>
        <button className={cx('btn', danger ? 'accent' : 'primary')} onClick={() => { sfx.confirm(); onConfirm?.() }}>
          <Check size={15} /> Confirmar
        </button>
      </>
      }>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{message}</p>
    </Modal>
  )
}

export function Toasts({ items }) {
  return <div className="toast-stack">{items.map(t => (
    <div key={t.id} className={cx('toast', t.type === 'error' && 'err')}>
      {t.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />} {t.text}
    </div>
  ))}</div>
}

export function Ring({ value, size = 48, color = '#e78c62' }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (value || 0) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#7c5340">{Math.round(value || 0)}%</text>
    </svg>
  )
}

export function Empty({ icon = '✦', title, children }) {
  return <div className="empty"><span className="em">{icon}</span><b>{title}</b>{children && <div style={{ marginTop: 6 }}>{children}</div>}</div>
}

export function StatCard({ icon, label, value, foot, color = 'green' }) {
  return (
    <div className={cx('stat-card', 'bg-' + color, 'hoverable')}>
      <div className="stat-ico">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

export function Switch({ on, onChange }) {
  return <button className={cx('switch', on && 'on')} onClick={() => onChange(!on)}><i /></button>
}

export function Progress({ value, onClick, onChange, color, height }) {
  const ref = React.useRef(null)
  const dragging = React.useRef(false)
  const pct = Math.max(0, Math.min(100, value || 0))
  const calc = clientX => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return 0
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }
  const emit = p => { (onChange || onClick)?.(p) }
  const down = e => {
    if (!onChange && !onClick) return
    e.preventDefault()
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    emit(calc(e.clientX))
  }
  const move = e => { if (dragging.current) emit(calc(e.clientX)) }
  const up = e => {
    if (!dragging.current) return
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  return (
    <div ref={ref} className={`progress interactive ${dragging.current ? 'dragging' : ''}`}
      style={height ? { height } : undefined}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClick={e => { if (!onChange && onClick) emit(calc(e.clientX)) }}
      role="slider" tabIndex={0} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); emit(Math.min(1, pct / 100 + 0.02)) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); emit(Math.max(0, pct / 100 - 0.02)) }
      }}>
      <i style={{ width: `${pct}%`, background: color }} />
      <b className="progress-knob" style={{ left: `${pct}%`, background: color }}/>
    </div>
  )
}

export function LineChart({ data = [], color = '#e78c62', height = 180 }) {
  if (!data.length) data = [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(...data, 1) * 1.15
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 600},${height - (v / max) * (height - 20) - 10}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L600,${height} L0,${height} Z`
  const id = 'grad' + Math.random().toString(36).slice(2, 8)
  return (
    <svg viewBox={`0 0 600 ${height}`} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".35" />
        <stop offset="100%" stopColor={color} stopOpacity=".02" />
      </linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={(i / Math.max(1, data.length - 1)) * 600} cy={height - (v / max) * (height - 20) - 10} r="3.5" fill="#fff" stroke={color} strokeWidth="2.5" />)}
    </svg>
  )
}
