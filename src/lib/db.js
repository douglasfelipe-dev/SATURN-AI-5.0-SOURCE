/* Acesso à API nativa via IPC.
   Proxy resolve window.api de forma preguiçosa para funcionar também em HMR. */
export const api = new Proxy({}, {
  get(_target, prop) {
    const source = window.api || {}
    const value = source[prop]
    return typeof value === 'function' ? value.bind(source) : value
  }
})

export async function all(sql, params = []) {
  const r = await api.db.all(sql, params)
  if (!r.ok) throw new Error(r.error)
  return r.rows
}
export async function run(sql, params = []) {
  const r = await api.db.run(sql, params)
  if (!r.ok) throw new Error(r.error)
  return r
}
export async function get(sql, params = []) {
  const rows = await all(sql, params)
  return rows[0] || null
}
export async function value(sql, params = [], fallback = null) {
  const row = await get(sql, params)
  if (!row) return fallback
  return Object.values(row)[0]
}
export const now = () => new Date().toISOString()

/** URL HTTP segura para arquivos locais da biblioteca (file:// é bloqueado pelo navegador) */
export function mediaUrl(p) {
  if (!p) return ''
  return `${window.location.origin}/media?path=${encodeURIComponent(p)}`
}

export async function logEvent(module, action, detail = '') {
  await run('INSERT INTO history (module, action, detail, created_at) VALUES (?,?,?,?)', [module, action, detail, now()])
}
export async function addStat(type, val = 1, meta = '') {
  await run('INSERT INTO stats (type, value, meta, created_at) VALUES (?,?,?,?)', [type, val, meta, now()])
}

export async function setting(key, fallback = null) {
  const v = await value('SELECT value FROM settings WHERE key=?', [key], null)
  if (v === null) return fallback
  try { return JSON.parse(v) } catch { return v }
}
export async function setSetting(key, val) {
  await run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, JSON.stringify(val)])
}

export async function seedDefaults() {
  const count = await value('SELECT COUNT(*) c FROM playlists', [], 0)
  if (!count) {
    const names = [
      ['Pagode', '#F2B880'], ['Rap', '#C9D8B6'], ['Rock', '#E9A39A'],
      ['Eletrônica', '#B9C8E8'], ['Internacional', '#F0D9A0'],
      ['Músicas favoritas', '#EFC5B8'], ['Relaxamento', '#C7DCC8']
    ]
    for (const [name, color] of names) {
      await run('INSERT INTO playlists (name,color,created_at) VALUES (?,?,?)', [name, color, now()])
    }
  }
  const items = await value('SELECT COUNT(*) c FROM room_items', [], 0)
  if (!items) {
    const initial = [
      ['desk', -1.6, 0, -1.9, 0, 1, '#B98A63'],
      ['chair', -1.6, 0, -1.0, 180, 1, '#7C9C86'],
      ['sofa', 1.5, 0, -1.6, -90, 1, '#D9A58C'],
      ['shelf', 2.7, 0, -2.5, -90, 1, '#A87955'],
      ['lamp', -2.6, 0, -2.4, 0, 1, '#F0C97A'],
      ['plant', 2.4, 0, 1.4, 0, 1, '#6E9B6A'],
      ['rug', 0, 0, 0.2, 0, 1, '#EBC7A6'],
      ['tv', 0.2, 0, -2.6, 0, 1, '#3E4746']
    ]
    for (const [type, x, y, z, rot, scale, color] of initial) {
      await run('INSERT INTO room_items (type,x,y,z,rot,scale,color,props) VALUES (?,?,?,?,?,?,?,?)',
        [type, x, y, z, rot, scale, color, '{}'])
    }
  }
  await setSetting('seeded', true)
}

export const THEMES = {
  sage: { name: 'Verde sálvia', primary: '#4F8B62', secondary: '#A7BC9B', bg: '#F7F1E8', card: '#FFFFFF', accent: '#EBA98B' },
  purple: { name: 'Roxo', primary: '#7B61A8', secondary: '#B7A8D6', bg: '#F7F2F7', card: '#FFFFFF', accent: '#D9A7C4' },
  violet: { name: 'Violeta', primary: '#6C5CE7', secondary: '#B3A9EF', bg: '#F4F2FB', card: '#FFFFFF', accent: '#C6B6F0' },
  green: { name: 'Verde', primary: '#3E8E5A', secondary: '#9CCFAE', bg: '#F1F7F1', card: '#FFFFFF', accent: '#F0C87A' },
  blue: { name: 'Azul', primary: '#4C7CB8', secondary: '#A9C4E4', bg: '#F1F5FA', card: '#FFFFFF', accent: '#EFA98B' },
  pink: { name: 'Rosa', primary: '#C4728B', secondary: '#E7B4C4', bg: '#FBF2F4', card: '#FFFFFF', accent: '#F3CE9B' },
  orange: { name: 'Laranja', primary: '#D4834E', secondary: '#F0C39B', bg: '#FBF4ED', card: '#FFFFFF', accent: '#EBA98B' },
  black: { name: 'Preto', primary: '#2E2E2E', secondary: '#6E6E6E', bg: '#1D1D1D', card: '#2A2A2A', accent: '#C99A6E' },
  white: { name: 'Branco', primary: '#5A6B5E', secondary: '#BFC9C0', bg: '#FFFFFF', card: '#F8F8F6', accent: '#E8B79C' },
  custom: { name: 'Personalizado', primary: '#4F8B62', secondary: '#A7BC9B', bg: '#F7F1E8', card: '#FFFFFF', accent: '#EBA98B' }
}
