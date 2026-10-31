#!/usr/bin/env node
/* Prévia para aprovar: vídeo em meia resolução e uma folha com 12 quadros e o tempo de cada um.
 * O agente olha a folha antes de mostrar (sincronia, legibilidade, dado sensível na tela).
 *   node scripts/editor/previa.mjs roteiros/meu-video.json
 */
import {fileURLToPath} from 'node:url';
import {sh, duracao} from './lib/sh.mjs';
import {renderizar} from './render.mjs';

export const gerarPrevia = (roteiroPath) => {
  const video = renderizar(roteiroPath, {previa: true});
  const folha = video.replace(/-previa\.mp4$/, '-folha.jpg');
  const d = duracao(video);
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vf',
    `fps=12/${d.toFixed(3)},scale=270:-1,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=6x2`,
    '-frames:v', '1', folha]);
  return {video, folha};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = process.argv[2];
  if (!r) { console.error('uso: node scripts/editor/previa.mjs <roteiro.json>'); process.exit(1); }
  const {video, folha} = gerarPrevia(r);
  console.log(`prévia: ${video}\nfolha de quadros: ${folha}`);
}
