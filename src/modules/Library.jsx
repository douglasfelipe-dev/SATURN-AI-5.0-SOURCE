import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Upload, Search, Heart, Trash2, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Moon, Sun, Bookmark, StickyNote, FolderPlus, RotateCw, Maximize2, BookOpen, Box } from 'lucide-react'
import { api, all, run, get, now, logEvent, mediaUrl } from '../lib/db'
import { useThreeScene } from '../lib/useThree'
import { sfx } from '../lib/sound'
import { colorFrom, cx } from '../lib/utils'
import { Modal, Confirm, Empty } from '../components/common'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const CATEGORIES = ['Terror', 'Fantasia', 'Suspense', 'Romance', 'Ficção científica', 'Outros']
const ALL_CATS = ['Terror', 'Romance', 'Fantasia', 'Ficção científica', 'Suspense', 'História', 'Tecnologia', 'Outros']

/* ---------- Visualizador 3D de um livro ---------- */
function BookViewer({ book, onClose }) {
  const controlsRef = useRef(null)
  const groupRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const { ref } = useThreeScene((s) => {
    const { THREE: T, scene, camera, renderer } = s
    camera.position.set(0, 0.2, 4.0)
    scene.add(new T.AmbientLight(0xffffff, 1.9))
    const key = new T.DirectionalLight(0xffffff, 2.0); key.position.set(3, 5, 5); scene.add(key)
    const fill = new T.DirectionalLight(0xffe6c8, 1.1); fill.position.set(-4, 1, 3); scene.add(fill)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = .08
    controls.enablePan = false; controls.minDistance = 1.6; controls.maxDistance = 9
    controlsRef.current = controls

    const group = new T.Group(); group.rotation.set(-0.15, 0.35, 0); scene.add(group)
    groupRef.current = group
    const W = 1.55, H = 2.25, D = .22
    const pages = new T.Mesh(
      new T.BoxGeometry(W - .06, H - .06, D - .02),
      new T.MeshStandardMaterial({ color: 0xf6f1e6, roughness: .95 })
    )
    group.add(pages)
    const coverMat = new T.MeshStandardMaterial({ color: book.cover ? 0xffffff : new T.Color(colorFrom(book.title)), roughness: .62, metalness: .02, side: T.DoubleSide })
    const front = new T.Mesh(new T.PlaneGeometry(W, H), coverMat); front.position.z = D / 2 + .012; group.add(front)
    const back = new T.Mesh(new T.PlaneGeometry(W, H), coverMat); back.position.z = -D / 2 - .012; back.rotation.y = Math.PI; group.add(back)
    const spine = new T.Mesh(
      new T.BoxGeometry(.07, H, D + .03),
      new T.MeshStandardMaterial({ color: colorFrom(book.title), roughness: .7 })
    )
    spine.position.x = -W / 2; group.add(spine)

    let tex = null
    if (book.cover) {
      // Carrega a capa como data URL via IPC — evita CORS e falhas de caminho
      api.app.readFile(book.cover).then(r => {
        if (!r.ok) return
        const url = 'data:image/png;base64,' + r.data
        new T.TextureLoader().load(url, loaded => {
          loaded.colorSpace = T.SRGBColorSpace
          loaded.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 4
          coverMat.map = loaded; coverMat.color.set(0xffffff); coverMat.needsUpdate = true
          tex = loaded
        })
      }).catch(() => {})
    }

    return {
      animate(t, dt) {
        controls.update()
        const g = groupRef.current
        if (g) {
          const target = targetRef.current
          g.rotation.x += ((-0.15 + target.x) - g.rotation.x) * Math.min(1, dt * 5)
          g.rotation.y += ((0.35 + target.y) - g.rotation.y) * Math.min(1, dt * 5)
        }
      },
      dispose() { controls.dispose(); tex?.dispose() }
    }
  }, [book.cover, book.id])

  const turn = (dx, dy) => { targetRef.current.y += dx; targetRef.current.x = Math.max(-1.2, Math.min(1.2, targetRef.current.x + dy)) }
  const zoom = delta => { const c = controlsRef.current; if (c) c.object.position.z = Math.max(1.6, Math.min(9, c.object.position.z + delta)) }

  return <div className="book-3d-view">
    <div className="book-3d-canvas" ref={ref} />
    <div className="book-3d-hint"><RotateCw size={13}/> Arraste para girar · scroll para zoom · botões abaixo inclinam</div>
    <div className="book-3d-controls">
      <button className="btn sm ghost" title="Girar para esquerda" onClick={() => turn(-0.5, 0)}>↶</button>
      <button className="btn sm ghost" title="Girar para direita" onClick={() => turn(0.5, 0)}>↷</button>
      <button className="btn sm ghost" title="Inclinar para cima" onClick={() => turn(0, -0.3)}>↑</button>
      <button className="btn sm ghost" title="Inclinar para baixo" onClick={() => turn(0, 0.3)}>↓</button>
      <button className="btn sm ghost" title="Aproximar" onClick={() => zoom(-.5)}><ZoomIn size={14}/></button>
      <button className="btn sm ghost" title="Afastar" onClick={() => zoom(.5)}><ZoomOut size={14}/></button>
      <button className="btn sm ghost" onClick={() => { targetRef.current = { x: 0, y: 0 }; controlsRef.current?.reset(); if (controlsRef.current) controlsRef.current.object.position.set(0, .2, 4) }}>Resetar</button>
    </div>
    <button className="btn icon ghost book-3d-close" onClick={onClose}><X size={18}/></button>
  </div>
}

/* ---------- Leitor de PDF ---------- */
function PdfReader({ book, onClose }) {
  const [doc, setDoc] = useState(null)
  const [page, setPage] = useState(book.last_page || 1)
  const [zoom, setZoom] = useState(2.0)
  const [theme, setTheme] = useState('light')
  const [fit, setFit] = useState(false)
  const [focus, setFocus] = useState(true)
  const [readerFull, setReaderFull] = useState(false)
  const viewerRef = useRef(null)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const canvasRef = useRef(null)
  const renderRef = useRef(0)
  const renderTaskRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await api.app.readFile(book.file_path)
        if (!r.ok) throw new Error(r.error)
        const bytes = Uint8Array.from(atob(r.data), c => c.charCodeAt(0))
        const d = await pdfjsLib.getDocument({ data: bytes }).promise
        if (!cancelled) {
          setDoc(d)
          setNotes(await all('SELECT * FROM annotations WHERE book_id=? ORDER BY id', [book.id]))
          try {
            const p0 = await d.getPage(1)
            const vp0 = p0.getViewport({ scale: 1 })
            setZoom(Math.min(3.5, Math.max(2.0, (window.innerWidth - 360) / vp0.width)))
          } catch (_) {}
        }
      } catch (e) { if (!cancelled) setError(e.message) }
    })()
    return () => { cancelled = true }
  }, [book.id])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    const id = ++renderRef.current
    setError('')
    ;(async () => {
      try {
        // Cancela e aguarda qualquer renderização anterior antes de reusar o canvas
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel() } catch (_) {}
          try { await renderTaskRef.current.promise } catch (_) {}
          renderTaskRef.current = null
        }
        const p = await doc.getPage(page)
        if (cancelled || id !== renderRef.current) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = p.getViewport({ scale: zoom * dpr })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height)
        canvas.style.width = Math.floor(viewport.width / dpr) + 'px'
        canvas.style.height = Math.floor(viewport.height / dpr) + 'px'
        const ctx = canvas.getContext('2d', { alpha: false })
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        const task = p.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
        if (!cancelled && id === renderRef.current) await run('UPDATE books SET last_page=? WHERE id=?', [page, book.id])
      } catch (e) {
        if (e?.name === 'RenderingCancelledException') return
        if (!cancelled) setError('Falha ao renderizar página: ' + e.message)
      }
    })()
    return () => { cancelled = true }
  }, [doc, page, zoom])

  // Navegação por teclado e zoom de ajuste à largura
  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight') setPage(p => Math.min(doc?.numPages || 1, p + 1))
      if (e.key === 'ArrowLeft') setPage(p => Math.max(1, p - 1))
      if ((e.ctrlKey || e.metaKey) && e.key === '+') { e.preventDefault(); setZoom(z => Math.min(4, z + .2)) }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(.5, z - .2)) }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [doc, onClose])

  const fitWidth = async () => {
    if (!doc) return
    const p = await doc.getPage(page)
    const vp0 = p.getViewport({ scale: 1 })
    const available = Math.max(400, window.innerWidth - 400)
    setZoom(Math.min(3, Math.max(.6, available / vp0.width)))
    setFit(true)
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    await run('INSERT INTO annotations (book_id,page,type,text,color,created_at) VALUES (?,?,?,?,?,?)', [book.id, page, 'nota', noteText, '#f0c97a', now()])
    setNoteText(''); setNotes(await all('SELECT * FROM annotations WHERE book_id=? ORDER BY id', [book.id])); sfx.confirm()
  }
  const bookmark = async () => {
    await run('INSERT INTO annotations (book_id,page,type,text,color,created_at) VALUES (?,?,?,?,?,?)', [book.id, page, 'marcador', `Página ${page}`, '#4f8b62', now()])
    setNotes(await all('SELECT * FROM annotations WHERE book_id=? ORDER BY id', [book.id])); sfx.confirm()
  }

  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) { await viewerRef.current?.requestFullscreen?.(); setReaderFull(true) }
      else { await document.exitFullscreen(); setReaderFull(false) }
    } catch (_) {}
  }

  return (
    <div className={`pdf-viewer ${focus ? 'reading-focus' : ''}`} ref={viewerRef}>
      <div className="pdf-toolbar">
        <button className="btn icon ghost" onClick={onClose}><X size={17}/></button>
        <b style={{ fontSize: 13, marginRight: 8 }}>{book.title}</b>
        <button className="btn sm ghost" onClick={() => setPage(Math.max(1, page - 1))} title="Página anterior (←)"><ChevronLeft size={15}/></button>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <input className="input" type="number" min="1" max={doc?.numPages || 1} value={page}
            onChange={e => setPage(Math.min(doc?.numPages || 1, Math.max(1, +e.target.value || 1)))}
            style={{ width:58, padding:'5px 6px', textAlign:'center' }}/>
          <span style={{ fontSize:12 }}>/ {doc?.numPages || '...'}</span>
        </div>
        <button className="btn sm ghost" onClick={() => setPage(Math.min(doc?.numPages || 1, page + 1))} title="Próxima página (→)"><ChevronRight size={15}/></button>
        <span className="sep"/>
        <button className="btn sm ghost" onClick={() => setZoom(z => Math.max(.5, z - .2))} title="Reduzir zoom"><ZoomOut size={15}/></button>
        <span style={{ fontSize:11, minWidth:44, textAlign:'center' }}>{Math.round(zoom*100)}%</span>
        <button className="btn sm ghost" onClick={() => setZoom(z => Math.min(4, z + .2))} title="Aumentar zoom"><ZoomIn size={15}/></button>
        <button className={`btn sm ${fit ? 'primary' : 'ghost'}`} onClick={fitWidth}>Ajustar largura</button>
        <button className="btn sm ghost" onClick={() => setZoom(1.6)}>100%</button>
        <button className="btn sm ghost" onClick={bookmark}><Bookmark size={14}/> Marcar</button>
        <button className={`btn sm ${focus ? 'primary' : 'ghost'}`} onClick={() => setFocus(f => !f)}>{focus ? '📖 Modo leitura' : '📝 Anotações'}</button>
        <button className="btn sm ghost" onClick={toggleFull}>{readerFull ? 'Sair da tela cheia' : 'Tela cheia'}</button>
        <span className="sep"/>
        {[['light','☀ Claro'],['sepia','◍ Sépia'],['dark','◐ Escuro']].map(([t,l]) => <button key={t} className={`btn sm ${theme === t ? 'primary' : 'ghost'}`} onClick={() => setTheme(t)}>{l}</button>)}
      </div>
      {error && <div style={{ color: '#fff', padding: 12 }}>{error}</div>}
      <div className={`pdf-pages ${theme}`}>
        <div className="pdf-canvas-wrap"><canvas ref={canvasRef}/></div>
        <div className="pdf-side">
          <b style={{ fontSize: 12 }}>Anotações</b>
          {notes.filter(n => n.type === 'marcador').map(n => <button key={n.id} className="btn sm ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setPage(n.page)}>Página {n.page}</button>)}
          {notes.filter(n => n.type === 'nota').map(n => <div key={n.id} className="pdf-note"><small>pág. {n.page}</small><div>{n.text}</div></div>)}
          <textarea className="textarea" style={{ minHeight: 70, marginTop: 10 }} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Nova anotação..."/>
          <button className="btn sm primary" style={{ width: '100%', marginTop: 6 }} onClick={addNote}><StickyNote size={13}/> Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Biblioteca ---------- */
export default function Library({ onToast }) {
  const [books, setBooks] = useState([])
  const [category, setCategory] = useState('Todos')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [reader, setReader] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [newCat, setNewCat] = useState('')

  const load = async () => {
    setBooks(await all('SELECT * FROM books ORDER BY added_at DESC'))
  }
  useEffect(() => { load() }, [])

  const coverFor = async (fileData, fname, hash) => {
    try {
      const bytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise
      const p = await doc.getPage(1)
      const vp = p.getViewport({ scale: .6 })
      const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height)
      const ctx = c.getContext('2d', { alpha: false }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      await p.render({ canvasContext: ctx, viewport: vp }).promise
      return { cover: await api.app.saveBase64(`${Date.now()}-${hash.slice(0,6)}.png`, c.toDataURL('image/png').split(',')[1], 'covers'), pages: doc.numPages }
    } catch (_) { return { cover: null, pages: 0 } }
  }

  const importPdfs = async (paths) => {
    const pdfs = paths.filter(p => p.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) { onToast?.('Arraste arquivos PDF válidos.', 'error'); return }
    setBusy(true)
    try {
      const copied = await api.app.copyFiles(pdfs, 'books')
      for (const f of copied) {
        if (f.error) continue
        if (await get('SELECT id FROM books WHERE file_path=?', [f.path])) continue
        let title = f.name.replace(/\.pdf$/i, ''), author = '', pages = 0, cover = null
        const r = await api.app.readFile(f.path)
        if (r.ok) {
          const info = await coverFor(r.data, f.name, f.hash)
          cover = info.cover; pages = info.pages
          try {
            const doc = await pdfjsLib.getDocument({ data: Uint8Array.from(atob(r.data), c => c.charCodeAt(0)) }).promise
            const meta = await doc.getMetadata()
            if (meta?.info?.Title) title = meta.info.Title
            if (meta?.info?.Author) author = meta.info.Author
          } catch (_) {}
        }
        await run('INSERT INTO books (title,author,file_path,cover,category,pages,added_at,last_page) VALUES (?,?,?,?,?,?,?,1)',
          [title, author || 'Sem autor', f.path, cover, 'Outros', pages, now()])
      }
      logEvent('books', 'pdf_imported', `${copied.length} arquivo(s)`)
      sfx.confirm(); onToast?.(`${copied.length} livro(s) importado(s)`); await load()
    } catch (e) { sfx.error(); onToast?.('Erro ao importar: ' + e.message, 'error') }
    setBusy(false)
  }

  const pick = async () => {
    try {
      const files = await api.app.select({ filters: [{ name: 'PDF', extensions: ['pdf'] }], multi: true, title: 'Adicionar PDF' })
      importPdfs(files)
    } catch (e) { onToast?.('Erro no seletor: ' + e.message, 'error') }
  }

  const setCat = async (b, cat) => { await run('UPDATE books SET category=? WHERE id=?', [cat, b.id]); sfx.confirm(); load() }
  const toggleFav = async b => { await run('UPDATE books SET favorite=? WHERE id=?', [b.favorite ? 0 : 1, b.id]); sfx.click(); load() }

  const filtered = books.filter(b => (category === 'Todos' || b.category === category) && (!query || (b.title + b.author).toLowerCase().includes(query.toLowerCase())))
  const grouped = CATEGORIES.map(c => ({ cat: c, items: filtered.filter(b => (b.category || 'Outros') === c) })).filter(g => g.items.length)

  return (
    <div className="page" onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); importPdfs(Array.from(e.dataTransfer.files).map(f => f.path)) }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><h1 className="page-title">Biblioteca</h1><p className="page-sub">Sua estante pessoal · {books.length} livros</p></div>
        <button className="btn primary" onClick={pick} disabled={busy}>{busy ? <span className="spin"><Upload size={15}/></span> : <Upload size={15}/>} ADICIONAR PDF</button>
      </div>

      <div className={cx('dropzone', over && 'over')} style={{ padding: 14, marginBottom: 16 }}><Upload size={18}/> Arraste PDFs para cá — eles são copiados para a biblioteca local</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <input className="input" style={{ width: 210 }} placeholder="Buscar livro..." value={query} onChange={e => setQuery(e.target.value)} />
        <div className="chip-row">{['Todos', ...CATEGORIES].map(c => <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div>
      </div>

      <div className="bookshelf-2d">
        {grouped.length === 0 ? <Empty icon="📚" title="Nenhum livro nesta categoria"/> : grouped.map(g => (
          <div className="shelf-group" key={g.cat}>
            <div className="shelf-label"><BookOpen size={14}/> {g.cat} <span className="chip">{g.items.length}</span></div>
            <div className="shelf-row">
              {g.items.map(b => <div className="shelf-book" key={b.id} title={b.title}>
                <button className="shelf-cover" onClick={() => setViewer(b)} onDoubleClick={() => setReader(b)}>
                  {b.cover ? <img src={mediaUrl(b.cover)} alt="" onError={e => e.currentTarget.style.opacity = '0'}/> :
                    <span style={{ background: colorFrom(b.title) }}>{b.title.slice(0, 22)}</span>}
                </button>
                <div className="shelf-book-title">{b.title}</div>
                <div className="shelf-book-actions">
                  <button className="mini-btn" title="Ler" onClick={() => setReader(b)}><BookOpen size={12}/></button>
                  <button className="mini-btn" title="Ver em 3D" onClick={() => setViewer(b)}><Box size={12}/></button>
                  <button className="mini-btn" onClick={() => toggleFav(b)}><Heart size={12} fill={b.favorite ? '#e78c62' : 'none'} color={b.favorite ? '#e78c62' : 'currentColor'}/></button>
                  <button className="mini-btn" onClick={() => setConfirm(b)}><Trash2 size={12}/></button>
                </div>
                <select className="shelf-cat" value={b.category || 'Outros'} onChange={e => setCat(b, e.target.value)}>
                  {ALL_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>)}
            </div>
            <div className="shelf-plank"/>
          </div>
        ))}
      </div>

      {reader && <PdfReader book={reader} onClose={() => setReader(null)}/>}
      {viewer && <Modal title={viewer.title} subtitle="Visualizador 3D do livro" width="min(760px,92vw)" onClose={() => setViewer(null)}
        actions={<><button className="btn ghost" onClick={() => { setReader(viewer); setViewer(null) }}><BookOpen size={14}/> Abrir leitor</button><button className="btn primary" onClick={() => setViewer(null)}>Fechar</button></>}>
        <BookViewer book={viewer} onClose={() => setViewer(null)}/>
      </Modal>}
      {confirm && <Confirm title="Remover livro" message={`Remover “${confirm.title}”? Os originais não são apagados.`} danger
        onCancel={() => setConfirm(null)} onConfirm={async () => { await run('DELETE FROM books WHERE id=?', [confirm.id]); setConfirm(null); load() }}/>}
    </div>
  )
}
