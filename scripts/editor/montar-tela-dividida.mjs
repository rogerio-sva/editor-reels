#!/usr/bin/env node
/* Monta o roteiro de uma tela dividida: vídeo preparado, duração e palavras.
 * As cenas ficam vazias: o agente escreve cada uma com a âncora (frase dita) e a pessoa aprova.
 *   node scripts/editor/montar-tela-dividida.mjs --video entrada/video.mov --palavras saida/video.palavras.json --nome meu-video
 */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {duracao} from './lib/sh.mjs';
import {prepararVideo} from './preparar-video.mjs';

export const montarTelaDividida = ({video, palavrasJson, nome}) => {
  if (!nome) throw new Error('falta --nome');
  const publico = prepararVideo(video, `${nome}/video.mp4`);
  const {palavras} = JSON.parse(fs.readFileSync(palavrasJson, 'utf8'));
  const roteiro = {formato: 'tela-dividida', video: publico, duracao: Number(duracao(`public/${publico}`).toFixed(3)),
    palavras, filmagem: 'baixo', cenas: []};
  fs.mkdirSync('roteiros', {recursive: true});
  const destino = `roteiros/${nome}.json`;
  fs.writeFileSync(destino, JSON.stringify(roteiro, null, 2));
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  console.log(montarTelaDividida({video: opt('video'), palavrasJson: opt('palavras'), nome: opt('nome')}));
}
