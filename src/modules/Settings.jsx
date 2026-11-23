import React, { useEffect, useState } from 'react'
import { Palette, Volume2, Sparkles, Monitor, HardDrive, Database, Download, Upload, RefreshCw, FileText, Check, Moon, Sun } from 'lucide-react'
import { api, THEMES } from '../lib/db'
import { setSoundVolume, setSoundEnabled } from '../lib/sound'
import { sfx } from '../lib/sound'
import { Switch, Confirm } from '../components/common'

export default function Settings({ settings, update, onToast, onRestart }) {
  const [paths, setPaths] = useState({})
  const [confirmRestore, setConfirmRestore] = useState(null)
  const [custom, setCustom] = useState({ primary: settings.primary || '#4F8B62', secondary: settings.secondary || '#A7BC9B', bg: settings.bg || '#F7F1E8' })

  useEffect(() => { api.app.paths().then(setPaths) }, [])
  useEffect(() => { setSoundVolume(settings.soundVolume ?? .35); setSoundEnabled(settings.soundEnabled !== false) }, [settings.soundVolume, settings.soundEnabled])

  const pickStorage = async () => {
    const dirs = await api.app.select({ directory: true, title: 'Escolher pasta da biblioteca' })
    if (!dirs.length) return
    const r = await api.app.setStorage(dirs[0])
    if (r.ok) { update('storagePath', dirs[0]); setPaths(await api.app.paths()); sfx.confirm(); onToast('Local de armazenamento alterado') }
    else onToast(r.error, 'error')
  }
  const backup = async () => {
    const r = await api.db.backup()
    if (r.ok) { sfx.confirm(); onToast(`Backup salvo em ${r.path}`) }
    else onToast(r.error, 'error')
  }
  const restore = async () => {
    const files = await api.app.select({ filters: [{ name: 'Backup SQLite', extensions: ['sqlite', 'db'] }], title: 'Restaurar backup' })
    if (files.length) setConfirmRestore(files[0])
  }

  return (
    <div className="page">
      <div className="page-head"><h1 className="page-title">Configurações</h1><p className="page-sub">Personalize cada detalhe do seu universo digital</p></div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Aparência</h3><Palette size={18} style={{ color: 'var(--primary)' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {Object.entries(THEMES).map(([key, t]) => <button key={key} onClick={() => { sfx.click(); update('theme', key) }} title={t.name}
              className="theme-swatch" style={{ background: `linear-gradient(135deg, ${t.primary} 0 45%, ${t.bg} 45% 75%, ${t.accent} 75%)`, border: settings.theme === key ? '3px solid var(--primary)' : '3px solid transparent' }} />)}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>{THEMES[settings.theme]?.name || 'Verde sálvia'}</p>

          <div className="settings-row" style={{ marginTop: 14 }}><div className="s-info"><b>Modo escuro</b><small>Tema escuro para ambientes com pouca luz</small></div>
            <Switch on={!!settings.dark} onChange={v => update('dark', v)} /></div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
            <b style={{ fontSize: 12 }}>Tema personalizado</b>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[['primary', 'Principal'], ['secondary', 'Secundária'], ['bg', 'Fundo'], ['accent', 'Destaque']].map(([k, l]) => (
                <div key={k} style={{ flex: 1 }}><small style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</small>
                  <input type="color" style={{ width: '100%', height: 36, border: 0, background: 'none' }}
                    value={custom[k]} onChange={e => { const c = { ...custom, [k]: e.target.value }; setCustom(c); update(k, e.target.value); update('theme', 'custom') }} /></div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Sons e animações</h3><Volume2 size={18} style={{ color: 'var(--primary)' }} /></div>
          <div className="settings-row"><div className="s-info"><b>Efeitos sonoros</b><small>Cliques, navegação e confirmações</small></div>
            <Switch on={settings.soundEnabled !== false} onChange={v => update('soundEnabled', v)} /></div>
          <div className="field" style={{ marginTop: 14 }}><label>Volume dos efeitos: {Math.round((settings.soundVolume ?? .35) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={settings.soundVolume ?? .35}
              onChange={e => update('soundVolume', +e.target.value)} style={{ width: '100%' }} /></div>
          <div className="field"><label>Intensidade das animações: {settings.animation ?? 100}%</label>
            <input type="range" min="0" max="200" step="10" value={settings.animation ?? 100}
              onChange={e => update('animation', +e.target.value)} style={{ width: '100%' }} /></div>
          <div className="settings-row"><div className="s-info"><b>Barra lateral recolhida</b><small>Lembrar da última configuração</small></div>
            <Switch on={!!settings.sidebarCollapsed} onChange={v => update('sidebarCollapsed', v)} /></div>
        </div>

        <div className="card">
          <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Desempenho</h3><Monitor size={18} style={{ color: 'var(--primary)' }} /></div>
          <div className="field"><label>Qualidade gráfica</label>
            <select className="select" value={settings.quality || 'alta'} onChange={e => update('quality', e.target.value)}>
              <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="ultra">Ultra</option>
            </select></div>
          <div className="field"><label>Limite de quadros (FPS): {settings.maxFps || 60}</label>
            <input type="range" min="30" max="144" step="10" value={settings.maxFps || 60}
              onChange={e => update('maxFps', +e.target.value)} style={{ width: '100%' }} /></div>
          <div className="settings-row"><div className="s-info"><b>Iniciar com o Windows</b><small>Abrir o Douglas Felipe.DEV automaticamente</small></div>
            <Switch on={!!settings.autoLaunch} onChange={async v => { update('autoLaunch', v); await api.app.autoLaunch(v) }} /></div>
        </div>

        <div className="card">
          <div className="section-head" style={{ margin: '0 0 12px' }}><h3>Armazenamento e dados</h3><HardDrive size={18} style={{ color: 'var(--primary)' }} /></div>
          <div style={{ fontSize: 11.5, lineHeight: 2, wordBreak: 'break-all', color: 'var(--muted)' }}>
            <div><b>Biblioteca:</b> {paths.library || '...'}</div>
            <div><b>Banco de dados:</b> {paths.dbFile || '...'}</div>
            <div><b>Fotos:</b> {paths.photos || '...'}</div>
            <div><b>Livros:</b> {paths.books || '...'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn sm ghost" onClick={pickStorage}><HardDrive size={14} /> Alterar pasta</button>
            <button className="btn sm ghost" onClick={backup}><Download size={14} /> Fazer backup</button>
            <button className="btn sm ghost" onClick={restore}><Upload size={14} /> Restaurar</button>
            <button className="btn sm ghost" onClick={onRestart}><RefreshCw size={14} /> Reiniciar</button>
          </div>
          <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => window.api.app.docs()}>
            <FileText size={14} /> Abrir documentação
          </button>
        </div>
      </div>

      {confirmRestore && <Confirm title="Restaurar backup" message="Isso substituirá o banco de dados atual. Deseja continuar?" danger
        onCancel={() => setConfirmRestore(null)} onConfirm={async () => {
          const r = await api.db.restore(confirmRestore)
          if (r.ok) { sfx.confirm(); onToast('Backup restaurado. Reinicie o aplicativo.'); onRestart() }
          else onToast(r.error, 'error')
          setConfirmRestore(null)
        }} />}
    </div>
  )
}
