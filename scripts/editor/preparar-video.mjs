#!/usr/bin/env node
/* Converte o vídeo da pessoa para H.264 all-intra dentro de public/.
 * Por quê: o Remotion corrompeu 215 quadros lendo HEVC de iPhone direto.
 * All-intra (-g 1) deixa o Remotion pular para qualquer quadro sem erro.
 *   node scripts/editor/preparar-video.mjs entrada/video.mov [nome-saida.mp4]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh, sondar} from './lib/sh.mjs';

export const prepararVideo = (entrada, nomeSaida) => {
  if (!fs.existsSync(entrada)) throw new Error(`não achei ${entrada}`);
  const nome = nomeSaida ?? path.basename(entrada).replace(/\.\w+$/, '') + '.mp4';
  fs.mkdirSync(path.dirname(`public/${nome}`), {recursive: true});
  const s = sondar(entrada);
  const args = ['-y', '-loglevel', 'error', '-i', entrada,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-g', '1', '-pix_fmt', 'yuv420p'];
  args.push(...(s.temAudio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']));
  sh('ffmpeg', [...args, `public/${nome}`]);
  return nome;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [entrada, saida] = process.argv.slice(2);
  if (!entrada) { console.error('uso: node scripts/editor/preparar-video.mjs <video> [saida.mp4]'); process.exit(1); }
  console.log(`pronto: public/${prepararVideo(entrada, saida)}`);
}
