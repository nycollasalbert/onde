# Material de Estudos

Biblioteca estática que organiza automaticamente materiais de Matemática, Física e Química.

## Adicionar um material

1. Coloque o arquivo HTML em `matematica/`, `fisica/` ou `quimica/`.
2. Use um `<title>`, um `<h1>` e uma meta descrição claros no arquivo.
3. Execute `npm run build` para atualizar `data/materiais.json`.

O gerador identifica título, descrição, assunto e tipo pelo HTML e pelo nome do arquivo. Para ajustar algum dado sem alterar o módulo, adicione uma entrada em `data/materiais.config.json` usando o caminho como chave:

```json
{
  "quimica/modulo_quimica_estequiometria_guia.html": {
    "title": "Guia simplificado de estequiometria",
    "topic": "Estequiometria",
    "type": "Guia",
    "description": "Passo a passo para resolver cálculos estequiométricos."
  }
}
```

Metadados também podem ser declarados no próprio HTML:

```html
<meta name="material:topic" content="Estequiometria">
<meta name="material:type" content="Guia">
```

`npm run build` gera a versão publicável em `dist/`. Nesse processo, os módulos recebem uma barra de navegação com retorno à biblioteca e atalhos para outros materiais do mesmo assunto; os arquivos-fonte dos módulos permanecem intactos.

Execute `npm run check` para recriar o site e verificar arquivos, links locais, JavaScript e configuração da Vercel.

## Videoaulas

O módulo de [Videoaulas](videoaulas/index.html) reúne recomendações de vídeos e playlists por disciplina, usando URLs do YouTube incorporadas ao HTML. As capas de vídeos específicos são carregadas diretamente do serviço público de miniaturas do YouTube; as playlists possuem capa alternativa. O módulo funciona sem banco de dados e tem navegação independente no menu principal.

Os links são externos, alguns vídeos abordam apenas parte do tema, e a disponibilidade depende do YouTube.
