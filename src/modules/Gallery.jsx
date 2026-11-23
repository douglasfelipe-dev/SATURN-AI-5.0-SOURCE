import React, { useEffect, useState } from 'react'
import { Upload, Search, Heart, Trash2, X, ZoomIn, ZoomOut, RotateCw, Play, Pause, ChevronLeft, ChevronRight, Images, FolderPlus, Maximize2 } from 'lucide-react'
import { api, all, run, value, now, logEvent, mediaUrl } from '../lib/db'
import { sfx } from '../lib/sound'
import { cx } from '../lib/utils'
import { Modal, Empty, Confirm } from '../components/common'

const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']

export default function Gallery({ onToast }) {
  const [photos, setPhotos] = useState([])
  const [albums, setAlbums] = useState([])
  const [album, setAlbum] = useState(0)
  const [query, setQuery] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [light, setLight] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [rot, setRot] = useState(0)
  const [slideshow, setSlideshow] = useState(false)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setPhotos(await all('SELECT * FROM photos ORDER BY added_at DESC'))
    setAlbums(await all('SELECT * FROM albums ORDER BY id'))
  }
  useEffect(() => { load() }, [])

  const importFiles = async (files) => {
    const imgs = files.filter(f => IMG_EXT.includes(f.split('.').pop().toLowerCase()))
    const invalid = files.length - imgs.length
    if (invalid) onToast?.(`${invalid} arquivo(s) com formato não suportado foram ignorados`, 'error')
    if (!imgs.length) return
    setBusy(true)
    const copied = await api.app.copyFiles(imgs, 'photos')
    let albumId = album || null
    if (!albumId) {
      const a = await all('SELECT id FROM albums WHERE name=?', ['Importados'])
      if (a.length) albumId = a[0].id
      else {
        await run('INSERT INTO albums (name,cover,created_at) VALUES (?,?,?)', ['Importados', '', now()])
        albumId = (await all('SELECT id FROM albums WHERE name=?', ['Importados']))[0].id
      }
    }
    for (const f of copied) {
      if (f.error) continue
      const dup = await value('SELECT id FROM photos WHERE path=?', [f.path], null)
      if (!dup) await run('INSERT INTO photos (path,name,album_id,favorite,taken_at,added_at) VALUES (?,?,?,0,?,?)', [f.path, f.name, albumId, now(), now()])
    }
    logEvent('gallery', 'photos_imported', `${copied.length} foto(s)`)
    sfx.confirm(); setBusy(false); load()
  }
  const pick = async () => {
    try {
      const files = await api.app.select({ multi: true, filters: [{ name: 'Imagens', extensions: IMG_EXT }], title: 'Importar fotos' })
      importFiles(files)
    } catch (e) { onToast?.('Erro no seletor: ' + e.message, 'error') }
  }
  const createAlbum = async () => {
    if (!draft.trim()) return
    await run('INSERT INTO albums (name,cover,created_at) VALUES (?,?,?)', [draft.trim(), '', now()])
    setDraft(''); setModal(false); sfx.confirm(); load()
  }
  const toggleFav = async p => { await run('UPDATE photos SET favorite=? WHERE id=?', [p.favorite ? 0 : 1, p.id]); sfx.click(); load() }
  const movePhoto = async (photoId, alb) => { await run('UPDATE photos SET album_id=? WHERE id=?', [alb || null, photoId]); load() }

  const shown = photos.filter(p => (!album || p.album_id === album) && (!favOnly || p.favorite) &&
    (!query || p.name.toLowerCase().includes(query.toLowerCase())))

  const openLight = p => { setLight(p); setZoom(1); setRot(0); sfx.open() }
  const navigate = dir => {
    const i = shown.findIndex(x => x.id === light.id)
    const n = (i + dir + shown.length) % shown.length
    setLight(shown[n]); setZoom(1); setRot(0)
  }
  useEffect(() => {
    if (!slideshow || !light) return
    const t = setInterval(() => navigate(1), 3000)
    return () => clearInterval(t)
  }, [slideshow, light])

  return (
    <div className="page" onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); importFiles(Array.from(e.dataTransfer.files).map(f => f.path)) }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><h1 className="page-title">Galeria de fotos</h1><p className="page-sub">{photos.length} fotos na sua biblioteca · os originais permanecem intactos</p></div>
        <button className="btn primary" onClick={pick} disabled={busy}>{busy ? <span className="spin"><Upload size={16} /></span> : <Upload size={16} />} Importar fotos</button>
      </div>

      <div className="dropzone" style={{ marginBottom: 16, padding: 18 }}><Images size={22} /> Arraste fotos ou pastas para cá · elas serão copiadas para a biblioteca do Douglas Felipe.DEV</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div className="chip-row">
          <button className={`chip ${album === 0 ? 'active' : ''}`} onClick={() => setAlbum(0)}>Todas</button>
          {albums.map(a => <button key={a.id} className={`chip ${album === a.id ? 'active' : ''}`} onClick={() => setAlbum(a.id)}>{a.name}</button>)}
          <button className="chip" onClick={() => setModal(true)}><FolderPlus size={13} /> Novo álbum</button>
        </div>
        <input className="input" style={{ width: 200, marginLeft: 'auto' }} placeholder="Buscar foto..." value={query} onChange={e => setQuery(e.target.value)} />
        <button className={`btn sm ${favOnly ? 'primary' : 'ghost'}`} onClick={() => setFavOnly(!favOnly)}><Heart size={13} /> Favoritos</button>
      </div>

      {shown.length === 0 ? <Empty icon="📷" title="Nenhuma foto encontrada">Importe fotos do seu computador para começar.</Empty> :
        <div className="media-grid">{shown.map(p => <div key={p.id} className="media-card" onClick={() => openLight(p)}>
          <img src={mediaUrl(p.path)} alt={p.name} onError={e => { e.currentTarget.style.opacity = '.2' }} />
          <button className="fav" onClick={e => { e.stopPropagation(); toggleFav(p) }}><Heart size={14} fill={p.favorite ? '#e78c62' : 'none'} color={p.favorite ? '#e78c62' : 'currentColor'} /></button>
          <button className="media-del" title="Excluir" onClick={e => { e.stopPropagation(); setConfirm(p) }}><Trash2 size={13}/></button>
          <div className="cap">{p.name}</div>
        </div>)}</div>}

      {light && <div className="lightbox" onClick={e => { if (e.target === e.currentTarget) setLight(null) }}>
        <button className="lb-btn" style={{ left: 20 }} onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <button className="lb-btn" style={{ right: 20 }} onClick={() => navigate(1)}><ChevronRight size={22} /></button>
        <img src={mediaUrl(light.path)} alt={light.name}
          style={{ transform: `scale(${zoom}) rotate(${rot}deg)` }} />
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: 8, borderRadius: 16, background: 'rgba(255,255,255,.12)' }}>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => setZoom(z => Math.max(.3, z - .2))}><ZoomOut size={18} /></button>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => setZoom(z => Math.min(5, z + .2))}><ZoomIn size={18} /></button>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => setRot(r => (r + 90) % 360)}><RotateCw size={18} /></button>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => { setSlideshow(!slideshow); sfx.click() }}>{slideshow ? <Pause size={18} /> : <Play size={18} />}</button>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => window.api.app.openPath(light.path)}><Maximize2 size={18} /></button>
          <button className="lb-btn" style={{ position: 'static' }} onClick={() => setLight(null)}><X size={18} /></button>
        </div>
        <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff', fontSize: 12 }}>{light.name}</div>
      </div>}

      {modal && <Modal title="Novo álbum" onClose={() => setModal(false)}
        actions={<><button className="btn ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn primary" onClick={createAlbum}>Criar</button></>}>
        <div className="field"><label>Nome do álbum</label><input className="input" autoFocus value={draft} onChange={e => setDraft(e.target.value)} /></div>
      </Modal>}
      {confirm && <Confirm title="Remover foto" message="Remover esta foto da galeria? O arquivo original não será apagado." danger
        onCancel={() => setConfirm(null)} onConfirm={async () => { await run('DELETE FROM photos WHERE id=?', [confirm.id]); setConfirm(null); load() }} />}
    </div>
  )
}
