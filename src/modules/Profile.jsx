import React, { useEffect, useState } from 'react'
import { Save, User, Music2, BookOpen, Images, Clock3, Trophy } from 'lucide-react'
import { value, logEvent } from '../lib/db'
import { sfx } from '../lib/sound'
import { StatCard } from '../components/common'

/** Perfil — somente nome de exibição (upload de foto removido a pedido) */
export default function Profile({ settings, update, onToast }) {
  const [name, setName] = useState(settings.profileName || 'Douglas')
  const [stats, setStats] = useState({})

  useEffect(() => {
    ;(async () => {
      const [played, listen, books, photos] = await Promise.all([
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='song_played'", [], 0),
        value("SELECT COALESCE(SUM(value),0) v FROM stats WHERE type='listen_seconds'", [], 0),
        value('SELECT COUNT(*) c FROM books', [], 0),
        value('SELECT COUNT(*) c FROM photos', [], 0)
      ])
      setStats({ played, listen, books, photos })
    })()
  }, [])

  const save = () => {
    const clean = (name || '').trim()
    if (!clean) { onToast?.('O nome não pode ficar vazio.', 'error'); return }
    update('profileName', clean)
    if (settings.avatar) update('avatar', '') // remove referência de foto antiga
    logEvent('profile', 'name_changed', clean)
    sfx.confirm()
    onToast?.('Nome salvo com sucesso')
  }

  return (
    <div className="page">
      <div className="page-head"><h1 className="page-title">Perfil</h1><p className="page-sub">Seu nome de exibição e suas estatísticas</p></div>
      <div className="grid grid-2">
        <div className="card">
          <div style={{ width: 76, height: 76, borderRadius: 24, background: 'var(--primary-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <User size={40} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>Nome de exibição</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()} placeholder="Seu nome" />
          </div>
          <button className="btn primary" onClick={save}><Save size={15} /> Salvar nome</button>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>O nome aparece na saudação da página inicial.</p>
        </div>
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Suas estatísticas</h3><Trophy size={18} style={{ color: 'var(--accent)' }} /></div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <StatCard color="green" icon={<Music2 size={16} />} label="Músicas tocadas" value={stats.played || 0} />
            <StatCard color="yellow" icon={<Clock3 size={16} />} label="Horas ouvidas" value={((stats.listen || 0) / 3600).toFixed(1)} />
            <StatCard color="coral" icon={<BookOpen size={16} />} label="Livros" value={stats.books || 0} />
            <StatCard color="blue" icon={<Images size={16} />} label="Fotos" value={stats.photos || 0} />
          </div>
        </div>
      </div>
    </div>
  )
}
