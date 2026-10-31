# editor-reels

Editor de Reels, TikToks e Shorts com motion graphics, usado por conversa no [Claude Code](https://claude.com/claude-code).
Você manda um vídeo falando e pede: "edita esse vídeo no modelo documentos". Sai um vídeo vertical pronto, no seu computador.

- Corta erros, frases repetidas e silêncios, e trata a voz
- Legenda que acende palavra por palavra
- 8 modelos que mudam a edição, não só a cor: podcast, documentos, aula em capítulos, moldura (a cabeça sai da moldura), urgente, autoridade, aula e editorial
- Cenas animadas: número contando, itens que acendem, documento com marca-texto, carimbos, duelo de barras, passos, capítulos
- Clona o estilo de um vídeo de referência e cria um modelo novo
- Confere o vídeo pronto: quadro preto, imagem parada, silêncio, volume no padrão de -14 LUFS
- Motion puro, narração, tela dividida e carrossel em vídeo (Skill Motion)

Roda no seu computador. Não precisa de After Effects, Premiere ou CapCut.

## Instalação

Você precisa do [Claude Code](https://claude.com/claude-code), do [Node.js](https://nodejs.org) 22.18 ou mais novo e do ffmpeg.

**Mac**
```bash
brew install ffmpeg
git clone https://github.com/rogerio-sva/editor-reels.git
cd editor-reels
./instalar.sh
```

**Windows** (PowerShell)
```powershell
winget install Gyan.FFmpeg
git clone https://github.com/rogerio-sva/editor-reels.git
cd editor-reels
.\instalar.ps1
```

Depois preencha `marca/marca.json` com nome, @, cores, logo (em `public/marca/`) e as chamadas finais. Ou peça ao Claude.

## Como usar

Abra o Claude Code na pasta do projeto e peça:

> edita o vídeo C:\Videos\gravacao.mp4 no modelo documentos

> copia o estilo deste Reel: ref.mp4

> troca a cena 3 por um carimbo e deixa mais rápido

O Claude corta, escreve as cenas, mostra uma prévia e renderiza. O vídeo sai em `out/`.

## Opcional

- **Chave da ElevenLabs** em `.env` (copie `.env.exemplo`): transcrição melhor, corte de silêncios mais preciso, voz sem eco e narração.
  Sem ela, tudo funciona com a transcrição local, mas os silêncios curtos quase não saem.
- **Modelo moldura fora do Mac:** `pip install "rembg[cpu]"` para recortar a pessoa. Sem placa de vídeo é lento:
  alguns segundos por quadro, mais de 1 hora num vídeo de 1 minuto. No Mac o recorte é nativo e leva poucos minutos.

## Sistemas

| | Mac | Windows |
|---|---|---|
| Edição, modelos, render e conferência técnica | Testado | Escrito para funcionar, **ainda não testado** |
| Moldura e título atrás da pessoa | Recorte nativo | Precisa do rembg |
| Conferência da área segura do Instagram | Automática | O Claude confere olhando a prancha de quadros |

Encontrou um problema? Abra uma issue.

## Licenças

- **Remotion**, o motor de vídeo, tem licença própria: grátis para pessoa física, organização sem fins lucrativos e empresa de até
  3 funcionários. Acima disso, a empresa precisa da licença deles: [remotion.pro](https://www.remotion.pro/).
- **ElevenLabs:** vídeo comercial exige plano pago.
- **Fontes:** SIL Open Font License, arquivos em `public/fonts/`. Ícones do quadro: Lucide, licença em `src/estilos/quadro/LICENCA-LUCIDE.txt`.
- Baseado na **Skill Motion** (TAOS), incluída aqui com autorização do autor.
- Edite só vídeos que você tem direito de usar. Ao clonar um estilo, copie a estrutura e o ritmo, nunca o conteúdo ou a marca de outra pessoa.
