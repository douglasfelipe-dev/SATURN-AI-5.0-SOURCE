# RELATÓRIO DE TESTES — SATURN.AI Dashboard 3.0

Metodologia: automação via Chrome DevTools Protocol (CDP) com eventos de entrada reais, verificando DOM, banco SQLite, arquivos no disco e estado de mídia dos players. Arquivos de teste fornecidos foram usados obrigatoriamente.

## Resultados em desenvolvimento

| Bateria | Escopo | Resultado |
|---|---|---|
| T8 | Perfil: PNG, JPG, WebP, prévia, confirmação, nome, persistência | 12/12 aprovados |
| T9 | Biblioteca: 2 PDFs reais, capas, páginas, navegação, estante 2D, viewer 3D | 10/10 aprovados |
| T10 | Galeria: PNG/JPG/WebP individuais e em lote, miniaturas, lightbox, persistência | 5/5 aprovados |
| T11 | Arquivos: pasta física, subpasta, importar, mover, renomear, copiar, excluir, persistência | 8/8 aprovados |
| T12 | MP4 real (46 MB) + MP3 real (8,9 MB): importar, reproduzir, pausar, retomar, volume | 11/11 aprovados |
| T13 | Ambiente: restaurar layout, mover/redimensionar widgets, desenho, diário, persistência | 8/8 aprovados |
| T14 | Cinema: YouTube real, pausa/retomada, tela cheia; vinil 3D; temas; identidade | 13/13 aprovados |

Total em desenvolvimento: **67/67 aprovados**. Varredura de console em todos os 14 módulos: nenhum erro de runtime.

## Arquivos de teste utilizados

- `IMAGEM PARA TESTES/` — 2 JPGs; conversões locais para PNG e WebP em `tests/fixtures30/`.
- `LIVROS PDF PARA TESTE/` — "A Culpa E Das Estrelas - John Green.pdf" e "alice-pais-das-maravilhas.pdf" (nomes com espaços e acentos, testando codificação de caminhos).
- `VIDEO PARA TESTE/2026-11-19 15-27-01.mp4` — 46,57 MB.
- MP3 real baixado para `tests/fixtures30/musica teste.mp3` (8,9 MB) — não havia MP3 nas pastas fornecidas.

## Complemento — novas correções testadas (capturas da pasta `ERROS A SER CORRIUGIDPS`)

| Bateria | Escopo | Resultado |
|---|---|---|
| T15 | Janela nativa: WS_THICKFRAME, MoveWindow, segundo monitor (x=1950), redimensionar, minimizar, maximizar, restaurar, regiões de arraste | 11/11 aprovados |
| T16 | Foto na dashboard circular e persistente; livro 3D com capa e controles; leitor com zoom/tema; 7 temas alterando a lateral | 12/12 aprovados |
| T19 | Progresso do Cinema: clique no meio (5s → 181s), arraste (181s → 21s), +5s/−5s, tela cheia | 9/9 aprovados |

Capturas analisadas: 4 imagens mostrando capa 3D branca, avatar pequeno/cortado, chip do topo e barra de progresso inerte. Captura de validação após correção: `tests/book3d-fixed.png`.

## Atualização final de responsividade/movimentação/visual

| Bateria | Escopo | Resultado |
|---|---|---|
| T20 | 5 tamanhos de janela (1240→520px) sem estouro, sidebar adaptável, chip removido, cantos arredondados, rotação do vinil com ângulo avançando (13.86 → 17.76 rad), modo leitura | 22/22 aprovados |

Regressão completa (T8–T19) executada novamente após as alterações: **todas aprovadas**.

## Executáveis — resultados finais

| Distribuição | Resultado |
|---|---|
| **Portátil** (`release-3.0/SATURN.AI 3.0 Portable.exe`) | **121/121 aprovados** — T8 12, T9 10, T10 5, T11 8, T12 11, T13 8, T14 13, T15 11, T16 12, T19 9, T20 22 |
| **Instalador** (`Setup.exe /S` → `%LOCALAPPDATA%\Programs\SATURN.AI Dashboard`) | **121/121 aprovados** — mesmas baterias e resultados |

> Executáveis recompilados após as últimas alterações de responsividade, remoção do chip, cantos arredondados, rotação do vinil e modo leitura. Logs finais: `tests/portable-final32.log` e `tests/installed-final32.log`.

> As 32 novas baterias (T15/T16/T19) foram executadas após a recompilação final com as correções do complemento. Logs: `tests/portable31-new.log` e `tests/installed31-new.log`.

Ambas foram executadas de fato no Windows com `--remote-debugging-port=9222`, usando os arquivos das pastas de teste fornecidas. Persistência foi validada reiniciando cada distribuição (fotos, PDFs, pastas, widgets, desenho, diário e configurações continuaram disponíveis).

Logs brutos: `tests/portable30-results.log` e `tests/installed30-results.log`.

> **Observação sobre o segundo monitor:** o ambiente de testes tem apenas um monitor físico. A capacidade de mover a janela para a região de um segundo monitor foi validada movendo a janela nativa do Windows para a coordenada x=1950 via Win32 `MoveWindow` e confirmando o novo bounds pelo IPC (`win:bounds`). A janela usa frame nativo (`WS_THICKFRAME`), portanto o arraste real entre monitores é feito pelo próprio Windows.

## Registro de erros do console

Varredura com Runtime.enable via CDP nos 14 módulos: nenhuma exceção de runtime. Únicos avisos: depreciação de `THREE.Clock` (inofensiva) e avisos do próprio Vite sobre otimização de dependências — sem impacto funcional.
