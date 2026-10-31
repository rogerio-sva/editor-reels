#!/usr/bin/env node
/* Monta o roteiro de um reel legendado: vídeo preparado, trechos sem silêncio e palavras.
 * Os zooms ficam vazios: quem decide é o agente, no roteiro que a pessoa aprova.
 *   node scripts/editor/montar-reel.mjs --video entrada/video.mov --palavras saida/video.palavras.json --nome meu-reel
 */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepararVideo} from './preparar-video.mjs';
import {cortarSilencio} from './cortar-silencio.mjs';

export const montarReel = ({video, palavrasJson, nome}) => {
  if (!nome) throw new Error('falta --nome');
  const publico = prepararVideo(video, `${nome}/video.mp4`);
  const {trechos} = cortarSilencio(video);
  const {palavras} = JSON.parse(fs.readFileSync(palavrasJson, 'utf8'));
  const roteiro = {formato: 'reel', video: publico, trechos, palavras, zooms: []};
  fs.mkdirSync('roteiros', {recursive: true});
  const destino = `roteiros/${nome}.json`;
  fs.writeFileSync(destino, JSON.stringify(roteiro, null, 2));
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  console.log(montarReel({video: opt('video'), palavrasJson: opt('palavras'), nome: opt('nome')}));
}
