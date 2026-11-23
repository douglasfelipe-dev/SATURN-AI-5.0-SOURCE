import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
}

function mediaMiddleware() {
  return {
    name: 'nova-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!(req.url || '').startsWith('/media?')) return next()
        try {
          const url = new URL(req.url, 'http://localhost')
          const file = url.searchParams.get('path')
          const root = path.join(os.homedir(), 'AppData', 'Roaming', 'douglas-felipe-dev', 'nova-desk-library')
          const resolved = path.resolve(file || '')
          if (!resolved.startsWith(root) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
            res.statusCode = 404; res.end('not found'); return
          }
          const type = MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream'
          const size = fs.statSync(resolved).size
          const range = req.headers.range
          if (range) {
            const m = /bytes=(\d+)-(\d*)/.exec(range)
            if (m) {
              const start = parseInt(m[1], 10)
              const end = m[2] ? parseInt(m[2], 10) : size - 1
              res.statusCode = 206
              res.setHeader('Content-Type', type)
              res.setHeader('Accept-Ranges', 'bytes')
              res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
              res.setHeader('Content-Length', end - start + 1)
              fs.createReadStream(resolved, { start, end }).pipe(res)
              return
            }
          }
          res.statusCode = 200
          res.setHeader('Content-Type', type)
          res.setHeader('Accept-Ranges', 'bytes')
          res.setHeader('Content-Length', size)
          fs.createReadStream(resolved).pipe(res)
        } catch (e) { res.statusCode = 500; res.end(e.message) }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), mediaMiddleware()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/pdfjs-dist')) return 'pdfjs'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/react')) return 'react'
        }
      }
    }
  },
  server: { port: 5173, strictPort: true }
})
