#!/usr/bin/env node
/* Quadros soltos para conferir (um bundle só, apagado no fim):
     node scripts/stills.mjs <composicao> <pastaSaida> <escala> <q1> <q2> ...
   Ex.: node scripts/stills.mjs Demo out/stills 0.5 20 120 240
   Outra composição no mesmo bundle: escreva Composicao@quadro (ex.: T-glitchRGB@36 M-04@40).
   Saída: <pastaSaida>/<composicao>-q0020.jpg ... (abra e olhe antes de renderizar o vídeo). */
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [id, saida, escala = '0.5', ...quadros] = process.argv.slice(2);
if (!id || !saida || quadros.length === 0) {
  console.error('Uso: node scripts/stills.mjs <composicao> <pastaSaida> <escala> <q1> <q2> ...');
  process.exit(1);
}
fs.mkdirSync(saida, { recursive: true });
const inputProps = process.env.PROPS ? JSON.parse(fs.readFileSync(process.env.PROPS, 'utf8')) : undefined;
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
try {
  const comps = new Map();
  for (const item of quadros) {
    const [cid, q] = item.includes('@') ? item.split('@') : [id, item];
    if (!comps.has(cid)) comps.set(cid, await selectComposition({ serveUrl, id: cid, inputProps }));
    const arquivo = path.join(saida, `${cid}-q${String(q).padStart(4, '0')}.jpg`);
    await renderStill({ serveUrl, composition: comps.get(cid), frame: Number(q), inputProps, scale: Number(escala), output: arquivo, imageFormat: 'jpeg', jpegQuality: 85 });
    console.log('ok', arquivo);
  }
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
}
