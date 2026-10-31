#!/usr/bin/env node
/* Conferência automática do vídeo pronto. node scripts/reel/conferir.mjs out/<nome>.mp4
   Técnico (todo sistema): quadro preto, imagem parada, silêncio, volume, pico.
   Área segura do Instagram (só no Mac, leitor de texto do Vision): texto que a interface cobre. Fora do Mac o agente
   confere olhando a prancha out/<nome>-conferencia.jpg. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const log = (args) => String(spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr);
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const tela = (video, dur) => {
  const bin = path.join(os.tmpdir(), 'editor-reels-ler-texto');
  if (!fs.existsSync(bin)) execFileSync('swiftc', ['-O', path.join(AQUI, 'ler_texto.swift'), '-o', bin], { stdio: 'pipe' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conferir-'));
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-t', String(Math.max(1, dur - 5)), '-vf', 'fps=1,scale=540:-2', path.join(tmp, 'q%03d.png')]);
    const imgs = fs.readdirSync(tmp).sort().map((f) => path.join(tmp, f));
    const lidos = JSON.parse(execFileSync(bin, imgs, { encoding: 'utf8', maxBuffer: 1 << 26 }) || '{}');
    const fora = {};
    imgs.forEach((im, s) => (lidos[im] ?? []).forEach((t) => {
      if (t.h < 0.012 || t.t.startsWith('@')) return;
      const onde = t.y + t.h > 0.845 ? 'na faixa de baixo (a legenda do post cobre)' : t.y < 0.06 ? 'colado no topo' : t.x + t.w > 0.905 && t.y > 0.55 && t.y < 0.86 ? 'na coluna de botões da direita' : null;
      if (onde) (fora[onde] ??= []).push([s, t.t]);
    }));
    return Object.entries(fora).map(([onde, l]) => `Texto ${onde}: ${new Set(l.map((x) => x[0])).size} s (ex.: "${l[0][1].slice(0, 40)}" em ${l[0][0]}s)`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};

export const conferir = (video) => {
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' }));
  const av = [];
  for (const m of log(['-i', video, '-vf', 'blackdetect=d=0.4:pix_th=0.08', '-an', '-f', 'null', '-']).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)) av.push(`Quadro preto de ${Number(m[1]).toFixed(1)}s a ${Number(m[2]).toFixed(1)}s`);
  for (const m of log(['-i', video, '-vf', 'freezedetect=n=0.002:d=4.5', '-an', '-f', 'null', '-']).matchAll(/freeze_start: ([\d.]+)/g)) if (Number(m[1]) < dur - 6) av.push(`Imagem parada por mais de 4,5 s a partir de ${Number(m[1]).toFixed(1)}s`);
  const a = log(['-i', video, '-af', 'silencedetect=n=-45dB:d=1.5,ebur128=peak=true', '-vn', '-f', 'null', '-']);
  for (const m of a.matchAll(/silence_start: ([\d.]+)/g)) if (Number(m[1]) < dur - 6) av.push(`Silêncio de mais de 1,5 s a partir de ${Number(m[1]).toFixed(1)}s`);
  const lufs = [...a.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  if (lufs && (Number(lufs[1]) < -16 || Number(lufs[1]) > -12)) av.push(`Volume em ${Number(lufs[1]).toFixed(1)} LUFS (o padrão do Reels é -14)`);
  if (process.platform === 'darwin') {
    try { av.push(...tela(video, dur)); } catch (e) { av.push(`Leitura da tela não rodou: ${String(e.message).slice(0, 100)}`); }
  }
  return av;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const av = conferir(process.argv[2]);
  console.log(av.length ? av.map((a) => `- ${a}`).join('\n') : 'nada a corrigir');
}
