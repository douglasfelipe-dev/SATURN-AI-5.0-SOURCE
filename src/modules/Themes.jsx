import React, { useEffect, useState } from 'react'
import { Palette, Check, Save, Trash2, RotateCcw, Moon, Sun, Sparkles } from 'lucide-react'
import { all, run, THEMES, now } from '../lib/db'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'
import { Modal, Confirm } from '../components/common'

const PRESETS = {
  claro: { name: 'Claro', primary: '#4F8B62', secondary: '#A7BC9B', bg: '#F7F1E8', card: '#FFFFFF', accent: '#ECAA89', sidebar: '#AABDA0', text: '#3D3730', dark: false },
  escuro: { name: 'Escuro', primary: '#6FB183', secondary: '#4A6152', bg: '#1E211F', card: '#2C312D', accent: '#D9A06E', sidebar: '#354038', text: '#EEF1EC', dark: true },
  verde: { name: 'Verde natural', primary: '#3E8E5A', secondary: '#9CCFAE', bg: '#F1F7F1', card: '#FFFFFF', accent: '#F0C87A', sidebar: '#9CC4A2', text: '#31453A', dark: false },
  minimalista: { name: 'Minimalista', primary: '#6B7280', secondary: '#D1D5DB', bg: '#FAFAF9', card: '#FFFFFF', accent: '#A8B5A2', sidebar: '#E5E7EB', text: '#292524', dark: false },
  elegante: { name: 'Elegante', primary: '#7C5C3E', secondary: '#C8B49B', bg: '#F6F1E9', card: '#FFFDF9', accent: '#B08D57', sidebar: '#D8C8B0', text: '#3E3128', dark: false },
  noturno: { name: 'Noturno', primary: '#7C6BB0', secondary: '#4A416E', bg: '#171622', card: '#242238', accent: '#C39BE8', sidebar: '#2E2A45', text: '#ECE9F5', dark: true },
  vintage: { name: 'Vintage', primary: '#A76B4F', secondary: '#D9B58C', bg: '#F3E9D6', card: '#FBF4E6', accent: '#C98255', sidebar: '#CDB590', text: '#4A372A', dark: false }
}
const KEYS = [['primary','Cor principal'],['secondary','Cor secundária'],['bg','Fundo principal'],['card','Cartões'],['accent','Destaque'],['sidebar','Barra lateral'],['text','Textos']]

function Preview({ c }) {
  return <div className="theme-preview" style={{ background: c.bg }}>
    <div className="tp-side" style={{ background: c.sidebar }}><i style={{ background: c.primary }} /><i /><i /><i /></div>
    <div className="tp-main">
      <div className="tp-title" style={{ background: c.text }} />
      <div className="tp-hero" style={{ background: c.accent }}>
        <div className="tp-circle" style={{ borderColor: c.primary }} />
        <div className="tp-lines"><i style={{ background: c.text }} /><i style={{ background: c.text }} /><i style={{ background: c.primary }} /></div>
      </div>
      <div className="tp-cards">{[c.card,c.card,c.card].map((x,i)=><div key={i} style={{ background: x }}><i style={{ background: c.secondary }} /></div>)}</div>
    </div>
  </div>
}

export default function Themes({ settings, update, onToast }) {
  const [saved, setSaved] = useState([])
  const [custom, setCustom] = useState(() => settings.customColors || { ...PRESETS.claro })
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const load = async () => setSaved(await all('SELECT * FROM themes ORDER BY id'))
  useEffect(() => { load() }, [])

  const apply = (c, themeKey) => {
    const obj = { ...c }
    update('customColors', obj)
    update('theme', themeKey || 'custom')
    update('dark', !!c.dark)
    setCustom(obj)
    sfx.confirm()
  }
  const applyPreset = ([key, c]) => {
    update('customColors', { ...c }); update('theme', key); update('dark', !!c.dark)
    setCustom({ ...c }); sfx.confirm()
  }
  const saveTheme = async () => {
    if (!name.trim()) { onToast('Digite um nome para o tema', 'error'); return }
    const colors = JSON.stringify({ ...custom, dark: !!settings.dark })
    await run('INSERT INTO themes (name,colors,created_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET colors=excluded.colors', [name.trim(), colors, now()])
    sfx.confirm(); setName(''); load(); onToast(`Tema “${name.trim()}” salvo`)
  }
  const updateTheme = async () => {
    if (!editing) return
    await run('UPDATE themes SET colors=? WHERE id=?', [JSON.stringify(custom), editing.id])
    setEditing(null); sfx.confirm(); load(); onToast('Tema atualizado')
  }
  const setKey = (k, v) => setCustom(c => ({ ...c, [k]: v }))
  const validHex = v => /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(v)

  return (
    <div className="page">
      <div className="page-head"><h1 className="page-title">Temas</h1><p className="page-sub">Escolha um tema, crie o seu e salve suas combinações favoritas</p></div>
      <div className="section-head"><h3>Temas pré-configurados</h3><small style={{ color: 'var(--muted)', fontSize: 11 }}>Clique para aplicar imediatamente</small></div>
      <div className="preset-grid">
        {Object.entries(PRESETS).map(([key, c]) => <button key={key} className={cx('preset', settings.theme === key && 'active')} onClick={() => applyPreset([key, c])}>
          <Preview c={c} />
          <div className="preset-label"><span>{c.dark ? <Moon size={13} /> : <Sun size={13} />} {c.name}</span>{settings.theme === key && <Check size={15} />}</div>
        </button>)}
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Personalização manual</h3><Palette size={18} style={{ color: 'var(--primary)' }} /></div>
          <div style={{ maxHeight: 420, overflow: 'auto', paddingRight: 6 }}>
            {KEYS.map(([key, label]) => <div className="color-row" key={key}>
              <label>{label}</label>
              <input type="color" value={validHex(custom[key]) ? custom[key] : '#ffffff'} onChange={e => setKey(key, e.target.value)} />
              <input className="input hex-input" value={custom[key] || ''} onChange={e => setKey(key, e.target.value)} placeholder="#RRGGBB" />
            </div>)}
            <div className="settings-row"><div className="s-info"><b>Modo escuro</b><small>Aplica ajustes de contraste</small></div>
              <button className={cx('switch', settings.dark && 'on')} onClick={() => update('dark', !settings.dark)}><i /></button></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn primary" onClick={() => apply(custom, 'custom')}><Check size={15} /> Aplicar</button>
            <button className="btn ghost" onClick={() => { const c = { ...PRESETS.claro }; setCustom(c); apply(c, 'claro') }}><RotateCcw size={15} /> Restaurar padrão</button>
          </div>
        </div>
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 14px' }}><h3>Prévia em tempo real</h3><Sparkles size={17} style={{ color: 'var(--primary)' }} /></div>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}><Preview c={custom} /></div>
          <div className="field" style={{ marginTop: 16 }}><label>Nome do tema personalizado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Meu tema verde" />
              <button className="btn primary" onClick={saveTheme}><Save size={15} /> Salvar</button>
            </div>
          </div>
          <div className="section-head" style={{ margin: '18px 0 8px' }}><h3>Meus temas salvos</h3><span className="chip">{saved.length}</span></div>
          {saved.length === 0 ? <div className="empty" style={{ padding: 18 }}>Nenhum tema salvo ainda.</div> : saved.map(t => {
            const c = JSON.parse(t.colors)
            return <div key={t.id} className="theme-saved">
              <div style={{ width: 42, height: 30, borderRadius: 8, background: c.primary, border: `3px solid ${c.bg}` }} />
              <b style={{ flex: 1, fontSize: 12.5 }}>{t.name}</b>
              <button className="btn sm ghost" onClick={() => { setCustom(c); setEditing(t); update('customColors', c); update('theme', 'custom'); update('dark', !!c.dark) }}>Editar</button>
              <button className="btn sm primary" onClick={() => { setCustom(c); apply(c, 'custom') }}>Aplicar</button>
              <button className="mini-btn" onClick={() => setConfirm(t)}><Trash2 size={13} /></button>
            </div>
          })}
          {editing && <button className="btn primary sm" style={{ marginTop: 10 }} onClick={updateTheme}>Salvar alterações do tema “{editing.name}”</button>}
        </div>
      </div>
      {confirm && <Confirm title="Excluir tema" message={`Excluir o tema “${confirm.name}”?`} danger onCancel={() => setConfirm(null)}
        onConfirm={async () => { await run('DELETE FROM themes WHERE id=?', [confirm.id]); setConfirm(null); load(); sfx.close() }} />}
    </div>
  )
}
