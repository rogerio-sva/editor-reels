#!/usr/bin/env node
/* Take bruto, passo 2 de 2: corta o vídeo como o cortes.json manda (conferido pelo agente) e põe a
 * voz tratada no lugar do som original. Cada emenda ganha 12 ms de fade para não estalar.
 *
 *   node scripts/editor/aplicar-cortes.mjs <nome> [--tempos=src/videos/<nome>/tempos.json]
 *
 * Gera:
 *   saida/<nome>/corte.mp4   o vídeo sem erros nem silêncios, com a voz tratada (mesma resolução do bruto)
 *   src/videos/<nome>/tempos.json  as palavras que ficaram, já no tempo do corte (para o estilo editorial)
 * Próximo passo (estilo editorial): node scripts/preparar-video.mjs saida/<nome>/corte.mp4 <nome>
 * O volume final (-14 LUFS) é acertado no fim, depois do render: scripts/editor/masterizar.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh, duracao} from './lib/sh.mjs';
import {trechosDasFrases, duracaoDosTrechos, palavrasNoCorte, temposDoCorte} from './lib/cortes.mjs';

const FADE = 0.012;

/** filter_complex que recorta e emenda os trechos (vídeo da entrada 0, voz da entrada 1). */
export const filtroDeCorte = (trechos) => {
  const partes = [];
  trechos.forEach((t, k) => {
    const d = (t.fim - t.inicio).toFixed(4);
    partes.push(`[0:v]trim=${t.inicio.toFixed(4)}:${t.fim.toFixed(4)},setpts=PTS-STARTPTS[v${k}]`);
    partes.push(`[1:a]atrim=${t.inicio.toFixed(4)}:${t.fim.toFixed(4)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:d=${FADE},afade=t=out:st=${Math.max(0, d - FADE).toFixed(4)}:d=${FADE}[a${k}]`);
  });
  partes.push(`${trechos.map((_, k) => `[v${k}][a${k}]`).join('')}concat=n=${trechos.length}:v=1:a=1[v][a]`);
  return partes.join(';');
};

export const aplicarCortes = (nome, {tempos} = {}) => {
  const pasta = path.join('saida', nome);
  const arq = path.join(pasta, 'cortes.json');
  if (!fs.existsSync(arq)) throw new Error(`não achei ${arq}: rode antes o propor-cortes.mjs`);
  const c = JSON.parse(fs.readFileSync(arq, 'utf8'));
  const {palavras} = JSON.parse(fs.readFileSync(path.join(pasta, 'palavras.json'), 'utf8'));
  const trechos = trechosDasFrases(palavras, c.frases, {pausa: c.pausa, folga: c.folga, tirarPalavras: c.tirarPalavras ?? []});
  if (!trechos.length) throw new Error('nenhum trecho ficou: confira o "fica" das frases no cortes.json');
  const filtro = filtroDeCorte(trechos);
  fs.writeFileSync(path.join(pasta, 'filtro.txt'), filtro); // só para conferir; vai inteiro na linha de comando
  const saida = path.join(pasta, 'corte.mp4');
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', c.video, '-i', c.voz, '-filter_complex', filtro,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', saida]);
  const t = temposDoCorte(palavrasNoCorte(palavras, trechos));
  const destTempos = tempos ?? path.join('src', 'videos', nome, 'tempos.json');
  fs.mkdirSync(path.dirname(destTempos), {recursive: true});
  fs.writeFileSync(destTempos, JSON.stringify(t, null, 1) + '\n');
  fs.writeFileSync(path.join(pasta, 'trechos.json'), JSON.stringify(trechos.map(({inicio, fim, texto}) => ({inicio, fim, texto})), null, 1));
  return {saida, tempos: destTempos, trechos, previsto: duracaoDosTrechos(trechos), real: duracao(saida)};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const nome = args.find((a) => !a.startsWith('--'));
  const tempos = args.find((a) => a.startsWith('--tempos='))?.slice(9);
  if (!nome) { console.error('uso: node scripts/editor/aplicar-cortes.mjs <nome> [--tempos=src/videos/<nome>/tempos.json]'); process.exit(1); }
  const r = aplicarCortes(nome, {tempos});
  console.log(`corte: ${r.saida} (${r.real.toFixed(2)} s em ${r.trechos.length} trechos; previsto ${r.previsto.toFixed(2)} s)`);
  console.log(`palavras no tempo do corte: ${r.tempos}`);
  console.log(`Próximo (estilo editorial): node scripts/preparar-video.mjs ${r.saida} ${nome}`);
}
