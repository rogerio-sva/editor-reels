#!/usr/bin/env node
/* Volume final do vídeo (o de Reels: -14 LUFS, pico verdadeiro até -1,5 dBTP), em duas passadas:
 * a primeira mede, a segunda aplica com os números medidos. Uma passada só parou em -17 LUFS num take
 * real; duas acertam. O vídeo é copiado sem recompressão.
 *
 *   node scripts/editor/masterizar.mjs out/<nome>-bruto.mp4 out/<nome>.mp4 [--lufs=-14]
 */
import {fileURLToPath} from 'node:url';
import {sh} from './lib/sh.mjs';

const medir = (arquivo, filtro) => {
  const log = sh('bash', ['-c', `ffmpeg -hide_banner -nostats -i ${JSON.stringify(arquivo)} -af ${JSON.stringify(filtro)} -f null - 2>&1`]);
  const json = log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1);
  return JSON.parse(json);
};

export const masterizar = (entrada, saida, {lufs = -14, pico = -1.5, lra = 11} = {}) => {
  const alvo = `I=${lufs}:TP=${pico}:LRA=${lra}`;
  const m = medir(entrada, `loudnorm=${alvo}:print_format=json`);
  const filtro = `loudnorm=${alvo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', entrada, '-map', '0:v?', '-map', '0:a', '-c:v', 'copy', '-af', filtro,
    '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', saida]);
  const f = medir(saida, `loudnorm=${alvo}:print_format=json`);
  return {antes: Number(m.input_i), depois: Number(f.input_i), pico: Number(f.input_tp)};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const [entrada, saida] = args.filter((a) => !a.startsWith('--'));
  const lufs = Number(args.find((a) => a.startsWith('--lufs='))?.slice(7) ?? -14);
  if (!entrada || !saida) { console.error('uso: node scripts/editor/masterizar.mjs <entrada.mp4> <saida.mp4> [--lufs=-14]'); process.exit(1); }
  const r = masterizar(entrada, saida, {lufs});
  console.log(`pronto: ${saida} (${r.antes.toFixed(1)} → ${r.depois.toFixed(1)} LUFS, pico ${r.pico.toFixed(1)} dBTP)`);
}
