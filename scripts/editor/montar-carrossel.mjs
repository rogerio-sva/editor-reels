#!/usr/bin/env node
/* Monta o roteiro de um carrossel em vídeo a partir da pasta de slides e de um take.
 *   node scripts/editor/montar-carrossel.mjs --slides entrada/meu-carrossel --take entrada/take.mov \
 *        [--inicio 6] [--velocidade 6] --nome meu-carrossel
 * Ritmo medido no reel de referência: 0,9 s só de take, depois 1,2 s por slide em corte seco.
 * --inicio pula o começo do take (ex.: a pessoa chegando na cadeira).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh} from './lib/sh.mjs';
import {prepararVideo} from './preparar-video.mjs';
import {gerarSfx} from './sfx.mjs';

const INTRO = 0.9;
const POR_SLIDE = 1.2;

export const montarCarrossel = ({slides, take, inicioTake = 0, velocidade = 6, nome}) => {
  if (!nome) throw new Error('falta --nome');
  const arquivos = fs.readdirSync(slides).filter((f) => /\.(png|jpe?g|webp|mp4|mov)$/i.test(f)).sort();
  if (!arquivos.length) throw new Error(`nenhum slide em ${slides}`);
  fs.mkdirSync(`public/${nome}`, {recursive: true});
  const publicos = arquivos.map((f) => {
    const destino = `${nome}/${f.replace(/\.mov$/i, '.mp4')}`;
    if (/\.(mp4|mov)$/i.test(f)) prepararVideo(path.join(slides, f), destino);
    else fs.copyFileSync(path.join(slides, f), `public/${destino}`);
    return destino;
  });
  if (!fs.existsSync('public/troca.wav')) fs.copyFileSync(gerarSfx(), 'public/troca.wav');
  // Take cortado, acelerado e sem áudio, com a duração exata do vídeo (repete se for curto).
  const dur = INTRO + POR_SLIDE * publicos.length;
  const takePublico = `${nome}/take.mp4`;
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-stream_loop', '-1', '-ss', String(inicioTake), '-i', take,
    '-vf', `setpts=PTS/${velocidade},fps=30`, '-t', dur.toFixed(3), '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-g', '1', '-pix_fmt', 'yuv420p', `public/${takePublico}`]);
  const roteiro = {formato: 'carrossel', take: takePublico, inicioTake, velocidade,
    slides: publicos, introSeg: INTRO, porSlide: POR_SLIDE};
  fs.mkdirSync('roteiros', {recursive: true});
  const destino = `roteiros/${nome}.json`;
  fs.writeFileSync(destino, JSON.stringify(roteiro, null, 2));
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (n, p) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : p; };
  console.log(montarCarrossel({slides: opt('slides'), take: opt('take'), inicioTake: Number(opt('inicio', 0)),
    velocidade: Number(opt('velocidade', 6)), nome: opt('nome')}));
}
