# Som: trilha e efeitos por código

`projeto/scripts/trilha.mjs` gera um `trilha.wav` (música + efeitos) sem banco de som e sem internet:
cada som é sintetizado no Node. Os efeitos tocam nos instantes da **mesma tabela de batidas** que a
imagem usa (`src/estilos/agenda.mjs`), então o ping cai no quadro em que o cupom entra, o raspado do
lápis dura exatamente o traço, o whoosh acompanha o whip.

```bash
node scripts/trilha.mjs src/videos/<nome>                  # escreve public/<nome>/trilha.wav
node scripts/trilha.mjs src/videos/<nome> --musica=nenhuma # só efeitos
node scripts/trilha.mjs src/videos/<nome> --volume-musica=0.6 --volume-efeitos=1.2 --bpm=90
```

Depois, no `roteiro.json`: `"trilha": "<nome>/trilha.wav"`. A composição toca a narração (ou o som
do vídeo) e a trilha juntas.

## O que tem

| Efeito | Onde a agenda põe |
|---|---|
| `ping` + `papel` + `tecla` por letra | cupom (editorial) |
| `pop` | entrada de cartão, publicar comentário, resposta |
| `risco` | app riscado; X vermelho no quadro |
| `whoosh` | whip |
| `subida` + `impacto` | troca de grade de cor |
| `swell` | título atrás, palavra com imagem |
| `projetor`, `tique`, `caneta` | película, minutos depois, círculo à mão |
| `lapis` (dura o traço) | todo desenho do quadro |
| `apagar`, `virada`, `ding` | limpar o quadro, rosto → quadro, check verde |

| Música | Caráter |
|---|---|
| `editorial` (padrão do editorial e do cinético) | lo-fi quente, 84 BPM: piano elétrico (Fmaj7 Em7 Dm7 Cmaj7), baixo, bumbo e aro macios, chiado de vinil. Na primeira `grade` entram cordas e um grave contínuo; se a grade é `sombrio`, os acordes viram menores |
| `quadro` (padrão do quadro) | marimba leve em ré pentatônica, 100 BPM, pad baixo, sino suave a cada cena nova |

## Volume

- Com narração (`"audio"`) ou fala no próprio vídeo (`"volumeVideo"` ≥ 0,5), a música **abaixa sozinha
  enquanto alguém fala** (ducking: sobe rápido, solta devagar) e a trilha inteira é ajustada para ficar
  ~12 dB abaixo da voz.
- Masterização do MP4 final (volume de Reels, -14 LUFS), depois do render:
  ```bash
  npx remotion ffmpeg -i out/<nome>-bruto.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k out/<nome>.mp4
  ```

## Estilo cinético

Sem `roteiro.json` na pasta, o script usa o `tempos.json` para a duração, lê efeitos de um `sons.json`
opcional (`[{ "t": 1.2, "som": "whoosh" }, { "t": 3.4, "som": "impacto" }]`) e `--audio=narracao.mp3`
para o ducking. Ponha o arquivo na composição com `<Audio src={staticFile('<nome>/trilha.wav')} />`.

## Ajustes por conversa

| Pedido | O que mudar |
|---|---|
| "música mais baixa" / "mais alta" | `--volume-musica=0.6` / `1.4` |
| "sem música, só os efeitos" | `--musica=nenhuma` |
| "mais rápida" | `--bpm=96` |
| "tira o som do lápis" | `--volume-efeitos=0` (ou apague `lapis` em `GANHO_EFEITO` no script) |

O ffmpeg que vem com o Remotion é enxuto (sem os filtros `fps`, `tile`, `alphamerge` e sem saída
`f32le`/`rawvideo`): os scripts desta skill já contornam isso; se for escrever comando novo, teste antes.
