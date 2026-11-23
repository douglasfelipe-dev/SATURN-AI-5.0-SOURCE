/* NOVA DESK — Electron main process */
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification, nativeImage, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const https = require('https')
const http = require('http')
const { spawn, execSync, execFileSync } = require('child_process')

const isDev = !app.isPackaged
let db = null
let mainWindow = null
let SQL = null
let localPort = 0

/* Servidor HTTP local: o YouTube se recusa a reproduzir com origem file:// */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8'
}
function serveMedia(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost')
    const file = url.searchParams.get('path')
    if (!file) { res.writeHead(400); res.end('missing path'); return }
    const root = getLibraryRoot()
    const resolved = path.resolve(file)
    if (!resolved.startsWith(root) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.writeHead(404); res.end('not found'); return
    }
    const ext = path.extname(resolved).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'
    const size = fs.statSync(resolved).size
    const range = req.headers.range
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range)
      if (m) {
        const start = parseInt(m[1], 10)
        const end = m[2] ? parseInt(m[2], 10) : size - 1
        res.writeHead(206, {
          'Content-Type': type, 'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1
        })
        fs.createReadStream(resolved, { start, end }).pipe(res)
        return
      }
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size, 'Cache-Control': 'no-store' })
    fs.createReadStream(resolved).pipe(res)
  } catch (e) { res.writeHead(500); res.end(e.message) }
}
function startLocalServer() {
  const root = path.join(__dirname, '..', 'dist')
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      if ((req.url || '').startsWith('/media?')) { serveMedia(req, res); return }
      try {
        let rel = decodeURIComponent((req.url || '/').split('?')[0])
        if (rel === '/' || !path.extname(rel)) rel = '/index.html'
        let file = path.join(root, rel)
        if (!file.startsWith(root)) { res.writeHead(403); res.end(); return }
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html')
        const ext = path.extname(file).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' })
        fs.createReadStream(file).pipe(res)
      } catch (e) { res.writeHead(500); res.end(e.message) }
    })
    server.listen(0, 'localhost', () => {
      localPort = server.address().port
      console.log('Servidor local do app na porta', localPort)
      resolve()
    })
  })
}

/* ------------------------------------------------------------------ */
/* Paths                                                              */
/* ------------------------------------------------------------------ */
const userData = app.getPath('userData')
const defaultLibrary = path.join(userData, 'nova-desk-library')

function settingsPath() {
  return path.join(userData, 'settings.json')
}
function readSettingsFile() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) } catch { return {} }
}
function writeSettingsFile(s) {
  try { fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2)) } catch (e) { console.error(e) }
}
function getLibraryRoot() {
  const s = readSettingsFile()
  return s.storagePath || defaultLibrary
}
function ensureDirs() {
  const root = getLibraryRoot()
  ;['', 'music', 'videos', 'books', 'photos', 'files', 'backups', 'tools', 'covers', 'thumb'].forEach(sub => {
    const p = path.join(root, sub)
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
  })
}

/* ------------------------------------------------------------------ */
/* SQLite (sql.js / WASM — real SQLite, persisted to disk)             */
/* ------------------------------------------------------------------ */
const DB_FILE = path.join(userData, 'nova-desk.sqlite')

async function initDb() {
  const initSqlJs = require('sql.js')
  const wasmPath = isDev
    ? path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    : path.join(process.resourcesPath, 'sql-wasm.wasm')
  SQL = await initSqlJs({ locateFile: () => wasmPath })
  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE)
    db = new SQL.Database(new Uint8Array(buf))
  } else {
    db = new SQL.Database()
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, artist TEXT, youtube_id TEXT UNIQUE, thumb TEXT, duration INTEGER, added_at TEXT);
    CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, color TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS playlist_songs (id INTEGER PRIMARY KEY AUTOINCREMENT, playlist_id INTEGER, song_id INTEGER, position INTEGER, UNIQUE(playlist_id, song_id));
    CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, youtube_id TEXT UNIQUE, thumb TEXT, channel TEXT, added_at TEXT);
    CREATE TABLE IF NOT EXISTS video_playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS video_playlist_items (id INTEGER PRIMARY KEY AUTOINCREMENT, playlist_id INTEGER, video_id INTEGER, position INTEGER);
    CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT, file_path TEXT, cover TEXT, category TEXT, pages INTEGER, added_at TEXT, last_page INTEGER DEFAULT 1, favorite INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS annotations (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER, page INTEGER, type TEXT, text TEXT, color TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, cover TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, name TEXT, album_id INTEGER, favorite INTEGER DEFAULT 0, taken_at TEXT, added_at TEXT);
    CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, type TEXT, size INTEGER, folder_id INTEGER, favorite INTEGER DEFAULT 0, added_at TEXT);
    CREATE TABLE IF NOT EXISTS folders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, parent_id INTEGER DEFAULT 0, created_at TEXT);
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, color TEXT, updated_at TEXT);
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, done INTEGER DEFAULT 0, due TEXT, priority TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, time TEXT, description TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS pets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, species TEXT, color TEXT, personality TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS room_items (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, x REAL, y REAL, z REAL, rot REAL, scale REAL, color TEXT, props TEXT);
    CREATE TABLE IF NOT EXISTS stats (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, value REAL, meta TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, module TEXT, action TEXT, detail TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT,
      due_at TEXT, repeat_mode TEXT DEFAULT 'once', weekdays TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1, last_fired TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, kind TEXT DEFAULT 'reminder',
      read INTEGER DEFAULT 0, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS widget_layout (
      id INTEGER PRIMARY KEY AUTOINCREMENT, widget TEXT UNIQUE, x INTEGER, y INTEGER,
      w INTEGER, h INTEGER, color TEXT, settings TEXT
    );
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, colors TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS local_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, path TEXT, size INTEGER, added_at TEXT
    );
    CREATE TABLE IF NOT EXISTS local_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, artist TEXT, path TEXT, size INTEGER, added_at TEXT
    );
    CREATE TABLE IF NOT EXISTS diary (
      id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS home_layout (
      id INTEGER PRIMARY KEY AUTOINCREMENT, widget TEXT UNIQUE, pos INTEGER, color TEXT, span INTEGER
    );
  `)
  // Migrações seguras (mantêm dados da versão anterior)
  for (const sql of [
    'ALTER TABLE notes ADD COLUMN category TEXT DEFAULT "Geral"',
    'ALTER TABLE notes ADD COLUMN pinned INTEGER DEFAULT 0',
    'ALTER TABLE events ADD COLUMN reminder_id INTEGER',
    'ALTER TABLE folders ADD COLUMN path TEXT'
  ]) { try { db.run(sql) } catch (_) {} }
  persistDb()
}

let persistTimer = null
function persistDb() {
  if (!db) return
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      const data = db.export()
      fs.writeFileSync(DB_FILE, Buffer.from(data))
    } catch (e) { console.error('DB persist error', e) }
  }, 250)
}

function rows(stmt) {
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}
function dbAll(sql, params = []) {
  if (!db) return []
  const stmt = db.prepare(sql); stmt.bind(params)
  return rows(stmt)
}
function dbRun(sql, params = []) {
  if (!db) return
  db.run(sql, params); persistDb()
}

/* ------------------------------------------------------------------ */
/* Agendador de lembretes — notificações reais do sistema              */
/* ------------------------------------------------------------------ */
function nextOccurrence(dueAt, mode, weekdays, from = new Date()) {
  const d = new Date(dueAt)
  if (isNaN(d.getTime())) return null
  if (mode === 'daily') {
    while (d <= from) d.setDate(d.getDate() + 1)
    return d
  }
  if (mode === 'weekly') {
    const days = String(weekdays || '').split(',').map(Number).filter(n => !isNaN(n))
    if (!days.length) days.push(d.getDay())
    for (let i = 0; i < 60; i++) {
      d.setDate(d.getDate() + 1)
      if (days.includes(d.getDay())) return d
    }
    return null
  }
  if (mode === 'monthly') {
    while (d <= from) d.setMonth(d.getMonth() + 1)
    return d
  }
  return null
}

function checkReminders() {
  if (!db) return
  const now = new Date()
  const due = dbAll('SELECT * FROM reminders WHERE enabled=1 AND due_at IS NOT NULL')
  for (const r of due) {
    const at = new Date(r.due_at)
    if (isNaN(at.getTime()) || at > now) continue
    if (r.last_fired && new Date(r.last_fired) >= at) continue
    const body = r.description || 'Lembrete do DOUGLAS FELIPE.DEV'
    try {
      if (Notification.isSupported()) new Notification({ title: r.title, body, silent: false }).show()
    } catch (e) { console.error('Notification error', e) }
    dbRun('INSERT INTO notifications (title,body,kind,created_at) VALUES (?,?,?,?)', [r.title, body, 'reminder', new Date().toISOString()])
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('nova:notification', { title: r.title, body, kind: 'reminder' })
    dbRun('UPDATE reminders SET last_fired=? WHERE id=?', [new Date().toISOString(), r.id])
    if (r.repeat_mode && r.repeat_mode !== 'once') {
      const next = nextOccurrence(r.due_at, r.repeat_mode, r.weekdays, now)
      if (next) dbRun('UPDATE reminders SET due_at=? WHERE id=?', [next.toISOString(), r.id])
      else dbRun('UPDATE reminders SET enabled=0 WHERE id=?', [r.id])
    }
  }
}
let reminderTimer = null
function startReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer)
  checkReminders()
  reminderTimer = setInterval(checkReminders, 10000)
}

/* ------------------------------------------------------------------ */
/* Window                                                             */
/* ------------------------------------------------------------------ */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 480,
    minHeight: 360,
    // Janela nativa do Windows com título oculto: move/redimensiona entre monitores
    frame: true,
    titleBarStyle: 'hidden',
    resizable: true,
    movable: true,
    fullscreenable: true,
    transparent: false,
    backgroundColor: '#f7f1e8',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false,
      allowRunningInsecureContent: false
    }
  })
  mainWindow.webContents.on('console-message', (e) => {
    if (e.level >= 2) console.log('[renderer]', e.message)
  })
  mainWindow.loadURL(isDev ? 'http://localhost:5173' : `http://localhost:${localPort}/`)
  // DevTools podem ser abertos com Ctrl+Shift+I quando necessário

  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.once('ready-to-show', () => applyRoundedCorners())
}

/* Cantos arredondados nativos no Windows 11 (DWM): visual macOS-style por fora */
function applyRoundedCorners() {
  try {
    const handle = mainWindow?.getNativeWindowHandle()
    if (!handle) return
    const hwnd = handle.length >= 8 ? Number(handle.readBigInt64LE(0)) : handle.readInt32LE(0)
    const ps = `Add-Type @"
using System;using System.Runtime.InteropServices;
public class DWMCorner { [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr h,int a,int[] v,int s); }
"@
[DWMCorner]::DwmSetWindowAttribute([IntPtr]${hwnd},33,@(2),4) | Out-Null`
    execFileSync('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true, stdio: 'ignore' })
  } catch (_) {}
}

app.whenReady().then(async () => {
  ensureDirs()
  await initDb()
  startReminderScheduler()
  if (!isDev) await startLocalServer()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

/* ------------------------------------------------------------------ */
/* Generic IPC                                                        */
/* ------------------------------------------------------------------ */
ipcMain.handle('db:all', async (_e, sql, params = []) => {
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params || [])
    return { ok: true, rows: rows(stmt) }
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('db:run', async (_e, sql, params = []) => {
  try {
    db.run(sql, params)
    let lastId = null
    try { lastId = db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ?? null } catch (_) {}
    persistDb()
    return { ok: true, lastInsertRowid: lastId }
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('db:backup', async () => {
  try {
    const dest = path.join(getLibraryRoot(), 'backups', `nova-desk-${Date.now()}.sqlite`)
    fs.writeFileSync(dest, Buffer.from(db.export()))
    return { ok: true, path: dest }
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('db:restore', async (_e, file) => {
  try {
    const buf = fs.readFileSync(file)
    db.close()
    db = new SQL.Database(new Uint8Array(buf))
    persistDb()
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

/* ------------------------------------------------------------------ */
/* Files & dialogs                                                     */
/* ------------------------------------------------------------------ */
ipcMain.handle('app:paths', async () => ({
  userData, library: getLibraryRoot(), dbFile: DB_FILE,
  music: path.join(getLibraryRoot(), 'music'),
  videos: path.join(getLibraryRoot(), 'videos'),
  books: path.join(getLibraryRoot(), 'books'),
  photos: path.join(getLibraryRoot(), 'photos'),
  files: path.join(getLibraryRoot(), 'files')
}))

ipcMain.handle('app:select', async (_e, opts = {}) => {
  const props = opts.directory ? ['openDirectory'] : opts.multi ? ['multiSelections', 'openFile'] : ['openFile']
  const filters = opts.filters || [{ name: 'Todos os arquivos', extensions: ['*'] }]
  const r = await dialog.showOpenDialog(mainWindow, { properties: props, filters, title: opts.title || 'Selecionar arquivos' })
  return r.canceled ? [] : r.filePaths
})

function safeName(name) {
  return String(name).replace(/[<>:"\\|?*\x00-\x1F]/g, '_').slice(0, 140)
}
function uniqueDest(dir, name) {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  let dest = path.join(dir, safeName(name))
  let i = 1
  while (fs.existsSync(dest)) dest = path.join(dir, `${base} (${i++})${ext}`)
  return dest
}
ipcMain.handle('app:copy-files', async (_e, { files, subfolder = 'files' }) => {
  const destDir = path.join(getLibraryRoot(), subfolder)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  const out = []
  for (const src of files) {
    try {
      const stat = fs.statSync(src)
      if (stat.isDirectory()) continue
      const dest = uniqueDest(destDir, path.basename(src))
      fs.copyFileSync(src, dest)
      const hash = crypto.createHash('md5').update(fs.readFileSync(dest)).digest('hex')
      out.push({ source: src, path: dest, name: path.basename(dest), size: stat.size, hash })
    } catch (e) { out.push({ source: src, error: e.message }) }
  }
  return out
})
ipcMain.handle('app:save-base64', async (_e, { name, data, subfolder = 'covers' }) => {
  const dir = path.join(getLibraryRoot(), subfolder)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const dest = uniqueDest(dir, safeName(name))
  fs.writeFileSync(dest, Buffer.from(data, 'base64'))
  return dest
})
ipcMain.handle('app:read-file', async (_e, file) => {
  try { return { ok: true, data: fs.readFileSync(file).toString('base64') } }
  catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('app:file-url', async (_e, file) => `file:///${String(file).replace(/\\/g, '/').replace(/^\//, '')}`)
ipcMain.handle('app:exists', async (_e, file) => fs.existsSync(file))
ipcMain.handle('app:delete-file', async (_e, file) => {
  try { fs.unlinkSync(file); return { ok: true } } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('app:open-path', async (_e, p) => shell.openPath(p))
ipcMain.handle('app:open-external', async (_e, url) => shell.openExternal(url))
ipcMain.handle('app:set-storage', async (_e, folder) => {
  try {
    ensureDirs()
    const s = readSettingsFile(); s.storagePath = folder; writeSettingsFile(s)
    ensureDirs()
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

/* ------------------------------------------------------------------ */
/* Window controls & settings                                         */
/* ------------------------------------------------------------------ */
ipcMain.handle('win:minimize', () => mainWindow?.minimize())
ipcMain.handle('win:toggle', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.handle('win:close', () => mainWindow?.close())
ipcMain.handle('win:bounds', async () => ({
  ...(mainWindow?.getBounds() || {}),
  maximized: !!mainWindow?.isMaximized(),
  display: screen.getDisplayMatching(mainWindow?.getBounds() || { x: 0, y: 0, width: 1, height: 1 }).id
}))
ipcMain.handle('win:set-bounds', async (_e, b) => {
  if (!mainWindow) return { ok: false }
  if (b.maximized === false && mainWindow.isMaximized()) mainWindow.unmaximize()
  if (b.x != null) mainWindow.setBounds(b, true)
  else if (b.maximized) mainWindow.maximize()
  return { ok: true, bounds: mainWindow.getBounds() }
})
ipcMain.handle('app:auto-launch', async (_e, enabled) => {
  app.setLoginItemSettings({ openAtLogin: !!enabled, path: process.execPath })
  return true
})
ipcMain.handle('app:restart', async () => { app.relaunch(); app.exit(0) })
/* Lembretes e central de notificações */
ipcMain.handle('reminder:check', async () => { checkReminders(); return { ok: true } })
ipcMain.handle('notify:list', async () => dbAll('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'))
ipcMain.handle('notify:read', async (_e, id) => {
  if (id) dbRun('UPDATE notifications SET read=1 WHERE id=?', [id])
  else dbRun('UPDATE notifications SET read=1')
  return { ok: true }
})
ipcMain.handle('notify:clear', async () => { dbRun('DELETE FROM notifications'); return { ok: true } })
ipcMain.handle('notify:test', async () => {
  try { if (Notification.isSupported()) new Notification({ title: 'DOUGLAS FELIPE.DEV', body: 'Notificação de teste funcionando.' }).show() } catch (e) {}
  dbRun("INSERT INTO notifications (title,body,kind,created_at) VALUES (?,?,?,?)", ['Teste', 'Notificação de teste funcionando.', 'system', new Date().toISOString()])
  return { ok: true, supported: Notification.isSupported() }
})

/* Captura real do quadro (quando a origem permitir) */
ipcMain.handle('capture:save', async (_e, rect) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: 'Janela indisponível.' }
    const img = rect ? await mainWindow.webContents.capturePage(rect) : await mainWindow.webContents.capturePage()
    const dest = path.join(getLibraryRoot(), 'photos', `captura-${Date.now()}.png`)
    fs.writeFileSync(dest, img.toPNG())
    return { ok: true, path: dest }
  } catch (e) { return { ok: false, error: e.message } }
})

/* Operações reais de pastas/arquivos dentro da biblioteca local */
ipcMain.handle('fs:op', async (_e, op, args = {}) => {
  try {
    const root = getLibraryRoot()
    const safe = p => {
      const r = path.resolve(root, String(p || ''))
      if (!r.startsWith(root)) throw new Error('Acesso negado fora da biblioteca')
      return r
    }
    switch (op) {
      case 'mkdir': {
        const dir = safe(args.path)
        fs.mkdirSync(dir, { recursive: true })
        return { ok: true, path: dir }
      }
      case 'rename': {
        const from = safe(args.from), to = safe(args.to)
        fs.renameSync(from, to)
        return { ok: true, path: to }
      }
      case 'remove': {
        const target = safe(args.path)
        const stat = fs.statSync(target)
        if (stat.isDirectory()) fs.rmSync(target, { recursive: true, force: true })
        else fs.unlinkSync(target)
        return { ok: true }
      }
      case 'copy': {
        const from = safe(args.from), to = safe(args.to)
        if (fs.statSync(from).isDirectory()) fs.cpSync(from, to, { recursive: true })
        else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to) }
        return { ok: true, path: to }
      }
      case 'move': {
        const from = safe(args.from), to = safe(args.to)
        fs.mkdirSync(path.dirname(to), { recursive: true })
        fs.renameSync(from, to)
        return { ok: true, path: to }
      }
      case 'list': {
        const dir = safe(args.path)
        if (!fs.existsSync(dir)) return { ok: true, items: [] }
        return { ok: true, items: fs.readdirSync(dir, { withFileTypes: true }).map(d => ({ name: d.name, dir: d.isDirectory() })) }
      }
      default: return { ok: false, error: 'Operação desconhecida' }
    }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('app:version', async () => app.getVersion())
ipcMain.handle('app:docs', async () => {
  const p = isDev ? path.join(__dirname, '..', 'docs', 'index.html') : path.join(process.resourcesPath, 'docs', 'index.html')
  return shell.openPath(p)
})

/* Terminal com lista de comandos permitidos (sem execução arbitrária) */
ipcMain.handle('sys:command', async (_e, raw) => {
  const cmd = String(raw || '').trim()
  if (!cmd) return { ok: true, output: '' }
  const base = cmd.split(/\s+/)[0].toLowerCase()
  const allowed = ['dir', 'echo', 'date', 'ver', 'whoami', 'pwd', 'help', 'cls']
  if (!allowed.includes(base)) return { ok: false, output: `Comando não permitido: ${base}. Digite "help".` }
  try {
    if (base === 'help') return { ok: true, output: 'Comandos disponíveis:\n  dir [pasta]   Lista arquivos\n  echo <texto>  Imprime texto\n  date          Data e hora atuais\n  ver           Versão do NOVA DESK\n  whoami        Usuário atual\n  pwd           Diretório da biblioteca\n  cls           Limpa a tela' }
    if (base === 'ver') return { ok: true, output: `NOVA DESK v${app.getVersion()} · Electron ${process.versions.electron} · Node ${process.versions.node}` }
    if (base === 'date') return { ok: true, output: new Date().toLocaleString('pt-BR') }
    if (base === 'whoami') return { ok: true, output: process.env.USERNAME || process.env.USER || 'usuário' }
    if (base === 'pwd') return { ok: true, output: getLibraryRoot() }
    if (base === 'cls') return { ok: true, output: '__CLEAR__' }
    if (base === 'echo') return { ok: true, output: cmd.slice(5) }
    if (base === 'dir') {
      const arg = cmd.slice(3).trim()
      const dir = arg ? path.resolve(getLibraryRoot(), arg) : getLibraryRoot()
      if (!dir.startsWith(getLibraryRoot())) return { ok: false, output: 'Acesso negado fora da biblioteca.' }
      const items = fs.readdirSync(dir, { withFileTypes: true })
      return { ok: true, output: items.map(i => `${i.isDirectory() ? '<DIR>' : '     '} ${i.name}`).join('\n') || '(vazio)' }
    }
  } catch (e) { return { ok: false, output: e.message } }
  return { ok: true, output: '' }
})

/* ------------------------------------------------------------------ */
/* YouTube metadata (oEmbed + thumbnail) — real, no download           */
/* ------------------------------------------------------------------ */
function httpsGet(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (NOVA DESK)' } }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('Tempo limite ao consultar o YouTube')) })
  })
}
function parseYoutubeId(input) {
  if (!input) return null
  const s = String(input).trim()
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/
  ]
  for (const p of patterns) { const m = s.match(p); if (m) return m[1] }
  return null
}
ipcMain.handle('yt:info', async (_e, url) => {
  const id = parseYoutubeId(url)
  if (!id) return { ok: false, error: 'Link do YouTube inválido.' }
  const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  let title = `Vídeo ${id}`, channel = 'YouTube'
  try {
    const r = await Promise.race([
      httpsGet(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`).catch(() => null),
      new Promise(res => setTimeout(() => res(null), 2500))
    ])
    if (r && r.status === 200) {
      const j = JSON.parse(r.body)
      title = j.title || title
      channel = j.author_name || channel
    }
  } catch (_) { /* thumb still works; título genérico é usado */ }
  return { ok: true, id, title, channel, thumb }
})
ipcMain.handle('yt:parse', async (_e, url) => ({ id: parseYoutubeId(url) }))

/* ------------------------------------------------------------------ */
/* ADB / Android (real — never simulated)                              */
/* ------------------------------------------------------------------ */
function adbPath() {
  const s = readSettingsFile()
  if (s.adbPath && fs.existsSync(s.adbPath)) return s.adbPath
  const local = path.join(getLibraryRoot(), 'tools', 'platform-tools', 'adb.exe')
  if (fs.existsSync(local)) return local
  try {
    const out = execSync('where adb', { encoding: 'utf8', windowsHide: true })
    const p = out.split(/\r?\n/)[0].trim()
    if (p && fs.existsSync(p)) return p
  } catch (_) {}
  return null
}
function runAdb(args, timeout = 20000) {
  const exe = adbPath()
  if (!exe) return { ok: false, error: 'ADB não encontrado.' }
  return new Promise(resolve => {
    const p = spawn(exe, args, { windowsHide: true })
    let out = '', err = ''
    p.stdout.on('data', d => out += d.toString())
    p.stderr.on('data', d => err += d.toString())
    const t = setTimeout(() => p.kill(), timeout)
    p.on('close', code => { clearTimeout(t); resolve({ ok: code === 0, code, output: out.trim() || err.trim() }) })
    p.on('error', e => { clearTimeout(t); resolve({ ok: false, error: e.message }) })
  })
}
ipcMain.handle('adb:status', async () => {
  const exe = adbPath()
  if (!exe) return { ok: false, installed: false, error: 'ADB não instalado. Use o botão Instalar ADB.' }
  const devices = await runAdb(['devices'])
  const lines = devices.output.split(/\r?\n/).slice(1).filter(l => l.trim() && !l.startsWith('daemon'))
  const list = lines.map(l => { const [serial, state] = l.split(/\s+/); return { serial, state } })
  return { ok: true, installed: true, path: exe, devices: list }
})
ipcMain.handle('adb:run', async (_e, args) => runAdb(args))
ipcMain.handle('adb:install-tool', async () => {
  const destDir = path.join(getLibraryRoot(), 'tools')
  const zip = path.join(destDir, 'platform-tools.zip')
  try {
    if (!fs.existsSync(zip)) {
      await new Promise((resolve, reject) => {
        const url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
        const file = fs.createWriteStream(zip)
        const get = u => https.get(u, { headers: { 'User-Agent': 'NOVA DESK' } }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); get(res.headers.location); return }
          if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return }
          res.pipe(file)
          res.on('end', () => file.end())
        }).on('error', reject)
        get(url)
        file.on('finish', resolve)
      })
    }
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zip}' -DestinationPath '${destDir}' -Force"`, { windowsHide: true })
    const exe = path.join(destDir, 'platform-tools', 'adb.exe')
    const s = readSettingsFile(); s.adbPath = exe; writeSettingsFile(s)
    return { ok: fs.existsSync(exe), path: exe }
  } catch (e) { return { ok: false, error: e.message } }
})
ipcMain.handle('adb:set-path', async (_e, p) => {
  if (p && fs.existsSync(p)) { const s = readSettingsFile(); s.adbPath = p; writeSettingsFile(s); return { ok: true } }
  return { ok: false, error: 'Arquivo não encontrado.' }
})

/* Supress menu for clean immersive UI */
Menu.setApplicationMenu(null)
