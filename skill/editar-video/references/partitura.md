# A partitura (saida/<nome>/partitura.json)

Índices são a posição da palavra em `src/videos/<nome>/tempos.json` → `palavras` (a partir de 0). As cenas cobrem TODAS as
palavras, em ordem, sem buraco: a 1ª começa em 0, cada uma começa na palavra seguinte ao `ate` da anterior.

```json
{
 "modelo": "documentos",
 "foco": 0.5,
 "planos": [{"a": 0, "b": 31.7, "tipo": "rosto", "x": 0.3}, {"a": 31.7, "b": 52, "tipo": "aberto", "x0": 0.1, "x1": 0.9}],
 "capitulos": [{"em": 0, "titulo": "Até 3 palavras ditas"}],
 "rosto": {"x": 0.5, "y": 0.36, "h": 0.14},
 "cenas": [ ... ],
 "final": {"tipo": "seguir", "titulo": "...", "sub": "..."}
}
```

- `foco` ou `planos`: enquadramento de vídeo horizontal (olhe a folha; `saida/<nome>/info.json` traz as trocas de câmera). Plano com uma
  pessoa: `rosto` com `x` do rosto de 0 a 1. Duas pessoas: `aberto` com o vão entre os rostos. Vídeo vertical: omita.
- `capitulos`: só no modelo `capitulos`; 3 a 5, cada um com 6 s ou mais.
- `rosto`: só na `moldura`: centro (x, y) e altura do rosto, de 0 a 1, na imagem vertical.
- `final`: opcional; sem ele sai uma chamada de `marca/marca.json`.

## Cenas

| Tipo | Campos | Quando |
|---|---|---|
| `fala` | `destaques` | a pessoa falando; a base do vídeo |
| `heroi` | `palavra`, `texto` | uma palavra forte bate grande |
| `slam` | `palavra`, `texto` | tela de motion: frase em cima, palavra gigante |
| `contraste` | `riscado: [de, ate]`, `grande`, `texto` | oposição real ("não é fácil, mas é POSSÍVEL") |
| `dividido` | `destaques` | rosto em cartão + frase |
| `numero` | `a: {i, texto}`, `b` (opcional), `unidade` | número DITO: régua (a + b) ou contador |
| `lista` / `chips` | `itens: [[de, ate], ...]` | 2 a 6 itens acendem quando são ditos |
| `passos` | `itens`, 2 a 5 | etapas ligadas por linha |
| `duelo` | `a`, `b`, `la`, `lb` | dois números comparados, com rótulos |
| `documento` | `rotulo`, `destaques`, `circulo`, `carimbo` | norma, contrato, definição, trecho técnico |
| `citacao` | `destaques` | frase de autoridade |

Toda cena aceita:
- `de`, `ate`: primeira e última palavra.
- `transicao` (de entrada): `glitchRGB`, `pontoAbre`, `flash`, `corteBatida`, `chicoteLuz`, `foco`, `fusao`, `fita`.
- `rotulo`: assunto em até 3 palavras; nunca nome que não foi dito.
- `circulo`: uma palavra com círculo à mão.
- `carimbo`: `{"texto": "IMPORTANTE", "em": 12}`; textos: APROVADO, REPROVADO, VERDADE, MITO, ATENÇÃO, IMPORTANTE, URGENTE, CONCLUÍDO, NOVO, CUIDADO.

`texto` é a mesma palavra em MAIÚSCULAS ou o número dela em algarismos.
Modelos de papel (`documentos`, `capitulos`) e `moldura` usam fala, heroi, slam, contraste, documento, chips, passos, duelo e numero.

## Como escrever bem

- Cena de 1,2 a 7 s, cortada em fim de frase ou pausa. Nunca dois tipos iguais seguidos, exceto fala.
- A 1ª cena é `fala` ou `heroi`: o rosto prende. Volte à gravação pelo menos a cada 2 cenas.
- Em heroi, slam, contraste e numero, o elemento grande cai até 2 s depois do começo da cena.
- 1 ou 2 destaques por cena, nunca artigo ou preposição. Tudo aparece apagado e acende quando é dito: ritmo vem de a tela mudar a cada 1,5 a 3 s.
- Transição diferente da anterior. Carimbo no máximo a cada 3 cenas.
