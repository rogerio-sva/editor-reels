# Instala as dependências e a skill no Claude Code (Windows). No PowerShell, na pasta do projeto: .\instalar.ps1
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Instale o Node.js 22.18 ou mais novo: https://nodejs.org"; exit 1 }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Write-Host "Instale o ffmpeg: winget install Gyan.FFmpeg (e reabra o terminal)"; exit 1 }
npm ci
$destino = Join-Path $HOME ".claude\skills\editar-video"
New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
if (Test-Path $destino) { Remove-Item -Recurse -Force $destino }
Copy-Item -Recurse "skill\editar-video" $destino
node scripts/editor/verificar-ambiente.mjs
Write-Host "Pronto. Abra o Claude Code nesta pasta e peca: edita esse video <caminho do video>"
