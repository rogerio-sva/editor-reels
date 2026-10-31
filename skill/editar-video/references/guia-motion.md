# Guia de referências do motion

Leia este guia inteiro antes de criar ou mudar qualquer animação. Os valores aqui são os do filme
modelo, que está em `projeto/src/` (o mesmo código que você vai copiar). Quando o pedido não disser
outra coisa, use estes valores. Quando o pedido mudar um deles, mude no lugar indicado e mantenha o
resto.

Tela padrão: **1920 x 1080, 30 fps**. Tudo abaixo está nessa escala. Para vertical (1080 x 1920),
mantenha os tamanhos de texto e refaça as posições. Não encolha a tipografia.

---

## 1. A regra da fala sincronizada (a mais importante)

**A palavra aparece na tela no quadro em que é dita.** Nem antes, nem depois.

- Toda frase falada entra por `<Fala>` (em `src/Fala.tsx`), que lê o início (`s`) e o fim (`e`) de
  cada palavra num `tempos.json`. Nunca posicione palavra falada com número de quadro fixo.
- O quadro de uma palavra dentro da cena é `useCenaM().local(palavra.s)`. Prenda eventos de imagem
  (estouro, risco, troca de cor, mira chegando) à palavra assim, nunca a um número chutado.
- `antecipa` = **2 quadros**. A animação da palavra começa 2 quadros antes do início marcado, porque
  transcrição automática marca o início 1 a 3 quadros depois do som começar. Assim a palavra começa
  a aparecer junto com o som e está inteira uns 2 quadros depois.
- O corte entre cenas também é preso à fala: cai **2 quadros antes** da primeira palavra da cena
  (`ADIANTA = 2`, em `src/montagem.tsx`). A transição é montada para que o quadro `k` dela caia
  exatamente nesse corte.
- A fala fica **sempre** na tela: cada frase dita está escrita, animada, enquanto é dita.
- A **palavra-chave** da frase ganha destaque: cor do acento, brilho (`BRILHO.verde`) e um "pop" de
  10% que assenta em 10 quadros (prop `destaque` do `<Fala>`). Uma, no máximo duas por frase.
- Sem narração, os tempos vêm do texto (ver `tempos.md`). Com narração, da transcrição do áudio.
  A regra é a mesma nos dois casos.

## 2. Tipografia

Fontes: **Inter** (variável, 100 a 900) para tudo o que é lido e **JetBrains Mono** (400 e 700) para
rótulo técnico, código e prompt. As duas são licença OFL e já estão em `projeto/public/fonts/`.
Os estilos estão em `TIPOM` (`src/tema.ts`):

| Estilo | Corpo (px) | Peso | Tracking (em) | Entrelinha | Uso |
|---|---|---|---|---|---|
| `gigante` | 250 | 900 | -0,04 | 0,92 | a palavra que domina a cena (no filme: 236 a 350 px) |
| `frase` | 112 | 800 | -0,03 | 1,04 | a frase falada principal (no filme: 100 a 120 px) |
| `apoio` | 68 | 700 | -0,02 | 1,10 | frase pequena acima do elemento principal |
| `fina` | 116 | 250 | -0,02 | 1,12 | máquina de escrever fina (abertura) |
| `prompt` | 48 | 400 mono | -0,01 | 1,30 | texto digitado num campo |
| `rotulo` | 28 | 400 mono | +0,08 | 1,20 | rótulo técnico de canto (HUD) |

Regras:
- **Mínimo 28 px** para qualquer texto (rótulo de HUD inclusive). Frase principal sempre grande.
  O vídeo pode ser assistido no celular ou filmado de uma tela: nada fino demais nem pequeno demais.
- Tracking negativo em corpo grande (-0,03 a -0,045), positivo só em mono pequeno (+0,08).
- Peso 800 a 900 no que é lido de longe; 250 só na abertura fina, e grande (116 a 140 px).
- Medir antes de posicionar: `useLayoutFala` e `src/medir.ts` dão a largura, a linha de base e a
  posição de cada letra. Use isso para prender luz, risco ou partícula na palavra.
- Palavra gigante em maiúsculas (`textos={{ 0: 'MOTION' }}`), frase em caixa normal.

## 3. Grade e composição

- **Margem lateral 120 a 160 px.** Texto alinhado à esquerda começa em x 140 a 160; centrado, em
  x 960. Largura máxima de frase 1680 px (quebra automática no `<Fala>`).
- **Grade de prancheta no fundo** (`<FundoM>`): linhas a cada **40 px** (fina, 4,5% de opacidade) e a
  cada **200 px** (forte, 11%), na cor do acento claro, derivando devagar (0,35 px por quadro) e com
  máscara radial que some nas bordas. É o "papel" de toda cena.
- **Chão em perspectiva** (`<GradeChao>`): horizonte em y 640 a 780, linhas a cada 170 px saindo do
  ponto de fuga, transversais correndo para a câmera (`velocidade` 2,2).
- **HUD de canto** (`<HUD>`): margem de 64 px, cruzes de registro a 36 px dos cantos, mono 28 px,
  maiúsculas, entra em cascata de 3 quadros e se "digita" em 8 quadros. Quatro cantos no máximo,
  texto curto (ex.: `MOTION / 001`, `REC 00:02:10`, `30 FPS · 1920×1080`).
- Um elemento principal por cena, grande, ocupando o centro ótico; apoio pequeno em cima; HUD nos
  cantos. Profundidade em camadas: fundo com grade, chão, poeira, conteúdo, luz por cima.

## 4. Ritmo

- **Uma frase por cena.** No filme, as cenas duram de **1,4 s a 7,1 s** (19 cenas em 76 s). A fala
  anda a ~**3 palavras por segundo**.
- **Nada fica parado mais de ~0,5 s.** Câmera sempre viva, elementos entrando em cascata, partículas
  andando, luz correndo.
- **Câmera viva** (`<Camera>`): empurra de 1 para 1,05 a 1,16 ao longo da cena (curva `suave`), com
  balanço de 5 a 10 px e giro de 0,3 a 0,5 grau. Na saída a câmera converge para um estado conhecido
  (a transição precisa achar as coisas no lugar).
- **Cascata (stagger)**: letras a cada **0,6 a 1,2 quadro** no modo `letras` (padrão 1,2; palavra
  gigante 0,6 a 0,9), letras de palavra incandescente a cada 2 quadros, rótulos de HUD a cada 3.
- **Entradas da palavra** (`modo` do `<Fala>`):
  - `sobe` (padrão): sobe 0,42 em com mola `estalo`, desfoque 12 → 0 px em 4 quadros, escala 0,96 → 1.
  - `letras`: cada letra cai de -0,55 em com escala 1,5 → 1 e desfoque 16 → 0 px em 4 quadros.
  - `maquina`: letra a letra durante a palavra, cada letra acende e assenta em 3 a 4 quadros, cursor.
  - `slam`: chega de 2,2x com desfoque 16 → 0 px (palavra de impacto).
  - `foco`: sai do desfoque (22 → 0 px em 7 quadros) e de 1,15x na horizontal.
- **Saída**: as palavras saem em 9 quadros (curva `entra`), subindo 0,35 em ou desfocando.
- Troca de cena a cada frase, **com uma transição diferente em cada corte** (ver seção 8).

## 5. Easing e molas

**Nunca linear em movimento visível.** Linear só para coisa que corre sem parar (poeira, grade
derivando, marquee).

Curvas (`CURVAM` / `ease` em `src/tema.ts`, cubic-bezier):

| Nome | Bezier | Uso |
|---|---|---|
| `sai` | 0,16 1 0,3 1 | entradas: sai rápido, chega longo (o padrão de quase tudo) |
| `entra` | 0,7 0 0,84 0 | acelerar para o corte / saídas |
| `corte` | 0,76 0 0,24 1 | transições e varreduras: lento, rápido, lento |
| `suave` | 0,45 0 0,55 1 | câmera |
| `expo` | 0,95 0 0,9 0,2 | mergulho de câmera (atravessar letra) |

Molas (`MOLAM`, use `mola(frame, nome, inicio)`):

| Nome | mass | damping | stiffness | Uso |
|---|---|---|---|---|
| `estalo` | 0,55 | 13 | 230 | palavras e peças: chegada rápida com overshoot curto |
| `assenta` | 0,8 | 17 | 140 | blocos de interface, sem sobra |
| `quica` | 1 | 7,5 | 170 | coisa pesada que cai e quica |
| `camera` | 1,4 | 30 | 60 | câmera |

Helpers: `janelaM(frame, a, b, curva)` dá 0 → 1 na janela [a, b]; `tween(...)` interpola valores;
`clamp01`, `lerp`. Use-os em vez de escrever `interpolate` à mão.

## 6. Paleta

Um acento só por vídeo. A paleta inteira mora em `PALETA` (`src/tema.ts`); trocar ali troca todas as
cenas, blocos e transições (`RGB`, `TRIO`, `CORM` e `BRILHO` derivam dela).

| Chave | Valor (padrão) | Uso |
|---|---|---|
| `fundo` | `#030705` | fundo: preto com um fio da cor do acento |
| `floresta` | `#0A1C11` | painéis e vidro escuro |
| `halo` | `#1C5C34` | brilho difuso atrás das cenas |
| `acento` | `#30DC68` | o destaque: palavra-chave, linha de luz, partícula, borda ativa |
| `acentoClaro` | `#85EEA7` | grade, rótulo ativo, fagulha, luz das transições |
| `papel` | `#F1F0E8` | texto claro "quente" (frases) |
| `branco` | `#FFFFFF` | núcleo de luz, texto de impacto |
| `dim` / `faint` | `#A9B8AE` / `#6E8075` | texto secundário e rótulos |
| `alerta` | `#FF3B30` | **só** para riscar ou marcar "errado" |

Regras:
- Fundo sempre muito escuro; o acento brilha (glow) sobre ele.
- Vermelho (`alerta`) só para riscar ou marcar erro, nunca como cor de destaque.
- Para trocar a identidade (ex.: acento azul), mude `acento`, `acentoClaro`, `halo` e, se quiser,
  `fundo`/`floresta` com um fio da nova cor. Mantenha contraste alto (texto claro sobre fundo escuro).
- Alguns detalhes ficam fixos de propósito (brancos de luz, o slide "brega" da cena 8, as caixas
  cinza do fluxo antigo da cena 13).

## 7. Profundidade e luz

- Fundo: `<FundoM>` (glow radial do acento + grade + vinheta + grão de 6%).
- Poeira em 3 planos (`<Poeira>`): perto grande e desfocada, longe fina; sempre andando.
- Luz: `<LinhaLuz>` (filete com núcleo branco e cabeça brilhante), `<Faisca>` (faísca quente que
  "escreve": núcleo branco, halo creme → acento, estrela horizontal e vertical, rastro), `<Flare>`
  (ponto de luz com estrela horizontal).
- Mira: `<MiraLaser>` (linhas de laser de ponta a ponta, régua, círculo tracejado girando a 4°/quadro,
  leitura X/Y em mono 28 px). Mova com `janelaM` + `lerp` em curva `corte` e trave no alvo na
  palavra.
- Impacto: `<Onda>` (anel de choque), `<Fagulhas>` (estouro), tranco de câmera de 10 a 14 px que
  morre em 5 quadros.
- Brilho em texto: duas camadas (aro com brilho atrás, miolo nítido por cima), para o glow nunca
  borrar a letra.

## 8. Transições

Cada corte usa uma transição diferente. Todas estão em `src/transicoes/`, isoladas, com props padrão
em `src/transicoes/catalogo.tsx` e uma composição de teste cada (`T-<nome>`). `T` é a janela em
quadros, `k` é o quadro do corte dentro da janela.

| Nome | T / k | O que faz |
|---|---|---|
| `chicoteLuz` | 12 / 6 | chicote com fantasmas e um risco de luz atravessando a tela |
| `estilhaca` | 16 / 5 | a cena racha em 30 cacos 3D com borda de luz; a próxima abre do impacto |
| `flash` | 6 / 2 | um quadro chapado de luz; a próxima chega superexposta e assenta |
| `atravessa` | 16 / 10 | a câmera atravessa o miolo de uma letra; a próxima está lá dentro |
| `estica` | 14 / 8 | uma barra acende, estica e vira a próxima cena |
| `tunel` | 18 / 12 | um painel vira a boca de um túnel 3D de grade e a câmera voa por ele |
| `pontoAbre` | 14 / 8 | íris dupla que abre de um ponto |
| `glitchRGB` | 12 / 6 | separação RGB, fatias, varredura; a próxima chega quebrada e assenta |
| `faixas` | 18 / 9 | faixas inclinadas com texto correndo cobrem a tela |
| `foco` | 14 / 7 | troca de foco de lente com bokeh e cantos de autofoco |
| `fotograma` | 16 / 10 | um círculo vira o fotograma de uma película |
| `peliculaGira` | 10 / 5 | fusão curta com brilho varrendo (o giro mora na cena que sai) |
| `despenca` | 14 / 6 | caixas da cena se soltam e caem com gravidade |
| `pulsoJanela` | 16 / 8 | um pulso estoura numa caixa e vira a janela da próxima cena |
| `corteBatida` | 6 / 2 | corte seco na batida com soco de câmera e sobre-exposição |
| `pontosSimbolo` | 26 / 13 | pontos despencam, quicam e sobem em enxame até formar um desenho |
| `dispersao` | 24 / 18 | texto ou pontos viram ~900 partículas que voam até a próxima cena |
| `flood` | 14 / 11 | varredura de cor inclinada com borda de luz |
| `retangulo` | 16 / 12 | um cartão com alças de seleção expande até virar a próxima cena |
| `fusao` | 10 / 5 | fusão com desfoque (a mais discreta) |

Regras:
- As transições que "acham" algo na tela (atravessa, estica, tunel, fotograma, pulsoJanela, despenca,
  pontosSimbolo, pontoAbre, retangulo) recebem a geometria desse algo. A cena que sai deixa o
  elemento **parado** nesse lugar a partir do início da janela (`c.saidaInicio`).
- A cena que entra começa `k` quadros antes da fala dela: o que ela mostra nesses quadros já tem que
  estar vivo (fundo, grade, elemento de espera), sem tela vazia.
- Glitch e corte seco combinam com fala rápida; atravessa, túnel e dispersão pedem cena com 2 s ou mais.

## 9. Checklist antes de renderizar

1. `npx tsc --noEmit` sem erro.
2. Stills dos quadros-chave (`node scripts/stills.mjs <Comp> out/stills 0.5 q1 q2 ...`): abra e olhe.
3. Cada palavra dita aparece no quadro em que é dita (confira 2 ou 3 palavras pelo `tempos.json`:
   quadro = round(s × 30)).
4. Nada parado mais de 0,5 s; nenhum quadro vazio ou preto no meio; nenhum texto cortado na borda
   sem querer.
5. Texto com 28 px ou mais; contraste alto; um acento só; vermelho só para riscar.
6. Nenhum logo de terceiro (use `<LogoApp>` como lugar reservado) e nenhuma fonte fora da pasta.
