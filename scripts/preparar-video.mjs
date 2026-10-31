#!/usr/bin/env node
/* Prepara um vídeo gravado para o estilo EDITORIAL (talking head).

   Uso:  node scripts/preparar-video.mjs <video> <nome> [--de=12.5] [--ate=40] [--sem-recorte] [--miniaturas=8]
   Ex.:  node scripts/preparar-video.mjs ~/Downloads/take.mov meu-reel --de=3 --ate=58

   Gera em public/<nome>/:
     base.mp4         o trecho escolhido, vertical 1080x1920, 30 fps, com o áudio original
     recorte.webm     só a pessoa, com fundo transparente (Mac: Vision; permite o título ATRÁS dela)
     mini/01.jpg ...  quadros de vários pontos do vídeo, para grade de miniaturas, película, etc.
     info.json        duração, se tem recorte e a lista de miniaturas (cole no roteiro.json)
   O recorte usa o Vision do macOS (precisa do Xcode Command Line Tools: `xcode-select --install`).
   No Windows ou Linux o recorte é pulado com aviso: o título fica na frente da pessoa. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [entrada, nome] = args.filter((a) => !a.startsWith('--'));
if (!entrada || !nome) {
  console.error('Uso: node scripts/preparar-video.mjs <video> <nome> [--de=0] [--ate=fim] [--sem-recorte] [--miniaturas=8]');
  process.exit(1);
}
const W = Number(opc.largura ?? 1080), H = Number(opc.altura ?? 1920);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const ff = (lista) => execFileSync(npx, ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...lista], { stdio: 'inherit' });
const sonda = (arq) => {
  const r = execFileSync(npx, ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim();
  return Number(r);
};
const pub = path.resolve('public', nome);
const tmp = path.resolve('.preparo', nome);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(path.join(tmp, 'f'), { recursive: true });
fs.mkdirSync(path.join(pub, 'mini'), { recursive: true });

const total = sonda(entrada);
const de = Number(opc.de ?? 0);
const ate = Math.min(Number(opc.ate ?? total), total);
const enquadra = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
// (o ffmpeg que vem com o Remotion é enxuto: sem filtro fps; a taxa vai por -r)
const corte = ['-ss', String(de), '-to', String(ate), '-i', entrada];
const querRecorte = !opc['sem-recorte'];
const mac = process.platform === 'darwin';
let recorte = false;

if (querRecorte && mac) {
  console.log('1/3 quadros do trecho…');
  ff([...corte, '-vf', enquadra, '-r', '30', '-q:v', '3', path.join(tmp, 'f', '%05d.jpg')]);
  console.log('2/3 recortando a pessoa (Vision)…');
  const bin = path.resolve('.preparo', 'recortar');
  if (!fs.existsSync(bin)) execFileSync('swiftc', ['-O', path.resolve('scripts/recortar-pessoa.swift'), '-o', bin], { stdio: 'inherit' });
  console.log('3/3 base.mp4 e recorte.webm…');
  ff(['-framerate', '30', '-i', path.join(tmp, 'f', '%05d.jpg'), ...corte, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', path.join(pub, 'base.mp4')]);
  // o Vision escreve os quadros já com o alfa (PNG em sequência) direto no ffmpeg: nada de PNG gigante no disco
  execFileSync('sh', ['-c', `"${bin}" "${path.join(tmp, 'f')}" | ${npx} remotion ffmpeg -y -loglevel error -f image2pipe -c:v png -framerate 30 -i - ` +
    `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -row-mt 1 -deadline good -cpu-used 4 "${path.join(pub, 'recorte.webm')}"`], { stdio: 'inherit' });
  recorte = true;
} else {
  if (querRecorte) console.warn('AVISO: recorte da pessoa só funciona no Mac (Vision). Seguindo sem recorte: o título fica na frente da pessoa.');
  console.log('1/1 base.mp4…');
  ff([...corte, '-vf', enquadra, '-r', '30', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', path.join(pub, 'base.mp4')]);
}

// miniaturas espalhadas pelo vídeo inteiro (não só pelo trecho)
const nMini = Number(opc.miniaturas ?? 8);
const miniaturas = [];
for (let i = 0; i < nMini; i++) {
  const t = (total * (i + 0.5)) / nMini;
  const arq = path.join(pub, 'mini', `${String(i + 1).padStart(2, '0')}.jpg`);
  ff(['-ss', t.toFixed(2), '-i', entrada, '-frames:v', '1', '-vf', `scale=540:960:force_original_aspect_ratio=increase,crop=540:960`, '-q:v', '4', arq]);
  miniaturas.push(`${nome}/mini/${path.basename(arq)}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
const info = { video: `${nome}/base.mp4`, recorte: recorte ? `${nome}/recorte.webm` : null, duracao: Number((ate - de).toFixed(2)), miniaturas };
fs.writeFileSync(path.join(pub, 'info.json'), JSON.stringify(info, null, 1) + '\n');
console.log(`ok → public/${nome}/ (${info.duracao} s, recorte: ${recorte ? 'sim' : 'não'})`);
console.log('Cole no roteiro.json:', JSON.stringify({ video: info.video, recorte: info.recorte, miniaturas }));
void os;
