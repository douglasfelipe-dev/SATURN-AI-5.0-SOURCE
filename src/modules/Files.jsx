import React, { useEffect, useState } from 'react'
import { Upload, Search, Star, Trash2, Copy, Move, FolderOpen, FolderPlus, FileText, Image as ImageIcon, Film, Music2, File as FileIcon, Info, ChevronRight, Home, Pencil, X, Folder, ArrowLeft } from 'lucide-react'
import { api, all, run, get, value, now, logEvent, mediaUrl } from '../lib/db'
import { sfx } from '../lib/sound'
import { fmtBytes, cx } from '../lib/utils'
import { Modal, Confirm, Empty } from '../components/common'

const EXT_IMG = ['jpg','jpeg','png','gif','webp','bmp','svg']
const EXT_VID = ['mp4','mkv','avi','mov','webm','m4v']
const EXT_AUD = ['mp3','wav','ogg','m4a','flac']

function iconFor(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase()
  if (EXT_IMG.includes(ext)) return <ImageIcon size={18}/>
  if (EXT_VID.includes(ext)) return <Film size={18}/>
  if (EXT_AUD.includes(ext)) return <Music2 size={18}/>
  if (['pdf','doc','docx','txt','xls','xlsx'].includes(ext)) return <FileText size={18}/>
  return <FileIcon size={18}/>
}
function colorFor(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase()
  return { pdf:'#e8c4b8', png:'#c7dec9', jpg:'#c7dec9', jpeg:'#c7dec9', webp:'#c7dec9', mp3:'#d9cef0', mp4:'#c9d9ef', txt:'#eee0bd', docx:'#c5d7ef', zip:'#e4d3c0' }[ext] || '#e9e2d6'
}
const join = (...p) => p.filter(Boolean).join('\\')

export default function Files({ onToast }) {
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState(0)
  const [query, setQuery] = useState('')
  const [fav, setFav] = useState(false)
  const [sort, setSort] = useState('name')
  const [over, setOver] = useState(false)
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [props, setProps] = useState(null)
  const [busy, setBusy] = useState(false)
  const [library, setLibrary] = useState('')

  const load = async () => {
    setFiles(await all('SELECT * FROM files ORDER BY added_at DESC'))
    setFolders(await all('SELECT * FROM folders ORDER BY id'))
    const p = await api.app.paths()
    setLibrary(p.files)
  }
  useEffect(() => { load() }, [])

  const current = folders.find(f => f.id === folder)
  const folderPath = f => f ? (f.path || join(library, f.name)) : library
  const currentPath = folderPath(current)

  const importFiles = async (paths) => {
    if (!paths.length) return
    setBusy(true)
    try {
      const copied = await api.app.copyFiles(paths, 'files')
      for (const f of copied) {
        if (f.error) continue
        let finalPath = f.path
        if (currentPath) {
          const dest = join(currentPath, f.name)
          const r = await api.fs.op('move', { from: f.path, to: dest })
          if (r.ok) finalPath = r.path
        }
        if (!await get('SELECT id FROM files WHERE path=?', [finalPath])) {
          await run('INSERT INTO files (name,path,type,size,folder_id,favorite,added_at) VALUES (?,?,?,?,?,0,?)',
            [f.name, finalPath, f.name.split('.').pop()?.toLowerCase() || 'outro', f.size, folder || null, now()])
        }
      }
      logEvent('files', 'files_imported', `${copied.length} arquivo(s)`)
      sfx.confirm(); onToast?.(`${copied.length} arquivo(s) importado(s)`); await load()
    } catch (e) { sfx.error(); onToast?.('Erro ao importar: ' + e.message, 'error') }
    setBusy(false)
  }
  const pick = async () => {
    try { importFiles(await api.app.select({ multi: true, title: 'Importar arquivos' })) }
    catch (e) { onToast?.('Erro no seletor: ' + e.message, 'error') }
  }

  const createFolder = async () => {
    const name = (draft.name || '').trim()
    if (!name || /[\\/:*?"<>|]/.test(name)) { onToast?.('Nome de pasta inválido.', 'error'); return }
    const parentPath = currentPath || library
    const full = join(parentPath, name)
    const r = await api.fs.op('mkdir', { path: full })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    await run('INSERT INTO folders (name,parent_id,created_at,path) VALUES (?,?,?,?)', [name, folder || 0, now(), full])
    sfx.confirm(); setModal(null); setDraft({}); load()
  }

  const renameFolder = async () => {
    const name = (draft.name || '').trim()
    if (!name) return
    const oldPath = folderPath(draft.item)
    const newPath = join(folderPath(folders.find(f => f.id === draft.item.parent_id) || null), name)
    const r = await api.fs.op('rename', { from: oldPath, to: newPath })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    await run('UPDATE folders SET name=?,path=? WHERE id=?', [name, newPath, draft.item.id])
    const allF = await all('SELECT * FROM folders')
    for (const f of allF) {
      if (!f.path) continue
      if (f.path.startsWith(oldPath + '\\')) await run('UPDATE folders SET path=? WHERE id=?', [newPath + f.path.slice(oldPath.length), f.id])
    }
    const allFiles = await all('SELECT * FROM files')
    for (const file of allFiles) {
      if (file.path?.startsWith(oldPath + '\\')) await run('UPDATE files SET path=? WHERE id=?', [newPath + file.path.slice(oldPath.length), file.id])
    }
    sfx.confirm(); setModal(null); load()
  }

  const deleteFolder = async (f) => {
    const r = await api.fs.op('remove', { path: folderPath(f) })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    const descendantIds = [f.id]
    let changed = true
    while (changed) {
      changed = false
      for (const x of folders) if (!descendantIds.includes(x.id) && descendantIds.includes(x.parent_id)) { descendantIds.push(x.id); changed = true }
    }
    for (const id of descendantIds) {
      await run('DELETE FROM files WHERE folder_id=?', [id])
      await run('DELETE FROM folders WHERE id=?', [id])
    }
    if (descendantIds.includes(folder)) setFolder(0)
    sfx.close(); setConfirm(null); load()
  }

  const renameFile = async () => {
    const name = (draft.name || '').trim()
    if (!name) return
    const dir = draft.item.path.substring(0, draft.item.path.lastIndexOf('\\'))
    const newPath = join(dir, name)
    const r = await api.fs.op('rename', { from: draft.item.path, to: newPath })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    await run('UPDATE files SET name=?,path=?,type=? WHERE id=?', [name, newPath, name.split('.').pop()?.toLowerCase() || 'outro', draft.item.id])
    sfx.confirm(); setModal(null); load()
  }

  const moveFile = async (file, target) => {
    const dest = join(folderPath(folders.find(f => f.id === target) || null), file.name)
    const r = await api.fs.op('move', { from: file.path, to: dest })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    await run('UPDATE files SET path=?,folder_id=? WHERE id=?', [r.path, target || null, file.id])
    sfx.confirm(); setModal(null); load()
  }
  const copyFile = async (file) => {
    const dest = join(currentPath || library, `copia-${file.name}`)
    const r = await api.fs.op('copy', { from: file.path, to: dest })
    if (!r.ok) { onToast?.('Erro: ' + r.error, 'error'); return }
    await run('INSERT INTO files (name,path,type,size,folder_id,favorite,added_at) VALUES (?,?,?,?,?,0,?)',
      [`copia-${file.name}`, r.path, file.type, file.size, folder || null, now()])
    sfx.confirm(); load()
  }
  const deleteFile = async (f) => {
    await api.fs.op('remove', { path: f.path })
    await run('DELETE FROM files WHERE id=?', [f.id])
    sfx.close(); setConfirm(null); load()
  }

  let shown = files.filter(f => (!fav || f.favorite) && (folder ? f.folder_id === folder : !f.folder_id) &&
    (!query || f.name.toLowerCase().includes(query.toLowerCase())))
  shown = [...shown].sort((a,b) => sort === 'type' ? (a.type||'').localeCompare(b.type||'') : sort === 'size' ? b.size-a.size : sort === 'date' ? b.id-a.id : a.name.localeCompare(b.name))
  const subFolders = folders.filter(f => (folder ? f.parent_id === folder : !f.parent_id))
  const trail = []
  let cursor = current
  while (cursor) { trail.unshift(cursor); cursor = folders.find(f => f.id === cursor.parent_id) }

  return (
    <div className="page" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); importFiles(Array.from(e.dataTransfer.files).map(f => f.path)) }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><h1 className="page-title">Arquivos</h1><p className="page-sub">Gerenciador de pastas local · {files.length} arquivos</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={() => { setDraft({}); setModal('folder') }}><FolderPlus size={15}/> Nova pasta</button>
          <button className="btn primary" onClick={pick} disabled={busy}>{busy ? <span className="spin"><Upload size={15}/></span> : <Upload size={15}/>} Importar</button>
        </div>
      </div>

      <div className={cx('dropzone', over && 'over')} style={{ padding: 14, marginBottom: 14 }}><Upload size={18}/> Arraste arquivos para a pasta atual</div>

      <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="mini-btn" title="Voltar" onClick={() => setFolder(current?.parent_id || 0)}><ArrowLeft size={15}/></button>
        <button className="btn sm ghost" onClick={() => setFolder(0)}><Home size={14}/> Raiz</button>
        {trail.map(t => <React.Fragment key={t.id}><ChevronRight size={14} style={{ color:'var(--muted)' }}/><button className="btn sm ghost" onClick={() => setFolder(t.id)}>{t.name}</button></React.Fragment>)}
        <div style={{ marginLeft: 'auto', display:'flex', gap:8 }}>
          <input className="input" style={{ width: 170 }} placeholder="Pesquisar..." value={query} onChange={e => setQuery(e.target.value)}/>
          <select className="select" style={{ width: 120 }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">Nome</option><option value="type">Tipo</option><option value="size">Tamanho</option><option value="date">Data</option>
          </select>
          <button className={cx('btn sm', fav ? 'primary' : 'ghost')} onClick={() => setFav(!fav)}><Star size={13}/> Favoritos</button>
        </div>
      </div>

      {subFolders.length > 0 && <div className="folder-grid">{subFolders.map(f => <div key={f.id} className="folder-card">
        <Folder size={34} style={{ color:'#d6a86d' }} onClick={() => setFolder(f.id)} />
        <b style={{ fontSize: 12, flex: 1 }}>{f.name}</b>
        <button className="mini-btn" title="Renomear" onClick={() => { setDraft({ name: f.name, id: f.id, item: f }); setModal('rename-folder') }}><Pencil size={12}/></button>
        <button className="mini-btn" onClick={() => setConfirm({ kind: 'folder', item: f })}><Trash2 size={12}/></button>
      </div>)}</div>}

      {shown.length === 0 ? <Empty icon="📁" title="Pasta vazia"/> : <div>{shown.map(f => <div key={f.id} className="file-row">
        <span className="file-ico" style={{ background: colorFor(f.name) }}>{iconFor(f.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fname">{f.name}</div>
          <div className="fmeta">{f.type?.toUpperCase()} · {fmtBytes(f.size)}</div>
        </div>
        {EXT_IMG.includes(f.type) && <img src={mediaUrl(f.path)} alt="" className="file-thumb"/>}
        <button className="mini-btn" title="Favorito" onClick={async () => { await run('UPDATE files SET favorite=? WHERE id=?', [f.favorite?0:1, f.id]); sfx.click(); load() }}>
          <Star size={15} fill={f.favorite ? '#e9b45f':'none'} color={f.favorite?'#e9b45f':'currentColor'}/></button>
        <button className="mini-btn" title="Abrir" onClick={() => api.app.openPath(f.path)}><FolderOpen size={14}/></button>
        <button className="mini-btn" title="Renomear" onClick={() => { setDraft({ name: f.name, item: f }); setModal('rename-file') }}><Pencil size={14}/></button>
        <button className="mini-btn" title="Mover" onClick={() => { setDraft({ item: f }); setModal('move') }}><Move size={14}/></button>
        <button className="mini-btn" title="Copiar" onClick={() => copyFile(f)}><Copy size={14}/></button>
        <button className="mini-btn" title="Info" onClick={() => setProps(f)}><Info size={14}/></button>
        <button className="mini-btn" title="Excluir" onClick={() => setConfirm({ kind:'file', item: f })}><Trash2 size={14}/></button>
      </div>)}</div>}

      {modal === 'folder' && <Modal title="Nova pasta" onClose={() => setModal(null)} actions={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn primary" onClick={createFolder}>Criar</button></>}>
        <div className="field"><label>Nome da pasta</label><input className="input" autoFocus value={draft.name||''} onChange={e => setDraft({...draft,name:e.target.value})}/></div>
      </Modal>}
      {(modal === 'rename-folder' || modal === 'rename-file') && <Modal title="Renomear" onClose={() => setModal(null)} actions={<><button className="btn ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn primary" onClick={modal === 'rename-folder' ? renameFolder : renameFile}>Salvar</button></>}>
        <div className="field"><label>Novo nome</label><input className="input" autoFocus value={draft.name||''} onChange={e => setDraft({...draft,name:e.target.value})}/></div>
      </Modal>}
      {modal === 'move' && <Modal title="Mover para pasta" onClose={() => setModal(null)}>
        <button className="btn ghost" style={{ width:'100%', marginBottom:6 }} onClick={() => moveFile(draft.item, 0)}>Raiz</button>
        {folders.map(f => <button key={f.id} className="btn ghost" style={{ width:'100%', marginBottom:6 }} onClick={() => moveFile(draft.item, f.id)}>{f.name}</button>)}
      </Modal>}
      {props && <Modal title="Propriedades" onClose={() => setProps(null)}>
        <div style={{ fontSize:12.5, lineHeight:2 }}>
          <div><b>Nome:</b> {props.name}</div><div><b>Tipo:</b> {props.type}</div>
          <div><b>Tamanho:</b> {fmtBytes(props.size)}</div><div style={{ wordBreak:'break-all' }}><b>Caminho:</b> {props.path}</div>
        </div>
      </Modal>}
      {confirm && <Confirm title="Excluir" message={`Excluir “${confirm.item.name}” da biblioteca?`} danger onCancel={() => setConfirm(null)}
        onConfirm={() => confirm.kind === 'folder' ? deleteFolder(confirm.item) : deleteFile(confirm.item)}/>}
    </div>
  )
}
