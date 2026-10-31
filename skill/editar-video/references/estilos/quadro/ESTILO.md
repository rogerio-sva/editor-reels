# Estilo quadro: quadro branco desenhado a lápis

Papel off-white com vinheta cinza; um lápis amarelo pequeno desenha, **no momento em que cada coisa
é dita**, ícones de traço fino, setas e rótulos em caixa alta condensada inclinada. Cada ideia nova
limpa o quadro. Quase sem cor: verde para o que é bom/novo, vermelho (e X) para o que é ruim. Sem
legenda de fala no quadro: o desenho é a legenda. Abertura opcional com o rosto (10 a 15 s no
original; 1 a 3 s já funcionam). Referência: @beprecht (estilo do @davidabn_).

## Quando usar

- Explicar uma ideia, um processo, um antes x depois, "de um jeito visual", "desenhando".
- Pediu "quadro branco", "lápis", "whiteboard", "rabisco", "desenho a cada palavra".
- Tem narração (áudio) ou só o texto (aí os tempos vêm de `tempos-de-texto.mjs`).

## O fluxo deste estilo

```bash
# narração → tempos por palavra (ou: node scripts/tempos-de-texto.mjs "texto" > .../tempos.json)
node scripts/transcrever.mjs public/<nome>/narracao.mp3 src/videos/<nome>/tempos.json
# rosto na abertura (opcional): o vídeo da pessoa, vertical, sem recorte
node scripts/preparar-video.mjs ~/caminho/rosto.mov <nome> --ate=4 --sem-recorte --miniaturas=0
#   → renomeie public/<nome>/base.mp4 para rosto.mp4
cp -R src/videos/quadro-exemplo src/videos/<nome>     # troque o id no Exemplo.tsx e registre no Root
node scripts/batidas.mjs src/videos/<nome>
node scripts/prancha.mjs <Id> out/<nome>/prancha-aprovacao.jpg --roteiro=src/videos/<nome>
node scripts/trilha.mjs src/videos/<nome>
npx remotion render src/index.ts <Id> out/<nome>-bruto.mp4
```

## O roteiro.json

```json
{
 "estilo": "quadro",
 "audio": "<nome>/narracao.mp3",
 "trilha": "<nome>/trilha.wav",
 "rosto": { "video": "<nome>/rosto.mp4", "ate": "Antes," },
 "cenas": [
  { "em": "Antes,", "titulo": "ANTES", "subtitulo": "UM VÍDEO ASSIM PRECISAVA DE", "subtituloEm": "vídeo",
    "itens": [
     { "icone": "pessoa", "em": "editor,", "rotulo": "EDITOR" },
     { "icone": "janela", "em": "programa", "rotulo": "PROGRAMA CARO" },
     { "icone": "calendario", "em": "semana", "rotulo": "1 SEMANA" },
     { "marca": "x", "em": "Esquece", "sobre": 0 }
    ] },
  { "em": "Agora", "titulo": "AGORA", "corTitulo": "verde", "ligar": true,
    "itens": [
     { "icone": "microfone", "em": "áudio,", "rotulo": "SEU ÁUDIO" },
     { "icone": "robo", "em": "Claude,", "rotulo": "CLAUDE" },
     { "icone": "lapis", "em": "desenha", "rotulo": "DESENHA", "cor": "verde" },
     { "marca": "check", "em": "hora", "sobre": 2 }
    ] }
 ]
}
```

- **Cena** = um quadro limpo. Entra na palavra `em` (o quadro anterior se apaga 0,24 s antes).
  `titulo` (96 px) e `subtitulo` (50 px, entra em `subtituloEm`) no alto; `corTitulo`; `layout`:
  `linha` (até 3 lado a lado, padrão), `grade` (3 por linha, padrão acima de 3), `coluna` (de cima
  para baixo), `arvore` (o primeiro em cima, os outros embaixo ligados a ele, como "robô → ferramentas");
  `ligar: true` desenha seta entre um item e o seguinte.
- **Item** com lugar no quadro: `icone` (nome da biblioteca) **ou** `texto` (ex.: `"01011001"`,
  `"R$ 3 MIL"`, `tamTexto`), mais `rotulo` (embaixo, 56 px; `rotuloEm` para entrar em outra palavra),
  `nota` (linha pequena embaixo do rótulo), `cor` (`tinta`, `verde`, `vermelho`), `tam` (px), `x`/`y` para
  posicionar à mão.
- **Marca** sobre um item já desenhado (`sobre` = índice do item na cena, a partir de 0; padrão: o
  último): `x` (vermelho), `check` (verde), `circulo`, `sublinha`.
- **Texto livre** em qualquer lugar: `{ "livre": true, "texto": "...", "x": 540, "y": 1400, "tam": 48, "em": "..." }`.
- Cada desenho começa 2 quadros antes da palavra e nunca invade o seguinte (o lápis é um só): se
  as palavras estão muito próximas, o desenho fica rápido. Uma ideia por cena; 2 a 4 itens por cena.

## Regras visuais (valores exatos, tela 1080x1920)

| Elemento | Valor |
|---|---|
| Papel | gradiente radial `#F3F3EC` (centro) → `#EEEEE6` → `#D7D7CF` (bordas) + grão fixo 4,5% |
| Tinta | `#262626`; verde `#1E9E46` (bom/novo); vermelho `#D2382B` (ruim, X). Troque em `"cores"` |
| Traço | 3,4 px na tela em qualquer tamanho de ícone, ponta e junção redondas |
| Letra | Saira Condensed Light (300), caixa alta, inclinada -9°, espaçamento 1,5 px; revelada da esquerda para a direita com o lápis na borda |
| Tamanhos | título 96, subtítulo 50, rótulo 56, nota 40 px; ícone 250 px (1 ou 2 por cena), 205 (3), 160 (grade) |
| Posições | título em y 21% da altura; itens em y 44%; margens de 90 px; metade de baixo fica livre (como no original) |
| Lápis | amarelo com ponta de grafite e borracha rosa, 92 px, inclinado 38°, tremor de 2° só enquanto desenha, viaja entre traços com arco de 22 px; entra pela direita e sai para o canto no fim |
| Tempo de desenho | ícone 0,75 s, texto 0,045 s por letra (0,28 a 0,8 s), seta 0,25 s; tudo limitado pelo próximo item |
| Limpar | o quadro inteiro some e sobe 30 px em 0,22 s |
| Rosto | vídeo em tela cheia, legenda curta em Inter 600 46 px branca no alto (10% da altura); corte seco para o papel |

## Biblioteca de ícones (73)

`notebook celular monitor documento pasta cadeado cadeado-aberto robo chave-inglesa lupa controle
banco predio relogio castelo grafico-sobe grafico-desce barras pessoa pessoas microfone camera play
janela nuvem dinheiro cifrao carrinho email mensagem sino alvo foguete lampada engrenagem coracao
estrela calendario ampulheta cerebro codigo servidor banco-de-dados chip check x interrogacao raio
escudo chave funil megafone globo casa olho link lapis tesoura claquete filme imagem livro formatura
trofeu presente maleta loja telefone quadro fone wifi bateria aviso`

Ver todos: composição `Quadro-Icones` (`node scripts/stills.mjs Quadro-Icones out 0.5 0`). Desenho
dos ícones: Lucide (licença ISC, `projeto/src/estilos/quadro/LICENCA-LUCIDE.txt`). Ícone novo: acrescente
em `src/estilos/quadro/icones.ts` um nome com a lista de subcaminhos em grade 24x24 (traço, sem
preenchimento), na ordem em que a mão desenharia.

## Checklist antes do render

- [ ] Cada item está preso à palavra que o cita (`node scripts/batidas.mjs` não dá erro).
- [ ] No máximo 4 itens por cena; texto curto (até ~16 letras por rótulo).
- [ ] Verde só no que é bom, vermelho só no que é ruim; o resto em tinta.
- [ ] Nenhum rótulo encosta no vizinho (na prancha); se encostar, encurte ou use `layout: "coluna"`.
- [ ] O lápis está na ponta do traço (prancha de aprovação: 2 quadros por cena).
- [ ] Sem legenda de fala no quadro.
