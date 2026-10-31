#!/usr/bin/env node
/* Áudio de narração → tempos.json (início e fim de cada palavra), com whisper.cpp rodando no seu
   computador (nada sai da máquina). Cada frase (termina em . ? !) vira uma cena; ajuste depois.

   Precisa, uma vez:  npm i -D @remotion/install-whisper-cpp@4.0.409
   (na primeira execução ele baixa e compila o whisper.cpp e baixa o modelo em .whisper/; em Mac e
   Linux precisa de git, make e um compilador C; no Windows baixa o executável pronto)

   Uso:  node scripts/transcrever.mjs public/narracao.mp3 src/videos/meu/tempos.json [--modelo=small] [--idioma=pt]
   Modelos: tiny, base, small (padrão: bom em português), medium (melhor, mais pesado). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [entrada, saida] = args.filter((a) => !a.startsWith('--'));
if (!entrada || !saida) {
  console.error('Uso: node scripts/transcrever.mjs <audio> <saida/tempos.json> [--modelo=small] [--idioma=pt]');
  process.exit(1);
}
let w;
try {
  w = await import('@remotion/install-whisper-cpp');
} catch {
  console.error('Falta o pacote. Rode: npm i -D @remotion/install-whisper-cpp@4.0.409');
  process.exit(1);
}
const VERSAO = '1.5.5';
const modelo = opc.modelo ?? 'small';
const pasta = path.resolve('.whisper');
const wav = path.resolve('.whisper', 'entrada-16k.wav');
fs.mkdirSync(pasta, { recursive: true });

// whisper.cpp só lê WAV 16 kHz mono: converte com o ffmpeg que vem com o Remotion
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', path.resolve(entrada), '-ar', '16000', '-ac', '1', wav], { stdio: 'inherit' });

await w.installWhisperCpp({ to: pasta, version: VERSAO, printOutput: true });
await w.downloadWhisperModel({ model: modelo, folder: pasta, printOutput: true });
const resultado = await w.transcribe({
  inputPath: wav,
  whisperPath: pasta,
  whisperCppVersion: VERSAO,
  model: modelo,
  tokenLevelTimestamps: true,
  language: opc.idioma ?? 'pt',
  splitOnWord: true,
  printOutput: false,
});
const { captions } = w.toCaptions({ whisperCppOutput: resultado });
const r2 = (v) => Math.round(v * 100) / 100;
const palavras = captions
  .map((c) => ({ t: c.text.trim(), s: r2(c.startMs / 1000), e: r2(c.endMs / 1000) }))
  .filter((p) => p.t && !/^\[.*\]$/.test(p.t));
if (palavras.length === 0) {
  console.error('Nenhuma palavra reconhecida.');
  process.exit(1);
}
const fps = 30;
const cenas = [];
let inicio = 0;
palavras.forEach((p, i) => {
  const fimFrase = /[.?!…]$/.test(p.t) || i === palavras.length - 1;
  if (fimFrase) {
    const proxima = palavras[i + 1];
    const fim = proxima ? proxima.s : p.e;
    cenas.push({ cena: cenas.length + 1, inicio_s: r2(inicio), fim_s: r2(fim), inicio_f: Math.round(inicio * fps), dur_f: Math.round(fim * fps) - Math.round(inicio * fps) });
    inicio = fim;
  }
});
cenas[0].inicio_s = 0;
cenas[0].inicio_f = 0;
fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
fs.writeFileSync(saida, JSON.stringify({ fps, fim_fala_s: palavras[palavras.length - 1].e, cenas, palavras }, null, 1) + '\n');
console.log(`ok: ${palavras.length} palavras, ${cenas.length} cenas → ${saida}`);
console.log('Confira o texto das palavras (o whisper pode errar a grafia) e corrija no JSON; os tempos ficam.');
