# Edição: guia do agente

> Fluxo principal deste projeto: `skill/editar-video/SKILL.md` (scripts em `scripts/reel/`). Este guia cobre os formatos extras.

A Edição transforma um vídeo gravado (ou slides, ou só um tema) em vídeo vertical 1080x1920 pronto
para Reels, TikTok e Shorts. Você não escreve código de vídeo do zero: você roda os scripts de
`scripts/editor/` e escreve o **roteiro** (um JSON). Todos os comandos rodam dentro da pasta de
trabalho (a cópia do `projeto/`, em geral `motion/`).

No Codex ou no Cursor, este mesmo texto está no `AGENTS.md` da pasta do projeto. O suporte oficial é
o Claude Code.

## Antes do primeiro vídeo

Rode `node scripts/editor/verificar-ambiente.mjs`. Ele confere o Node (22.18 ou mais novo), o ffmpeg
do sistema, as dependências e a marca, e diz como resolver o que faltar. Se faltar algo, siga o
`references/edicao/instalar.md` da skill (ffmpeg, chave da ElevenLabs opcional, voz e marca), um passo
por vez.

A chave da ElevenLabs (`.env`) é **opcional**. Sem ela: a transcrição roda no computador (Whisper
local, mais lenta) e o áudio do take passa só pelo filtro do ffmpeg. Com ela: transcrição melhor, o
isolamento de voz (tira o eco da sala) e a narração do formato "do zero", que só existe com a chave.

## Os formatos

Os arquivos da pessoa podem ficar em `entrada/` (ou onde ela disser). O resultado sai em `saida/`
(formatos da Edição) ou em `out/` (take editado, que usa o estilo editorial).

| Formato | A pessoa entrega | Caminho |
|---|---|---|
| **Take editado** (o padrão de "edita o meu vídeo") | o vídeo bruto falando, com erros e silêncios | seção "Take editado" abaixo: corta erros e silêncios, trata o áudio, legenda em tarja e motion editorial por cima, alternando layouts |
| Reel legendado | vídeo falando | `node scripts/editor/transcrever.mjs <video>` e depois `node scripts/editor/montar-reel.mjs --video <video> --palavras saida/<video>.palavras.json --nome <nome>` |
| Tela dividida | vídeo falando | `node scripts/editor/transcrever.mjs <video>` e depois `node scripts/editor/montar-tela-dividida.mjs --video <video> --palavras saida/<video>.palavras.json --nome <nome>` |
| Carrossel em vídeo | pasta de slides (PNG ou JPG) e um take | `node scripts/editor/montar-carrossel.mjs --slides <pasta> --take <video> --inicio <s> --nome <nome>` |
| Do zero | só o tema | você escreve `roteiros/<nome>.json` inteiro (modelo abaixo); precisa da chave da ElevenLabs |

Como escolher: vídeo bruto com erros, ou "corta os silêncios e põe legenda e motion" → take editado.
"Só legenda", sem cartões → reel legendado. Motion numa metade e a pessoa na outra o tempo todo →
tela dividida. Slides prontos → carrossel em vídeo. Só um tema, sem gravar → do zero.

## O trilho obrigatório

Todo vídeo passa por estes passos, nesta ordem. **As duas aprovações não são opcionais.**

1. **Entender o pedido.** Formato, público, objetivo do vídeo. Pergunte só o que faltar.
2. **Preparar.** Rode o comando do formato. Ele converte o vídeo, transcreve e grava o roteiro
   inicial (no take editado: propõe os cortes).
3. **Escrever o roteiro.** Complete `roteiros/<nome>.json`: as cenas (tela dividida e do zero), os
   zooms (reel) ou a ordem dos slides (carrossel). No do zero, escreva também o texto da narração.
   No take editado, o roteiro é o `src/videos/<nome>/roteiro.json` do estilo editorial.
4. **Aprovação do roteiro.** Mostre para a pessoa, em texto corrido, a narração (se houver) e a
   lista de cenas com a frase em que cada uma entra (no take editado: o texto que ficou depois do
   corte e a tabela de batidas). **Não chame a ElevenLabs antes do ok**: a narração é o passo que
   gasta crédito.
5. **Narrar** (só no do zero): `node scripts/editor/narrar.mjs roteiros/<nome>.json`.
6. **Prévia:** `node scripts/editor/previa.mjs roteiros/<nome>.json`. Abra a folha de quadros
   (`saida/<nome>-folha.jpg`) e confira você mesmo: a cena certa na frase certa, texto legível,
   nada cortado, nenhum dado sensível na tela. Corrija antes de mostrar. (Take editado: prancha de
   aprovação e um render em `--scale=0.5`, ver abaixo.)
7. **Aprovação da prévia.** Mostre a prévia (`saida/<nome>-previa.mp4`) e espere o ok. **Não rode o
   render final antes.**
8. **Render final:** `node scripts/editor/render.mjs roteiros/<nome>.json`. Entregue o caminho do mp4.

Mudança pedida depois de uma aprovação volta para o passo daquela aprovação.

## Take editado: do bruto ao reel com motion

Para quem grava falando, erra, para e fala de novo. O resultado: só a última tomada de cada frase,
sem os silêncios, com a voz tratada, legenda em tarja palavra a palavra e o motion do estilo
editorial por cima, trocando de layout (a pessoa cheia com cartões, a tela dividida, o motion cheio
com a pessoa pequena). Leia também o `references/estilos/editorial/ESTILO.md` inteiro: os cartões e
as regras visuais estão lá.

```bash
# 1. trata o áudio, transcreve palavra a palavra e PROPÕE os cortes (não corta nada ainda)
node scripts/editor/propor-cortes.mjs ~/Downloads/take.mov <nome>
# 2. confira a lista de frases que ele imprime (FICA / SAI e o motivo); ajuste saida/<nome>/cortes.json se precisar
# 3. corta: vídeo sem erros nem silêncios, com a voz tratada, e as palavras já no tempo do corte
node scripts/editor/aplicar-cortes.mjs <nome>
# 4. prepara para o editorial: vertical 1080x1920, recorte da pessoa (Mac) e miniaturas
node scripts/preparar-video.mjs saida/<nome>/corte.mp4 <nome>
# 5. copie Exemplo.tsx e roteiro.json de src/videos/editorial-exemplo/ para src/videos/<nome>/
#    (o tempos.json já está lá), troque o id no Exemplo.tsx, registre no src/Root.tsx e escreva o roteiro
# 6. batidas, prancha de aprovação, trilha, prévia, render e volume final
node scripts/batidas.mjs src/videos/<nome>
node scripts/prancha.mjs <Id> out/<nome>/prancha-aprovacao.jpg --roteiro=src/videos/<nome>
node scripts/trilha.mjs src/videos/<nome>
npx remotion render src/index.ts <Id> out/<nome>-previa.mp4 --scale=0.5
npx remotion render src/index.ts <Id> out/<nome>-bruto.mp4
node scripts/editor/masterizar.mjs out/<nome>-bruto.mp4 out/<nome>.mp4
```

**O que o propor-cortes tira, e como conferir.** Frase interrompida (a transcrição da ElevenLabs marca
a palavra cortada com `--`), frase refeita (a mesma frase dita de novo logo depois: fica sempre a
**última** tomada), frase só de hesitação ("hum", "ahn") e todo silêncio maior que 0,22 s entre duas
palavras (fica uma folga curta nas pontas, para a fala não soar robótica). Leia a lista inteira antes
de cortar. Ele erra para os dois lados: frase repetida de propósito ("não é sobre X, não é sobre Y")
pode sair como refeita, e um tropeço dentro da palavra ("ca-seu carrossel") só é apontado, não
cortado. Para corrigir, edite `saida/<nome>/cortes.json`: `"fica": true/false` em cada frase, e
`"tirarPalavras": [índices]` para tirar palavras soltas (o índice aparece no aviso de tropeço e em
`saida/<nome>/palavras.json`). Depois rode o `aplicar-cortes.mjs` de novo; ele não transcreve de novo.
Sem a chave, a transcrição é do Whisper, que não marca palavra interrompida: confira com mais cuidado.
Take já limpo (sem erros)? Pule os passos 1 a 3 e prepare o próprio vídeo (`--de` e `--ate` no passo 4).

**Áudio.** Com a chave, o propor-cortes manda a voz para o isolamento de voz da ElevenLabs (tira eco e
ruído de sala; a duração não muda, então os tempos continuam valendo). Depois, com ou sem chave, o
filtro do ffmpeg (corte de grave, médio mais limpo, presença, compressor). Cada emenda leva 12 ms de
fade. O volume final (-14 LUFS, o de Reels) é acertado só no fim, pelo `masterizar.mjs`, em duas
passadas: uma passada só parou em -17 LUFS num take real.

**Roteiro do take editado** (`src/videos/<nome>/roteiro.json`): a fala está no próprio vídeo, então
`"volumeVideo": 1` e nada de `"audio"`. Cole `video`, `recorte` e `miniaturas` do `info.json` que o
preparar-video gravou. Os blocos seguem o `ESTILO.md` do editorial, mais o bloco `layout`:

```json
{"tipo": "layout", "em": "primeiro", "modo": "dividido", "foco": [540, 900]}
```

| `modo` | O que faz |
|---|---|
| `cheio` | a pessoa na tela inteira, cartões por cima (o começo de todo vídeo) |
| `dividido` | motion em cima, a pessoa embaixo; `foco` = o ponto do vídeo (x, y em 1080x1920, de preferência o rosto) que fica no meio do painel de baixo |
| `pequeno` | motion na tela toda e a pessoa pequena embaixo à esquerda: recortada e sem fundo no Mac; sem recorte, numa janela com borda |

O layout vale até o próximo bloco `layout` (ou até o `ate`, voltando para o cheio). A troca é uma
mola de 0,6 s com um whoosh baixo. Ritmo que funcionou num reel de 58 s: 14 trocas, uma a cada 3 a
7 s, sempre numa virada de assunto ("A segunda...", "Esse aqui é o meu"), nunca no meio de uma
ideia. No `dividido` e no `pequeno` ponha sempre um cartão na área de motion (`manchete`, `cupom`,
`apps`, `pilula`, `comentario`, `teclas`, `paleta`). Se sobrar buraco de mais de 0,5 s, a agenda
preenche sozinha: segura o cartão anterior até o próximo entrar e, se o layout começa sem cartão, o
primeiro cartão entra junto com ele (a tabela de batidas já mostra os tempos ajustados;
`"preencherPainel": false` no roteiro desliga). O `titulo-atras`
só funciona no `cheio`. A legenda (tarja) muda de altura sozinha com o layout.

## Como escrever as cenas (tela dividida e do zero)

Cada cena tem uma **âncora**: um trecho curto, de duas a quatro palavras, **dito na fala**. A cena
entra quando a âncora é falada e fica até a âncora da próxima. Se a âncora não estiver na
transcrição, o render para e diz qual é. Copie a âncora da transcrição, não da memória.

| Tipo | Campos | Quando usar |
|---|---|---|
| `titulo` | `texto` | uma frase de impacto, até 6 palavras |
| `numero` | `valor`, `texto` opcional | número que prova algo (`"10%"`, `"R$ 110"`) |
| `lista` | `texto` opcional, `itens` (até 4) | passos, itens, comparação |
| `icone` | `icone`, `texto` opcional | ideia abstrata; ícones: `check`, `alerta`, `seta`, `relogio`, `dinheiro`, `cerebro`, `raio`, `pessoa` |
| `imagem` | `imagem` (caminho dentro de `public/`) | quando houver imagem gerada ou da pessoa |

Uma ideia por cena. Troque de cena quando o assunto muda, não a cada palavra. Onde há o que ler,
dê tempo de ler (pelo menos 1,5 s); onde não há, pode ser rápido.

## Modelos de roteiro

Do zero:

```json
{
  "formato": "do-zero",
  "narracao": {
    "velocidade": 1.0,
    "blocos": [
      {"id": "gancho", "texto": "Você paga duzentos reais por mês numa IA e usa dez por cento dela."},
      {"id": "virada", "texto": "O problema não é a ferramenta. É que ela não sabe nada sobre você."}
    ]
  },
  "cenas": [
    {"ancora": "você paga", "tipo": "numero", "valor": "R$ 200", "texto": "por mês"},
    {"ancora": "dez por cento", "tipo": "numero", "valor": "10%"},
    {"ancora": "o problema", "tipo": "titulo", "texto": "Não é a ferramenta"}
  ]
}
```

Tela dividida (o comando de montar grava o resto; você preenche `cenas` e pode trocar `filmagem`
para `"cima"`):

```json
{"cenas": [{"ancora": "eu paguei", "tipo": "titulo", "texto": "R$ 110 por mês"}]}
```

Reel legendado (você preenche `zooms`, em segundos do vídeo já cortado, só nos momentos de ênfase):

```json
{"zooms": [{"de": 3.2, "ate": 5.0}]}
```

Carrossel: a ordem dos slides é a ordem alfabética dos arquivos. Para mudar, renomeie
(`01-...png`, `02-...png`). `--inicio` pula o começo do take (a pessoa chegando na cadeira, por
exemplo); `--velocidade` acelera o take (padrão 6x).

## Regras de edição

Cada regra aqui custou retrabalho. Siga todas.

1. **Narração bloco a bloco, sem pausa inserida.** Um bloco é uma ou duas frases. Nunca coloque
   reticências, vírgula extra ou quebra só para "dar respiro": vira fala picada. A velocidade fica
   entre 1.0 e 1.08.
2. **Sincronizar gesto com fala:** antes de ancorar uma cena num gesto da filmagem (a pessoa
   apontando, contando nos dedos), olhe a filmagem a **8 quadros por segundo** naquele trecho.
   Olhar um quadro a cada meio segundo inventa gesto que não existe.
3. **Contraste mínimo de 4,5:1** em todo texto sobre filmagem. Meça:
   `node scripts/editor/contraste.mjs saida/<nome>-previa.mp4 <segundo> <x0,y0,x1,y1>` (na prévia, as
   coordenadas são a metade). Abaixo disso, mude a posição ou a cor, nunca entregue.
4. **Legenda: nunca caixa atrás** nos formatos da Edição (reel, tela dividida): ela já sai com
   contorno. No take editado a legenda é a tarja do editorial, que é o próprio estilo. Filmagem
   sempre em tela cheia na área dela, sem barras pretas.
5. **Efeito sonoro baixo e só na troca** nos formatos da Edição; música não vai no vídeo (oriente a
   pessoa a escolher no Instagram ou no Edits, que já têm licença). No take editado, a trilha é a do
   `scripts/trilha.mjs`, gerada por código e abaixando sozinha quando a pessoa fala.
6. **Gravação de tela pode vazar dado de cliente** (nome, telefone, valor, e-mail). Olhe os quadros
   de qualquer gravação de tela antes de usar. Um quadro não basta: olhe a folha inteira.
7. **Não prometa que funciona sem internet.** O vídeo é montado na máquina, mas a narração, a
   transcrição da ElevenLabs, o isolamento de voz e o próprio agente: tudo isso precisa de internet.
8. **Corte é decisão de conteúdo.** Mostre o texto que ficou antes de cortar se houver dúvida (frase
   repetida de propósito, nome próprio, número). Nunca invente fala que a pessoa não disse.

## Imagens de IA (opcional)

O padrão é só motion. Se você tiver um gerador de imagem disponível (uma ferramenta de imagem que a
pessoa já tenha), gere em 1080x1920 (do zero) ou 1080x960 (tela dividida), salve em `public/<nome>/`
e use a cena `imagem`. Nada de rosto de pessoa real sem autorização dela, nada de marca de terceiros.

## Marca

A marca está em `marca/marca.json`: nome, quatro cores (`fundo`, `texto`, `destaque`, `suave`, em
`#RRGGBB`), duas fontes do Google Fonts (`titulo`, `corpo`) e o @. Os formatos da Edição usam essa
marca (o take editado usa a paleta do editorial, trocável no roteiro). Para conferir uma marca nova,
rode `npm run estudio-edicao` e abra a composição `TesteComponentes`.

## Licenças que a pessoa precisa saber

- **Remotion** (o motor de vídeo): grátis para pessoa física, organização sem fins lucrativos e
  empresa com fins lucrativos de até 3 funcionários. Acima disso, a empresa precisa da licença
  deles (remotion.pro).
- **ElevenLabs** (opcional): vídeo de venda é uso comercial, e o plano grátis não permite. Para
  narração em vídeo de venda, precisa de plano pago.

## Quando algo falha

| Mensagem | O que fazer |
|---|---|
| `a âncora "..." não aparece na fala` | troque a âncora por um trecho que está em `palavras` do roteiro |
| `agenda: a palavra "..." não está no tempos.json` | a palavra do `em` saiu no corte ou está escrita diferente; confira em `src/videos/<nome>/tempos.json` |
| `marca/marca.json com problema` | corrija o item listado; contraste baixo se resolve clareando o texto ou escurecendo o fundo |
| `a fonte "..." não existe no Google Fonts` | use o nome exato como aparece em fonts.google.com |
| `ElevenLabs recusou (401)` | chave errada ou vencida no `.env` |
| `ElevenLabs recusou (402)` ou `quota` | crédito do mês acabou |
| `ElevenLabs indisponível ... Whisper local` | normal sem chave; a transcrição fica mais lenta, mas funciona |
| `Isolamento de voz indisponível` | o take segue só com o filtro do ffmpeg; normal sem chave ou sem crédito |
| `ffmpeg falhou` ou `ffmpeg: command not found` | rode `node scripts/editor/verificar-ambiente.mjs` |
| corte com palavra comida ou frase que devia ficar | ajuste `fica` ou `tirarPalavras` no `saida/<nome>/cortes.json` e rode o `aplicar-cortes.mjs` de novo |
