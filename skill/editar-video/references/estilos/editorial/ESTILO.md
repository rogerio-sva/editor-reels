# Estilo editorial: talking head com cartões

O vídeo gravado da pessoa falando para a câmera, editado como revista: título gigante em serifa
**atrás** da pessoa, legenda curta em tarja verde com a palavra-chave em itálico dourado, um cartão
novo a cada 1 a 2 segundos (cupom de instrução digitado, apps riscados, grade de miniaturas, celular,
roteiro de filme...), a cor do vídeo mudando quando a pessoa diz a instrução ("mais
cinematográfico", "mais sombrio") e o CTA como um campo de comentário sendo digitado.
Referência: @justyn.ai ("I didn't edit a single second of this video").

## Quando usar

- O usuário tem um **vídeo gravado** (celular, webcam) de alguém falando e quer editar.
- Pediu "estilo editorial", "cartões", "título atrás de mim", "legenda em tarja", "igual ao Justyn".
- Não serve para: vídeo sem fala (use `cinetico`), explicar com desenho (use `quadro`).

## O fluxo deste estilo (dentro do fluxo do SKILL.md)

**Vídeo bruto** (com erros, silêncios, a mesma frase dita duas vezes): antes deste fluxo, corte e
trate o áudio com a Edição (`references/edicao/GUIA.md`, seção "Take editado"). Ela entrega o
`saida/<nome>/corte.mp4` e o `tempos.json` já no tempo do corte; aí siga daqui a partir do passo 1
com o `corte.mp4` (pule o passo 2: a transcrição já está feita).

```bash
# 1. preparar o vídeo (trecho, vertical 1080x1920, recorte da pessoa no Mac, miniaturas)
node scripts/preparar-video.mjs ~/caminho/video.mov <nome> --de=2.5 --ate=58
# 2. tempos por palavra da fala do próprio vídeo
npm i -D @remotion/install-whisper-cpp@4.0.409      # uma vez
node scripts/transcrever.mjs public/<nome>/base.mp4 src/videos/<nome>/tempos.json
#    (corrija a grafia no JSON: o whisper escreve "Cloud" para "Claude")
# 3. copiar o modelo e escrever o roteiro
cp -R src/videos/editorial-exemplo src/videos/<nome>      # troque o id no Exemplo.tsx e registre no Root
# 4. tabela de batidas → prancha de aprovação → trilha → render
node scripts/batidas.mjs src/videos/<nome>
node scripts/prancha.mjs <Id> out/<nome>/prancha-aprovacao.jpg --roteiro=src/videos/<nome>
node scripts/trilha.mjs src/videos/<nome>
npx remotion render src/index.ts <Id> out/<nome>-bruto.mp4
```

- Fala no próprio vídeo (o caso normal): deixe `"audio"` fora do roteiro e use `"volumeVideo": 1`. O
  `trilha.mjs` usa o som do vídeo para abaixar a música enquanto a pessoa fala. Narração separada
  (voz gravada à parte ou gerada): `"audio": "<nome>/narracao.mp3"` e `"volumeVideo"` baixo (0 a 0,15).
- **Recorte (título atrás da pessoa) só no Mac**: usa o Vision do macOS (precisa do Xcode Command
  Line Tools: `xcode-select --install`). No Windows/Linux o `preparar-video.mjs` avisa e segue sem
  recorte: o título fica na frente da pessoa (o efeito é pulado, o resto funciona igual).
- Velocidade de referência: 13 s de vídeo levam ~1,5 min para recortar num Mac M1.

## O roteiro.json

```json
{
 "estilo": "editorial",
 "video": "<nome>/base.mp4",
 "recorte": "<nome>/recorte.webm",
 "audio": "<nome>/narracao.mp3",
 "trilha": "<nome>/trilha.wav",
 "volumeVideo": 0.12,
 "ajusteVideo": "brightness(1.3) contrast(1.04)",
 "miniaturas": ["<nome>/mini/01.jpg", "..."],
 "paleta": { "verde": "#1E3A2A", "creme": "#F2EAD8", "ouro": "#D9B862" },
 "legenda": { "max": 3, "destaques": ["Claude.", "cinematográfico."], "y": 1290 },
 "blocos": [
  { "tipo": "titulo-atras", "em": "Eu", "ate": "vídeo.", "linhas": ["EU NÃO", "EDITEI"] },
  { "tipo": "cupom", "em": "falo:", "ate": "E", "texto": "Deixa mais cinematográfico.", "digitar_ate": "cinematográfico." },
  { "tipo": "grade", "em": "cinematográfico.", "modo": "cinema", "pelicula": true }
 ]
}
```

- `em` / `ate`: a palavra (sem acento, pontuação ou maiúscula importam), `"palavra#2"` para a segunda
  vez, `"mais cinematográfico"` para uma sequência, ou um número em segundos. O bloco entra 2 quadros
  antes da palavra e sai no fim da palavra do `ate` (+0,12 s). Sem `ate`, vale a duração padrão do tipo.
- `ajusteVideo`: filtro CSS aplicado ao vídeo sempre (vídeo escuro: `brightness(1.3)`).
- `legenda.destaques`: palavras que saem em itálico dourado na tarja (1 por frase, no máximo 2).
- Texto com `*asteriscos*` sai em itálico dourado em `titulo-atras` (`linhas`), `manchete` e `pilula`; nos outros campos os asteriscos são ignorados.
- Paleta trocável: só as chaves que mudarem (`verde`, `verdeEscuro`, `creme`, `ouro`, `papel`, `tinta`,
  `cinza`, `vermelho`).

## Regras visuais (valores exatos, tela 1080x1920)

| Elemento | Valor |
|---|---|
| Paleta padrão | verde-floresta `#1E3A2A` (tarja, telas cheias), verde escuro `#14281D`, creme `#F2EAD8` (títulos), dourado `#D9B862` (itálico de destaque), papel `#F5F0E4` (cartões), tinta `#2A2824`, cinza `#8A8478`, vermelho `#C8372D` (só anotação à mão e risco) |
| Fontes | Instrument Serif (títulos, tarja, telas), Instrument Serif Itálico (destaque), Courier Prime 700 (cupom), Inter (interface: comentário, pílula, apps), Caveat 700 (anotação vermelha à mão) |
| Título atrás | serifa 300 px em caixa alta, entrelinha 1,02, tracking -2%, encolhe sozinho para caber em 880 px (sobra margem mesmo com o zoom da câmera), medindo o itálico na fonte itálica; linhas sobem de uma máscara com 0,08 s de defasagem; topo em y 360 |
| Manchete (frente) | serifa 150 px (132 se for longa), centro, y 170; cada palavra entra quando é dita (desfoque 10 → 0) |
| Legenda | tarja `verde`, raio 10 px, serifa 60 px branca `#FBF7EE`, 2 a 4 palavras, y 1290 (peito); cresce palavra a palavra; some quando há manchete, pílula ou tela cheia |
| Cartões do alto | começam em y 200, sombra `0 18px 34px rgba(0,0,0,.36)`, entram de cima com mola (passam do ponto e assentam) e saem para cima |
| Cupom | 620 px, papel serrilhado em cima e embaixo (dente 16 px), giro -2°, cabeçalho "INSTRUÇÃO 01 · tempo · PARA O CLAUDE", texto em Courier 46 px digitado **palavra a palavra quando é dita**, "TOTAL 1 FRASE" no fim, régua verde de tempo embaixo |
| Grade de cor | `natural`, `cinema` (sombra azul-petróleo, luz quente, saturação 1,2, faixas pretas de 150 px, vinheta .55, grão .10), `sombrio` (saturação .6, brilho .78, vinheta .8), `quente`, `pb`. A nova grade desce como cortina em 0,32 s com soco de zoom de 3,5% |
| Câmera | aproximação lenta 1,00 → 1,06 no vídeo inteiro |
| Ritmo | um bloco novo a cada 1 a 2 s; nada parado mais de 2 s sem um cartão, uma troca de cor ou um whip |

## Blocos (18 cartões + o `layout`)

| `tipo` | O que mostra | Parâmetros (além de `em`, `ate`) |
|---|---|---|
| `titulo-atras` | título gigante atrás da pessoa | `linhas` (1 a 3), `y`, `tam` |
| `manchete` | título serifado na frente, no alto | `texto` (`*itálico*`), `tam`, `y` |
| `cupom` | cartão de instrução digitado | `texto`, `digitar_ate`, `numero`, `para`, `rotulo`, `total`, `y` |
| `apps` | tela de apps; cada app some riscado na palavra | `apps` [{`nome`, `icone`, `cor`}], `riscar` [{`app`, `em`}], `fim` {`texto`, `em`}, `titulo` |
| `miniaturas` | grade de miniaturas caindo atrás da pessoa (`modo: "atras"`) ou calendário verde preenchendo (`"calendario"`) | `modo`, `titulo`, `y` |
| `celular` | tela verde com celular mostrando o próprio vídeo | - |
| `roteiro-filme` | tela verde com moldura dupla; a fala entra palavra a palavra; a última em itálico dourado grande | `cabecalho`, `italico` (lista de palavras) |
| `grade` | troca a cor do vídeo | `modo`, `pelicula` (borda com furos), `barras: false` |
| `paleta` | painel com 5 cores nomeadas e hex | `modo` ou `cores` [[nome, hex]], `titulo`, `x`, `y` |
| `whip` | chicote: a imagem sai para a esquerda com borrão e volta pela direita (0,36 s) | - |
| `comentario` | campo de comentário digitando a palavra, publica, chega a resposta | `texto`, `resposta`, `perfil`, `inicial`, `botao`, `y` |
| `palavra-imagem` | palavra gigante com o vídeo/foto dentro das letras, fundo creme | `linhas` ou `texto`, `imagem`, `tam`, `brilho` |
| `pelicula` | contato de película com anotações vermelhas à mão (círculo, X) | `anotacoes` [{`quadro`, `texto`, `marca`}] |
| `minutos-depois` | "UNS MINUTOS DEPOIS" com timecode correndo | `linhas` |
| `teclas` | teclas 3D flutuando | `teclas`, `y` |
| `pilula` | pílula verde grande + itálico dourado ("uma *frase.*") | `texto`, `y` |
| `circulo` | círculo vermelho à mão + seta e "eu" | `x`, `y`, `r`, `texto` (combine com `grade` `pb`) |
| `faixa-cta` | faixa verde no alto: Comenta "PALAVRA" e eu te mando | `texto`, `palavra`, `sub`, `y` |
| `layout` | muda onde fica o vídeo da pessoa: `cheio`, `dividido` (motion em cima, pessoa embaixo) ou `pequeno` (motion na tela toda, pessoa pequena embaixo à esquerda, recortada no Mac); troca com mola de 0,6 s | `modo`, `foco` [x, y] (o ponto do vídeo que fica no meio do painel no `dividido`; padrão [540, 900]) |

Ver todos de uma vez: composição `Editorial-Catalogo`
(`node scripts/prancha.mjs Editorial-Catalogo out/catalogo.jpg --quadros=28,80,130,182,232,284,334,386,436,488,538,590,640,691,742,794,844,895 --colunas=9`).

## Escolher bloco por frase (o que o Justyn faz)

| A fala diz... | Bloco |
|---|---|
| o gancho ("eu não editei nada") | `titulo-atras` |
| quem fez / o nome da ferramenta | `manchete` com o nome em itálico |
| "sem X, sem Y, nada" | `apps` com `riscar` e `fim` |
| a instrução que a pessoa deu | `cupom` + `grade` na palavra-chave da instrução |
| "meus vídeos", "tudo isso" | `miniaturas` |
| "o que você está vendo agora" | `celular` |
| "como um roteiro de filme" | `roteiro-filme` |
| "eu não sei editar", "teclado" | `teclas` |
| "os takes ruins", "o bruto" | `pelicula` |
| "minutos depois" | `minutos-depois` |
| "o meu jeito é diferente" | `grade` `pb` + `circulo` |
| "é só uma frase" | `pilula` |
| troca de assunto | `whip`, ou um `layout` novo (dividido / pequeno / cheio) |
| "esse aqui é o meu", mostrar algo grande | `layout` `pequeno` + cartão na área de motion |
| CTA de comentário | `comentario` + `faixa-cta` |

## Checklist antes do render

- [ ] Cada bloco está preso a uma palavra que existe no `tempos.json` (`node scripts/batidas.mjs` não dá erro).
- [ ] Nenhum trecho de mais de 2 s só com a legenda.
- [ ] O título atrás não cobre o rosto: confira na prancha se a cabeça passa **na frente** das letras (se não, o recorte faltou: veja o aviso do `preparar-video`).
- [ ] Tarja legível: 2 a 4 palavras, 1 destaque por frase.
- [ ] Cartões no alto não cortam a cabeça; se a pessoa está no alto do quadro, use `y` maior.
- [ ] A cor muda **na palavra** da instrução, não antes.
- [ ] Com `layout`: no `dividido` o rosto aparece inteiro no painel de baixo (senão, ajuste o `foco`);
  no `dividido` e no `pequeno` a área de motion não fica vazia (a agenda segura o cartão anterior se sobrar
  buraco de mais de 0,5 s; confira na tabela de batidas); `titulo-atras` só no `cheio`.
- [ ] Logo de terceiro: os apps são ícones genéricos com o nome em texto. Não use logo real sem direito.
