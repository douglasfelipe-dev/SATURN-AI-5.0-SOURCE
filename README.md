# SATURN.AI Dashboard — v3.0

Ambiente digital pessoal para Windows: dashboard, mídias locais, biblioteca de PDFs, gerenciador de pastas, mesa de trabalho virtual com desenho e diário, cinema com YouTube, temas e perfil.

## Executar / gerar

```bash
npm install
npm run dev       # Vite + Electron (desenvolvimento)
npm run build     # renderer
npm run dist      # instalador + portátil em release-3.0/
```

## Executáveis 3.0

- `release-3.0/SATURN.AI 3.0 Setup.exe`
- `release-3.0/SATURN.AI 3.0 Portable.exe`

## Estrutura

- `electron/main.cjs` — SQLite, mídia HTTP (`/media`), operações de pastas (`fs:op`), lembretes, captura, IPC
- `vite.config.js` — middleware `/media` para desenvolvimento
- `src/App.jsx` — shell, splash, busca universal, notificações, tema
- `src/lib/db.js` — acesso SQLite + `mediaUrl()`
- `src/modules/` — Início, Meu Ambiente, Música, Músicas locais, Cinema, Vídeos, Livros, Galeria, Arquivos, Notas, Estatísticas, Perfil, Temas, Configurações
- `docs/index.html` — documentação
- `CHANGELOG_3.0.md` — registro de alterações
- `RELATORIO_TESTES_3.0.md` — resultados individuais
- `tests/` — harness CDP e baterias T8–T14

## Backups

- `..\_BACKUP_v2.0.1_DouglasFelipe\` (versão anterior imediata)
- `..\_BACKUP_v1.0.0_DouglasFelipe\`

## Dados

`%APPDATA%\douglas-felipe-dev\` — `nova-desk.sqlite`, `settings.json` e `nova-desk-library\` (books, photos, files, videos, music, covers, backups).
