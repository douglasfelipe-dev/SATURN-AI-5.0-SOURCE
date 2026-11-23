# RELATÓRIO DE TESTES — SATURN.AI Dashboard 5.0

Metodologia: CDP com eventos reais, arquivos das pastas de teste fornecidas, banco SQLite e estado de mídia verificados.

## Resultado em desenvolvimento

| Bateria | Resultado |
|---|---|
| T3 Notas/Tarefas/Lembretes + notificação real | 13/13 |
| T8 Perfil (somente nome) | 7/7 |
| T9 Biblioteca (PDFs reais, capas, páginas) | 10/10 |
| T10 Galeria (PNG/JPG/WebP) | 5/5 |
| T11 Arquivos (pastas físicas) | 8/8 |
| T12 MP4 + MP3 reais | 11/11 |
| T13 Meu Ambiente (widgets/desenho/diário) | 8/8 |
| T14 Cinema/YouTube/vinil/temas | 13/13 |
| T15 Janela Windows | 11/11 |
| T16 Perfil sem foto/3D/temas | 10/10 |
| T19 Barra de progresso | 9/9 |
| T20 Responsividade 5 tamanhos/rotação/leitor | 22/22 |
| T21 Recursos v5 (home editável, PDF sem erro, notificações) | 15/15 |

**Total em desenvolvimento: 142/142 aprovados.**

## Executáveis — resultados finais

| Distribuição | Resultado |
|---|---|
| **Portátil** (`release-5.0/SATURN.AI 5.0 Portable.exe`, 129,2 MB) | **142/142 aprovados** — T3 13, T8 7, T9 10, T10 5, T11 8, T12 11, T13 8, T14 13, T15 11, T16 10, T19 9, T20 22, T21 15 |
| **Instalador** (`release-5.0/SATURN.AI 5.0 Setup.exe`, 152,3 MB — `/S` → `%LOCALAPPDATA%\Programs\SATURN.AI Dashboard`) | **142/142 aprovados** — mesmas baterias e resultados |

Ambas as distribuições foram executadas de fato no Windows com `--remote-debugging-port=9222`, usando os arquivos reais das pastas de teste fornecidas (PDFs, PNG/JPG/WebP, MP4 de 46 MB e MP3 de 8,9 MB). Persistência foi validada reiniciando cada distribuição (nome do perfil, PDFs, fotos, pastas, widgets, desenho, diário e configurações continuaram disponíveis). Nenhum erro de console de runtime foi detectado; único aviso inofensivo: depreciação de `THREE.Clock`.

## Correções v5 validadas nas duas distribuições

- **Perfil**: nenhum seletor de foto, nenhum “Arquivo inválido”; nome salvo e persistente.
- **PDF**: nenhum erro “Cannot use the same canvas...” mesmo com navegação rápida entre páginas; página renderizada com conteúdo; leitor abre com mais espaço por padrão (sem tela cheia).
- **Home editável**: adicionar (inclusive relógio digital), remover, mover, trocar cor e largura, com persistência em `home_layout`.
- **Notificações/lembretes**: notificação real disparada por lembrete recorrente vencido, próxima ocorrência recalculada.
