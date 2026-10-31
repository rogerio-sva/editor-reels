#!/usr/bin/env node
/* Renderiza um roteiro. Com --previa sai em meia resolução, rápido, para aprovar.
 *   node scripts/editor/render.mjs roteiros/meu-video.json [--previa]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh} from './lib/sh.mjs';
import {lerProps} from './lib/props.mjs';

const COMPOSICAO = {carrossel: 'Carrossel', reel: 'Reel', 'tela-dividida': 'TelaDividida', 'do-zero': 'DoZero', fala: 'Fala'};

export const renderizar = (roteiroPath, {previa = false} = {}) => {
  const props = lerProps(roteiroPath);
  const comp = COMPOSICAO[props.formato];
  if (!comp) throw new Error(`formato desconhecido: ${props.formato}`);
  const nome = path.basename(roteiroPath, '.json');
  fs.mkdirSync('saida', {recursive: true});
  const propsFile = `saida/${nome}.props.json`;
  fs.writeFileSync(propsFile, JSON.stringify(props));
  const destino = path.resolve(`saida/${nome}${previa ? '-previa' : ''}.mp4`);
  sh('npx', ['remotion', 'render', 'src/editor/index.ts', comp, destino, `--props=${propsFile}`,
    ...(previa ? ['--scale=0.5', '--crf=28'] : [])]);
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [r, ...resto] = process.argv.slice(2);
  if (!r) { console.error('uso: node scripts/editor/render.mjs <roteiro.json> [--previa]'); process.exit(1); }
  console.log(`pronto: ${renderizar(r, {previa: resto.includes('--previa')})}`);
}
