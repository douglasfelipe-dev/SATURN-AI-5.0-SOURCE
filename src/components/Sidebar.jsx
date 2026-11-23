import React from 'react'
import { Home, LayoutDashboard, Music2, Clapperboard, BookOpen, Images, FolderOpen, Video, StickyNote, BarChart3, User, Palette, Settings2, ChevronRight, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'

export const NAV_GROUPS = [
  { label: 'HOME', items: [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'environment', label: 'Meu Ambiente', icon: LayoutDashboard },
    { id: 'music', label: 'Música', icon: Music2 },
    { id: 'cinema', label: 'Cinema', icon: Clapperboard }
  ]},
  { label: 'BIBLIOTECA', items: [
    { id: 'books', label: 'Livros', icon: BookOpen },
    { id: 'gallery', label: 'Galeria de fotos', icon: Images },
    { id: 'files', label: 'Arquivos', icon: FolderOpen },
    { id: 'videos', label: 'Vídeos', icon: Video },
    { id: 'localmusic', label: 'Músicas locais', icon: Music2 }
  ]},
  { label: 'ORGANIZAÇÃO', items: [
    { id: 'notes', label: 'Notas', icon: StickyNote },
    { id: 'stats', label: 'Estatísticas', icon: BarChart3 }
  ]},
  { label: 'SISTEMA', items: [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'themes', label: 'Temas', icon: Palette },
    { id: 'settings', label: 'Configurações', icon: Settings2 }
  ]}
]

export default function Sidebar({ active, onNavigate, collapsed, setCollapsed }) {
  return (
    <aside className={cx('sidebar', collapsed && 'collapsed')}>
      <div className="brand">
        <div className="brand-logo"><Sparkles size={22} /></div>
        <div className="brand-text"><b>SATURN.AI</b><span>dashboard · v5.0</span></div>
      </div>
      <div className="nav-scroll">
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <div className="nav-group-title">{g.label}</div>
            {g.items.map(it => {
              const Icon = it.icon
              return (
                <button key={it.id} title={it.label}
                  className={cx('nav-item', active === it.id && 'active')}
                  onClick={() => { sfx.nav(); onNavigate(it.id) }}>
                  <span className="nav-ico"><Icon size={18} strokeWidth={2} /></span>
                  <span className="nav-label">{it.label}</span>
                  <ChevronRight className="chevron" size={14} />
                </button>
              )
            })}
          </div>
        ))}
        <div className="dev-signature" aria-label="Assinatura do desenvolvedor">
          <b>douglasfelipe.dev</b><span>CREATOR</span>
        </div>
      </div>
      <button className="collapse-btn" onClick={() => { sfx.click(); setCollapsed(!collapsed) }} title={collapsed ? 'Expandir' : 'Recolher'}>
        {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>
    </aside>
  )
}
