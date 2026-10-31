#!/usr/bin/env node
/* Prepara o vídeo cortado para o render. Antes: scripts/editor/propor-cortes.mjs e aplicar-cortes.mjs.
     node scripts/reel/preparar.mjs <nome> [--foco=0.5] [--recorte]
   Entrada: saida/<nome>/corte.mp4. Grava em public/reels/<nome>/: video.mp4, audio.m4a, ultimo.jpg (e recorte.webm).
   Grava saida/<nome>/info.json (tamanho, duração, trocas de câmera) e saida/<nome>/folha.jpg para o agente olhar.
   --recorte: para o modelo moldura. Deixa o vídeo vertical (recortado em volta de --foco, x do rosto de 0 a 1) e
   recorta a pessoa: no Mac com o Vision; no Windows e no Linux com scripts/reel/recortar_rembg.py (pip install "rembg[cpu]"). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { sondar, duracao } from '../editor/lib/sh.mjs';
import { ff, folha, gravarJson, opcoes, posicionais } from './lib/comum.mjs';

const args = process.argv.slice(2);
const [nome] = posicionais(args);
const op = opcoes(args);
if (!nome) { console.error('Uso: node scripts/reel/preparar.mjs <nome> [--foco=0.5] [--recorte]'); process.exit(1); }
const corte = path.join('saida', nome, 'corte.mp4');
if (!fs.existsSync(corte)) { console.error(`falta ${corte}: rode antes propor-cortes e aplicar-cortes`); process.exit(1); }
const pub = path.join('public', 'reels', nome);
fs.mkdirSync(pub, { recursive: true });

let { largura, altura } = sondar(corte);
const dur = duracao(corte);
let video = corte;
if (op.recorte && largura > altura) {
  // 9:16 em volta do rosto
  const foco = Number(op.foco ?? 0.5);
  const cw = `ih*9/16`;
  video = path.join('saida', nome, 'vertical.mp4');
  ff(['-i', corte, '-vf', `crop=${cw}:ih:'min(max(iw*${foco}-${cw}/2,0),iw-${cw})':0,scale=1080:1920,setsar=1`, '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-c:a', 'copy', video]);
  largura = 1080; altura = 1920;
} else if (largura < altura && (largura !== 1080 || altura !== 1920) && op.recorte) {
  video = path.join('saida', nome, 'vertical.mp4');
  ff(['-i', corte, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1', '-c:v', 'libx264', '-crf', '17', '-preset', 'fast', '-c:a', 'copy', video]);
  largura = 1080; altura = 1920;
}
ff(['-i', video, '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-r', '30', '-pix_fmt', 'yuv420p', path.join(pub, 'video.mp4')]);
ff(['-i', corte, '-vn', '-c:a', 'aac', '-b:a', '192k', path.join(pub, 'audio.m4a')]);
ff(['-sseof', '-0.2', '-i', video, '-frames:v', '1', '-q:v', '3', path.join(pub, 'ultimo.jpg')]);

// trocas de câmera (o agente decide o enquadramento de cada plano olhando a folha)
const r = spawnSync('ffmpeg', ['-hide_banner', '-i', video, '-vf', 'scdet=threshold=12', '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const trocas = [...new Set([...String(r.stderr).matchAll(/lavfi\.scd\.time:\s*([\d.]+)/g)].map((m) => Number(Number(m[1]).toFixed(2))))].filter((t) => t > 0.4 && t < dur - 0.4);

let recorte = null;
if (op.recorte) {
  const destino = path.join(pub, 'recorte.webm');
  if (process.platform === 'darwin') {
    execFileSync('node', ['scripts/preparar-video.mjs', video, `reels/${nome}/mac`, '--miniaturas=1'], { stdio: 'inherit' });
    fs.renameSync(path.join(pub, 'mac', 'recorte.webm'), destino);
    fs.rmSync(path.join(pub, 'mac'), { recursive: true, force: true });
  } else {
    const q = path.join('.preparo', nome, 'q');
    fs.rmSync(q, { recursive: true, force: true });
    fs.mkdirSync(q, { recursive: true });
    ff(['-i', video, '-r', '30', '-q:v', '3', path.join(q, '%05d.jpg')]);
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['scripts/reel/recortar_rembg.py', q], { stdio: 'inherit' });
    ff(['-framerate', '30', '-i', path.join(q, '%05d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', '-row-mt', '1', '-cpu-used', '4', destino]);
    fs.rmSync(path.join('.preparo', nome), { recursive: true, force: true });
  }
  recorte = `reels/${nome}/recorte.webm`;
}
folha(video, path.join('saida', nome, 'folha.jpg'), { n: 12, colunas: 6, dur });
gravarJson(path.join('saida', nome, 'info.json'), { largura, altura, duracao: Number(dur.toFixed(2)), trocas, recorte });
console.log(`ok: ${largura}x${altura}, ${dur.toFixed(1)} s, ${trocas.length} trocas de câmera${recorte ? ', recorte pronto' : ''}. Olhe saida/${nome}/folha.jpg e escreva saida/${nome}/partitura.json`);
