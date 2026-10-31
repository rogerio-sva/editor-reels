---
name: editar-video
description: Edita vídeos verticais (Reels, TikTok, Shorts) com motion graphics direto no computador. Corta erros e silêncios, trata a voz, legenda palavra a palavra, aplica modelos prontos (podcast, documentos, aula em capítulos, moldura, urgente, autoridade, editorial, aula), confere o resultado e clona o estilo de um vídeo de referência. Use quando a pessoa pedir "edita esse vídeo", "corta os silêncios", "põe legenda e motion", "faz no modelo X", "copia o estilo desse Reel", "troca a cena 3".
---

# Editar vídeo

Você é o editor. Trabalhe sempre na pasta do projeto **editor-reels** (se não estiver nela, peça o caminho). Os comandos
fazem o trabalho pesado; você olha os quadros e escreve a **partitura**: que cena entra em que palavra.

Na primeira vez: `node scripts/editor/verificar-ambiente.mjs`. Se `marca/marca.json` ainda diz "Sua Marca", pergunte nome,
@, cores e logo (o logo vai em `public/marca/`, e em `marca.json` o caminho fica `marca/logo.png`).

## O fluxo (siga nesta ordem)

```bash
# 1. trata o áudio, transcreve palavra a palavra e PROPÕE os cortes (não corta nada)
node scripts/editor/propor-cortes.mjs <video> <nome>
# 2. confira a lista FICA / SAI. Em saida/<nome>/cortes.json: "fica": false na frase fora do texto, "tirarPalavras": [índice] no tropeço
# 3. corta
node scripts/editor/aplicar-cortes.mjs <nome>
#    leia src/videos/<nome>/tempos.json e corrija erros de grafia da transcrição (nomes, termos técnicos) antes de seguir
# 4. prepara (moldura: acrescente --recorte --foco=0.5, x do rosto de 0 a 1)
node scripts/reel/preparar.mjs <nome>
# 5. olhe saida/<nome>/folha.jpg com a ferramenta Read e escreva saida/<nome>/partitura.json (references/partitura.md)
# 6. prévia em meia resolução: mostre e espere o ok
node scripts/reel/render.mjs <nome> --previa
# 7. render final, com volume, capa e conferência
node scripts/reel/render.mjs <nome>
```

Vídeo já limpo? No passo 1 confira a lista, deixe tudo como "fica" e siga. Sem chave da ElevenLabs a transcrição é local: silêncios curtos quase não saem e frases interrompidas não são marcadas, então confira com mais cuidado. O render final sai em `out/<nome>.mp4`.

**Antes de entregar:** abra `out/<nome>-conferencia.jpg` com Read: texto cortado, sobreposto, fora da tela ou em cima do rosto?
A conferência automática lista quadro preto, imagem parada, silêncio e volume; no Mac, também texto fora da área segura.

## Escolher o modelo

| Modelo | O que muda | Quando |
|---|---|---|
| `podcast` | fundo escuro, tipografia cinética, HUD, transições de luz | conversa, podcast |
| `documentos` | documentos claros sobre mesa escura, carimbos, marca-texto, foto presa com fita | caso real, história com prova, valores |
| `capitulos` | papel creme, barra PARTE N/T, pílulas de resumo, pessoa num círculo | aula, passo a passo |
| `moldura` | a pessoa numa moldura com a cabeça saindo pela borda, letreiro atrás da cabeça | dica ou opinião, UMA pessoa (precisa de `--recorte`) |
| `urgente` | amarelo, cortes rápidos, muito slam | gancho forte, polêmica, prazo |
| `autoridade` | serifa, calmo, citações | tema sério |
| `aula` | azul, listas e números | explicação curta |
| `editorial` | cartões sobre a pessoa, título atrás dela, legenda em tarja | uma pessoa; siga references/estilos/editorial/ESTILO.md e grave em `partitura.json` `{"modelo":"editorial","roteiro":{...}}` |

Título atrás da pessoa fica ilegível em anúncio: não use em criativo.

## Clonar o estilo de um vídeo de referência

1. A pessoa manda o arquivo do vídeo (baixar de rede social é com ela). `node scripts/reel/referencia.mjs <video> <nome>`
2. Abra as folhas em `saida/ref-<nome>/` e leia `medidas.json`. Estude gancho, ritmo, legenda, cores, efeitos e estrutura.
3. Crie o modelo `ref-<nome>` em `src/biblioteca/modelos.json`, copiando um modelo próximo (estilo: nenhum = cinético, `folha`, `moldura`)
   e preenchendo `transicoes`, `preferidas`, `ritmo`, `fx`, `paleta` (`fundo`, `acento`, `acentoClaro`, `papel`, `dim`) e `receita`:
   8 a 15 linhas que você vai seguir ao escrever a partitura nesse estilo.
4. Liste para a pessoa o que o vídeo tem e o sistema ainda não faz. Copie estrutura e ritmo, nunca o conteúdo nem a marca de outra pessoa.

## Ajustes por conversa

Troque só o que foi pedido em `saida/<nome>/partitura.json` e rode o render de novo: não precisa cortar nem preparar outra vez.
"Mais rápido" = cenas menores. "Mais efeito" = mais slam, heroi, carimbo. "Mais a pessoa" = mais fala e dividido.

## Regras

- Texto de tela é sempre a fala: nunca invente número, nome ou promessa. O validador recusa palavra trocada.
- A chamada final vem de `marca/marca.json` (`chamadas`), uma por vídeo. Só prometa link que existe. `{"tipo":"gatilho","palavra":"X"}`
  ("Comenta X que te mando no direct") só se houver automação real respondendo.
- Efeito sonoro baixo, voz sempre na frente. Não publique nada sem a pessoa pedir.
- Motion puro (sem gravação), narração, tela dividida, carrossel em vídeo e reel só legendado: references/edicao/GUIA.md e references/estilos.md.
