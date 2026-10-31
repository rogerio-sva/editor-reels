# Configurar a Edição (uma vez)

Os estilos de motion (cinético, editorial, quadro) funcionam só com o `npm install` da pasta de
trabalho. A Edição precisa de mais duas coisas no computador e, se a pessoa quiser, da ElevenLabs.
Siga com a pessoa, um passo por vez: diga o que fez e só siga quando o passo funcionar.

1. **Node e ffmpeg.** Rode `node --version` e `ffmpeg -version`. Precisa do Node 22.18 ou mais novo
   e de qualquer ffmpeg recente. Se faltar algum:
   - no Mac: instale o Homebrew se não tiver (brew.sh) e rode `brew install node ffmpeg`;
   - no Windows: `winget install OpenJS.NodeJS.LTS` e `winget install Gyan.FFmpeg`, depois feche e
     abra o terminal.
   Peça a senha do computador à pessoa se o sistema pedir; nunca tente contornar.
2. **Dependências.** Na pasta de trabalho, `npm install` (se ainda não rodou).
3. **ElevenLabs (opcional).** Pergunte se a pessoa quer usar. Sem ela, tudo da Edição funciona menos
   o vídeo do zero (narração): a transcrição roda no computador (Whisper, mais lenta; na primeira vez
   baixa algumas centenas de MB) e o áudio do take passa só pelo filtro do ffmpeg. Com ela: copie
   `.env.exemplo` para `.env` e explique como pegar a chave: entrar em elevenlabs.io, clicar no nome da
   conta (canto de baixo), "API Keys", criar uma chave com permissão de Text to Speech, Speech to Text,
   Audio Isolation e Voices. Lembre que vídeo de venda é uso comercial e o plano grátis não permite.
   Peça para a pessoa **colar a chave direto no arquivo `.env`**, na linha `ELEVENLABS_API_KEY=`, e
   avisar quando salvar. Não peça a chave no chat.
4. **Voz (só para o vídeo do zero).** Liste as vozes da conta com
   `curl -s https://api.elevenlabs.io/v1/voices -H "xi-api-key: $(grep ELEVENLABS_API_KEY .env | cut -d= -f2)"`
   e mostre nome e descrição de cada uma (nunca mostre a chave). A pessoa escolhe uma; grave o id
   dela em `ELEVENLABS_VOICE_ID` no `.env`.
5. **Marca.** Pergunte, uma coisa por vez: o nome da marca, o @ do Instagram, a cor de fundo, a cor
   do texto, a cor de destaque e uma cor suave (aceite nome de cor e converta para `#RRGGBB`,
   confirmando com a pessoa), a fonte dos títulos e a do corpo (precisam existir no Google Fonts; se
   ela não souber, sugira três combinações). Grave em `marca/marca.json` no mesmo formato do exemplo.
6. **Conferir.** Rode `node scripts/editor/verificar-ambiente.mjs` e corrija o que aparecer como
   FALTA, até tudo ficar ok (o que aparece como "opcional" pode ficar).
7. **Fechar.** Diga em três linhas o que ficou instalado e quais formatos a pessoa já pode pedir.
