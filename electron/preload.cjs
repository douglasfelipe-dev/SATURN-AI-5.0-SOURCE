const { contextBridge, ipcRenderer } = require('electron')

const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  db: {
    all: (sql, params) => call('db:all', sql, params),
    run: (sql, params) => call('db:run', sql, params),
    backup: () => call('db:backup'),
    restore: (file) => call('db:restore', file)
  },
  app: {
    paths: () => call('app:paths'),
    select: (opts) => call('app:select', opts),
    copyFiles: (files, subfolder) => call('app:copy-files', { files, subfolder }),
    saveBase64: (name, data, subfolder) => call('app:save-base64', { name, data, subfolder }),
    readFile: (file) => call('app:read-file', file),
    fileUrl: (file) => call('app:file-url', file),
    exists: (file) => call('app:exists', file),
    deleteFile: (file) => call('app:delete-file', file),
    openPath: (p) => call('app:open-path', p),
    openExternal: (url) => call('app:open-external', url),
    setStorage: (folder) => call('app:set-storage', folder),
    autoLaunch: (enabled) => call('app:auto-launch', enabled),
    restart: () => call('app:restart'),
    version: () => call('app:version'),
    command: (cmd) => call('sys:command', cmd),
    docs: () => call('app:docs')
  },
  win: {
    minimize: () => call('win:minimize'),
    toggle: () => call('win:toggle'),
    close: () => call('win:close'),
    bounds: () => call('win:bounds'),
    setBounds: (b) => call('win:set-bounds', b)
  },
  yt: {
    info: (url) => call('yt:info', url),
    parse: (url) => call('yt:parse', url)
  },
  adb: {
    status: () => call('adb:status'),
    run: (args) => call('adb:run', args),
    installTool: () => call('adb:install-tool'),
    setPath: (p) => call('adb:set-path', p)
  },
  reminder: {
    check: () => call('reminder:check')
  },
  notify: {
    list: () => call('notify:list'),
    read: (id) => call('notify:read', id),
    clear: () => call('notify:clear'),
    test: () => call('notify:test')
  },
  capture: {
    save: (rect) => call('capture:save', rect)
  },
  fs: {
    op: (op, args) => call('fs:op', op, args)
  },
  onNotification: (callback) => {
    const listener = (_e, data) => callback(data)
    ipcRenderer.on('nova:notification', listener)
    return () => ipcRenderer.removeListener('nova:notification', listener)
  }
})

contextBridge.exposeInMainWorld('__NOVA_VERSION__', '5.0.0')

window.addEventListener('DOMContentLoaded', () => {
  window.__NOVA_DESK_READY__ = true
})
