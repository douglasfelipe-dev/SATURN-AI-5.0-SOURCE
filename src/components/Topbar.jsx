import React, { useState } from 'react'
import { Search, Moon, Sun, Bell, Minus, Square, X, ChevronRight, CheckCheck, Trash2, Search as SearchIcon } from 'lucide-react'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'

export default function Topbar({ breadcrumb, dark, onToggleDark, onOpenSearch, notifications = [], unread = 0, onReadAll, onClear, onNotificationClick }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>SATURN.AI Dashboard</span><ChevronRight size={13} />
        <b>{breadcrumb}</b>
      </div>
      <div className="topbar-right">
        <button className="search-trigger" onClick={() => { sfx.click(); onOpenSearch?.() }}>
          <Search size={16} /> <span>Buscar em tudo...</span> <kbd>Ctrl K</kbd>
        </button>
        <button className="icon-btn" onClick={() => { sfx.click(); onToggleDark?.() }} title={dark ? 'Modo claro' : 'Modo escuro'}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => { sfx.click(); setOpen(!open) }} title="Notificações">
            <Bell size={17} />{unread > 0 && <span className="dot" />}{unread > 0 && <span className="notif-count">{unread}</span>}
          </button>
          {open && <div className="notif-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ fontSize: 13 }}>Central de notificações</b>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="mini-btn" title="Marcar como lidas" onClick={() => onReadAll?.()}><CheckCheck size={15} /></button>
                <button className="mini-btn" title="Limpar" onClick={() => onClear?.()}><Trash2 size={15} /></button>
                <button className="mini-btn" onClick={() => setOpen(false)}><X size={15} /></button>
              </div>
            </div>
            {notifications.length === 0 ? <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Nenhuma notificação por enquanto.</div> :
              notifications.map(n => <button key={n.id} className={cx('notif-item', !n.read && 'unread')}
                onClick={() => { onNotificationClick?.(n); setOpen(false) }}>
                <b>{n.title}</b><span>{n.body}</span>
                <small>{new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>
              </button>)}
          </div>}
        </div>
        <div className="window-controls" style={{ marginLeft: 2 }}>
          <button className="win-btn" onClick={() => window.api.win.minimize()} title="Minimizar"><Minus size={15} /></button>
          <button className="win-btn" onClick={() => window.api.win.toggle()} title="Maximizar"><Square size={13} /></button>
          <button className="win-btn close" onClick={() => window.api.win.close()} title="Fechar"><X size={16} /></button>
        </div>
      </div>
    </header>
  )
}
