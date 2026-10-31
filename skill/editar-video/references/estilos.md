# Estilos da Skill Motion

| Estilo | O que é | Quando usar | Precisa de | Referência visual |
|---|---|---|---|---|
| `cinetico` | tipografia cinética escura, mira de laser, faísca, 20 transições | vinheta, abertura, anúncio animado, reel narrado sem rosto | texto ou narração | o filme modelo da v1 |
| `editorial` | o seu vídeo falando para a câmera com cartões por cima: título gigante atrás de você, legenda em tarja com itálico dourado, cupom de instrução, cor que muda na frase, CTA de comentário | reel de talking head, vídeo gravado no celular, "edita o meu vídeo" | um vídeo gravado (MP4/MOV) com fala | @justyn.ai |
| `quadro` | quadro branco: um lápis desenha ícones de traço fino e rótulos à mão no ritmo da fala; verde para o bom, vermelho com X para o ruim | explicar uma ideia, um processo, antes x depois, "de um jeito visual" | narração (áudio) ou texto; rosto opcional na abertura | @beprecht / @davidabn_ |

## Como escolher (passo 0 do SKILL.md)

0. Vídeo gravado para **editar** (cortar erros e silêncios, legendar, montar o motion por cima) é a
   **Edição** (`edicao/GUIA.md`): o take editado corta e trata o áudio e depois usa o `editorial`.
1. O usuário disse o estilo ("editorial", "quadro branco", "lápis", "tipografia cinética") → esse.
2. Mandou um **vídeo gravado com alguém falando** e quer editar → `editorial`.
3. Pediu para **explicar/desenhar** uma ideia, "quadro", "desenho", "rabisco", "whiteboard" → `quadro`.
4. Anexou imagens de referência → compare com a coluna "referência visual" e diga qual dos três
   chega mais perto e o que não dá para copiar (ver "style bible" no SKILL.md).
5. Nada disso → `cinetico` (o padrão), e diga em uma linha que existem os outros dois.

Cada estilo tem o seu `estilos/<estilo>/ESTILO.md` com as regras visuais e os valores exatos. O som
(trilha e efeitos por código) é comum aos três: `references/som.md`.
