# Tempos da fala (tempos.json)

Toda cena põe a fala na tela a partir de um `tempos.json`: cada palavra com início e fim em segundos,
e onde cada cena começa. É isso que faz a palavra aparecer quando é dita.

## Formato

```json
{
  "fps": 30,
  "fim_fala_s": 8.7,
  "cenas": [
    { "cena": 1, "inicio_s": 0, "fim_s": 3.45, "inicio_f": 0, "dur_f": 103 },
    { "cena": 2, "inicio_s": 3.45, "fim_s": 7.12, "inicio_f": 103, "dur_f": 111 }
  ],
  "palavras": [
    { "t": "Cada", "s": 0.4, "e": 0.72 },
    { "t": "palavra", "s": 0.78, "e": 1.22 }
  ]
}
```

- `t`: a palavra como aparece na tela (o `<Fala>` limpa aspas e `. , : ;` do fim; `?` fica).
- `s`, `e`: início e fim em segundos.
- `cenas[i].inicio_s`: o início da **primeira palavra** da cena (a cena 1 começa em 0).
  `inicio_f = round(inicio_s × fps)`. `fim_s` = início da próxima cena (a última: fim da fala).
- Duração do vídeo = `fim_fala_s + 0,8 s` de respiro (é o que a demo usa).

## Sem narração (texto na tela, ritmo de fala)

```bash
node scripts/tempos-de-texto.mjs "Primeira frase. | Segunda frase, com vírgula. | Terceira." > src/videos/<nome>/tempos.json
```

- `|` separa as cenas (uma frase por cena).
- Ritmo padrão ~3 palavras por segundo (o do filme). `--ritmo=1.3` deixa mais lento; `--ritmo=0.85`, mais rápido.
- Para um vídeo de duração exata (ex.: "8 segundos"), gere, veja `fim_fala_s` e ajuste `--ritmo`
  até `fim_fala_s + 0,8` dar a duração pedida (ou ajuste o respiro no fim).
- Pode editar o JSON à mão: segurar uma palavra-chave mais tempo, abrir uma pausa antes do impacto.
- Texto curto num vídeo mais longo (ex.: 2 palavras em 8 s): não estique o ritmo até a fala ficar
  arrastada; mantenha o ritmo natural e aumente a duração da composição (a última cena segura a
  palavra com movimento até o fim).

## Com narração (áudio pronto)

1. Ponha o áudio em `public/` (ex.: `public/narracao.mp3`).
2. Transcreva com tempo por palavra:
   ```bash
   npm i -D @remotion/install-whisper-cpp@4.0.409
   node scripts/transcrever.mjs public/narracao.mp3 src/videos/<nome>/tempos.json --modelo=small
   ```
   Roda local (whisper.cpp). Na primeira vez baixa o programa e o modelo (centenas de MB). Cada
   frase vira uma cena; junte ou separe cenas editando `cenas`.
   Se o usuário já tem a transcrição com tempo por palavra de outra ferramenta (ElevenLabs, Whisper,
   AssemblyAI, legendas palavra a palavra), converta para o formato acima em vez de transcrever.
3. Corrija a grafia das palavras no JSON (o reconhecimento erra nome próprio); não mexa nos tempos.
4. No vídeo, passe o áudio: `<VideoMontado ... audio="narracao.mp3" />`.
5. Confira 2 ou 3 palavras: quadro = round(s × 30). Num still desse quadro a palavra deve estar
   começando a aparecer; 2 quadros depois, inteira.

## No código

```tsx
import TEMPOS from './tempos.json';
import { criarTempos, type TemposJson } from '../../tempos';
const T = criarTempos(TEMPOS as TemposJson);

T.falaDaCena(2)          // as palavras da cena 2
T.trecho(2, 0, 3)        // palavras 0 a 3 da cena 2
T.CENAS_FALA             // para montarRoteiro
T.fimFala                // segundos
```
