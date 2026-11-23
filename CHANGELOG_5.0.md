# CHANGELOG — SATURN.AI Dashboard 5.0

## Correções
- **Perfil**: removida a opção de foto (que gerava “Arquivo inválido”). Agora só é possível editar o nome; referências antigas de avatar são limpas.
- **PDF**: corrigido o erro “Cannot use the same canvas during multiple render() operations” — a tarefa de renderização anterior agora é cancelada e aguardada antes de reutilizar o canvas. Navegação rápida entre páginas testada.
- **Dashboard**: widgets agora são editáveis — modo “Editar página”, adicionar (inclusive relógio digital e nota rápida), remover, mover, trocar cor e largura. Persistência em `home_layout`.

## Melhorias
- Leitor de livros abre com mais espaço por padrão (painel lateral oculto), mantendo zoom, temas e tela cheia opcional.
- Capas na estante com sombra e lombada para aparência física.
- Versão atualizada para **5.0** em título, marca, configuração e executáveis.

## Testes
- Suíte completa de 142 testes executada: notas, tarefas, lembretes com notificação real, mídias, PDFs, galeria, pastas, widgets, temas, janela/responsividade e recursos v5. Todas aprovadas.
