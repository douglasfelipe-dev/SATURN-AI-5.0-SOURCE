# CHANGELOG — SATURN.AI Dashboard 3.0

Data: 19/11/2026

## Problemas encontrados (diagnóstico)

1. **Imagens quebradas em toda a aplicação**: capas dos livros, miniaturas da galeria, fotos do perfil e vídeos locais usavam `file:///` a partir de páginas servidas em `http://localhost`. O Chromium bloqueia sub-recursos `file://` por segurança. Caminhos com espaços/acentos também não eram codificados.
2. **Prévia do perfil falhava** com `Failed to execute 'createObjectURL'` quando o arquivo recebido não era um Blob/File válido.
3. **Capas de PDF pretas**: canvas renderizado sem fundo branco e URLs de capa inválidas; páginas podiam aparecer vazias.
4. **Importações não mostravam erro** para formatos inválidos.
5. **Arquivos não eram um gerenciador real**: pastas existiam apenas no banco, sem diretórios físicos.
6. **MP4 reportava "formato não suportado"**: reprodução dependia de `file://` e não havia tratamento de Range/codecs.
7. **MP3 não existia como funcionalidade local**.
8. **Widgets não podiam ser movidos/redimensionados de forma confiável** e não havia desenho nem diário.
9. **Sala de cinema 3D** ocupava espaço e prejudicava a visualização do vídeo.
10. **Barra lateral com verde fixo**, ignorando o tema escolhido.
11. **Identidade do usuário e do aplicativo misturadas** no cabeçalho.
12. **Animação do toca-discos invertida** (agulha saía ao dar Play).
13. **Versão 2.0.1** ainda identificada em metadados e documentação.

## Correções realizadas

- Servidor HTTP local (Electron + middleware Vite) com endpoint `/media?path=...`, MIME correto e suporte a Range para vídeo. Todas as mídias passaram a usar `mediaUrl()`.
- Perfil: prévia via `FileReader.readAsDataURL`, validação de PNG/JPG/JPEG/WebP e salvamento com fallback base64.
- Biblioteca: estante 2D por categorias, gerador de capa via PDF.js com fundo branco, leitor com renderização em alta DPI, anotações e marcadores, visualizador 3D por livro com rotação/zoom.
- Galeria: importação individual e em lote, miniaturas HTTP, lightbox, exclusão e mensagens de erro.
- Arquivos: pastas e subpastas físicas no disco com operações reais (`fs:op`), movimentação, cópia, renomeação e exclusão persistidas no banco.
- Vídeos: reprodução via HTTP com Range, detecção de erro de codec com mensagem clara, controles completos.
- Músicas locais: novo módulo com importação MP3/WAV/OGG/M4A, playlist persistente e reprodução contínua.
- Meu Ambiente: arraste/redimensionamento por Pointer Events, restauração de layout, mesa de desenho (caneta, lápis, borracha, cores, espessura, desfazer/refazer, salvar PNG) e diário persistente.
- Cinema: ambiente 3D removido; telão 2D 16:9 com tela cheia e captura de quadro. **Mecanismo do YouTube preservado**.
- Temas: barra lateral, ícones, itens ativos e indicadores passaram a usar variáveis CSS do tema.
- Identidade: `SATURN.AI Dashboard v3.0` na marca; assinatura `douglasfelipe.dev · CREATOR` na base da lateral; nome do usuário no topo.
- Toca-discos: ângulo do braço corrigido (Play = agulha no disco; Pause = braço no apoio) e disco gira somente com reprodução real.
- Versão 3.0 em `package.json`, preload, título, documentação e executáveis.

## Funcionalidades adicionadas

- Módulo **Músicas locais** (MP3).
- Widgets **Ferramentas de desenho**, **Diário** e **Ferramentas**.
- Botão **Restaurar layout**.
- Endpoint HTTP `/media` com suporte a Range.
- Operações de sistema de arquivos `fs:op` no IPC.

## Melhorias visuais

- Estante 2D organizada com prateleiras e capas em destaque.
- Telão de cinema amplo com overlay de título e controles discretos.
- Cartões, ícones e botões seguem o tema ativo sem cores fixas.

## Testes executados

Ver `RELATORIO_TESTES_3.0.md` para resultados individuais em desenvolvimento, executável instalado e versão portátil.

## Correções do complemento (após análise das capturas em `ERROS A SER CORRIUGIDPS`)

1. **Janela do Windows**: de `frame:false` para janela nativa com `titleBarStyle:'hidden'`, `resizable/movable/fullscreenable`. Topbar marcada como `-webkit-app-region: drag`, controles como `no-drag`. Agora a janela pode ser arrastada entre monitores, redimensionada, minimizada, maximizada e restaurada. Testes com Win32 `MoveWindow` confirmaram movimentação para x=1950 (região de segundo monitor) e redimensionamento.
2. **Foto de perfil na dashboard**: avatar circular (`dash-avatar`) com `object-fit:cover`, alimentado pelo mesmo `settings.avatar`; foto aparece na saudação e persiste após reiniciar.
3. **Visualizador 3D dos livros**: capa carregada como data URL via IPC (sem CORS/caminho), geometria reconstruída (capa frente/costa + bloco de páginas + lombada), controles de giro esquerda/direita, inclinação, zoom e reset. Captura visual confirmou a capa do "Alice no País das Maravilhas" renderizada.
4. **Temas**: removidas cores fixas de `body[data-dark]`; App passou a calcular paleta escura a partir do tema ativo e a usar `customColors` para presets fora do mapa antigo. Todos os 7 temas agora alteram a barra lateral (cores medidas individualmente).
5. **Barra de progresso do Cinema**: componente `Progress` reescrito com `onPointerDown/Move/Up`, pointer capture, teclado e knob visível; clique no meio avançou de 5s para 181s, arraste retrocedeu para 21s; botões −5s/+5s e tela cheia funcionando. Mecanismo do YouTube intacto.
6. **Leitor de PDF**: zoom inicial automático (mín. 200%), botão "Ajustar largura", campo de página, temas Claro/Sépia/Escuro e navegação por teclado. Página renderizada a ~991px de largura nos testes.

Novas baterias: T15 (janela, 11 testes), T16 (perfil/3D/temas, 12 testes), T19 (progresso, 9 testes) — **32/32 aprovados**.

## Atualização final (pasta `detalhes`, `detele` e `exemplo de abas`)

- **Responsividade real**: media queries em 1240/1020/760/520px; sem estouro horizontal em 1240, 1000, 820, 680 e 520px. Sidebar reduz de 232 → 200 → 76 → 62 → 52px. Janela aceita até 480×360.
- **Movimentação da janela**: confirmado frame nativo com `WS_THICKFRAME`; move para qualquer posição (inclusive x=1950, região de segundo monitor), redimensiona, minimiza/maximiza/restaura. Arraste pela barra superior e pela lateral.
- **Cantos arredondados**: `DWMWA_WINDOW_CORNER_PREFERENCE` aplicado na janela do Windows + `border-radius` no shell, acompanhando o estilo dos exemplos macOS.
- **Removido o chip de usuário do topo** (foto quebrada mostrada na pasta `detele`). O nome/avatar do usuário continua na dashboard.
- **Disco**: rotação a 33⅓ RPM (3.49 rad/s) agora gira também o selo central e um reflexo, sincronizada ao player real.
- **Leitor de livros**: botões "Modo leitura" (esconde painel lateral) e "Tela cheia", além do zoom existente.
- Vídeo de referência em `detalhes/` analisado: disco girando com braço posicionado — comportamento reproduzido.

Testes: T20 (22) aprovado; regressão completa T8–T19 aprovada após as mudanças.

## Problemas que permanecem / limitações

- Vídeos com codecs não suportados pelo Windows (ex.: alguns MKV/AVI) exibem mensagem clara; H.264/AAC em MP4 é o caminho recomendado.
- YouTube respeita restrições de incorporação e DRM; nada é contornado.
- Lembretes exigem aplicativo em execução e permissão de notificação do Windows.
- Clima depende de internet (Open-Meteo).
- Marcação em PDF é feita como anotações/marcadores, não como seleção de texto sobreposta.
