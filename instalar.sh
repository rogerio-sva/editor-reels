#!/bin/bash
# Instala as dependências e a skill no Claude Code (Mac e Linux). Rode na pasta do projeto: ./instalar.sh
set -e
command -v node >/dev/null || { echo "Instale o Node.js 22.18 ou mais novo: https://nodejs.org"; exit 1; }
command -v ffmpeg >/dev/null || { echo "Instale o ffmpeg (Mac: brew install ffmpeg)"; exit 1; }
npm ci
mkdir -p "$HOME/.claude/skills"
rm -rf "$HOME/.claude/skills/editar-video"
cp -R skill/editar-video "$HOME/.claude/skills/editar-video"
node scripts/editor/verificar-ambiente.mjs || true
echo "Pronto. Abra o Claude Code nesta pasta e peça: edita esse vídeo <caminho do vídeo>"
