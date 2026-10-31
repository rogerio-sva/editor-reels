#!/usr/bin/env node
/* Decide ONDE cortar os silêncios de um vídeo e grava os trechos falados num JSON.
 * Não corta o vídeo: quem emenda os trechos é o Remotion. Assim o corte se revisa sem reprocessar.
 *
 *   node scripts/editor/cortar-silencio.mjs entrada/video.mov [--db -32] [--min 0.45] [--folga 0.10]
 *
 * --db     limiar de silêncio em dBFS (padrão: automático). Mais negativo = mais tolerante
 * --min    duração mínima do silêncio para virar corte (padrão 0.45 s)
 * --folga  respiro mantido nas pontas de cada fala (padrão 0.10 s)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh, duracao as medirDuracao} from './lib/sh.mjs';

const stderrDoFfmpeg = (arquivo, filtro) =>
  sh('bash', ['-c', `ffmpeg -hide_banner -i ${JSON.stringify(arquivo)} -af ${filtro} -f null - 2>&1`]);

/* Limiar fixo não funciona: vídeo de celular fica entre -43 e -54 dBFS de volume médio,
 * e -32 fixo classificaria a fala inteira como silêncio. O limiar sai do volume real:
 * 18 dB abaixo do pico, e nunca acima da média, senão a própria fala entra como silêncio. */
const limiarAutomatico = (arquivo) => {
  const r = stderrDoFfmpeg(arquivo, 'volumedetect');
  const max = Number((r.match(/max_volume:\s*(-?[\d.]+)/) || [])[1]);
  const mean = Number((r.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
  if (!Number.isFinite(max) || !Number.isFinite(mean)) return -32;
  return Number(Math.min(max - 18, mean - 2).toFixed(1));
};

export const cortarSilencio = (entrada, {db, min = 0.45, folga = 0.10} = {}) => {
  if (!fs.existsSync(entrada)) throw new Error(`não achei ${entrada}`);
  const automatico = db === undefined;
  const limiar = automatico ? limiarAutomatico(entrada) : db;
  const total = medirDuracao(entrada);
  const log = stderrDoFfmpeg(entrada, `silencedetect=noise=${limiar}dB:d=${min}`);

  const silencios = [];
  let inicio = null;
  for (const linha of log.split('\n')) {
    const a = linha.match(/silence_start:\s*(-?[\d.]+)/);
    const b = linha.match(/silence_end:\s*([\d.]+)/);
    if (a) inicio = Number(a[1]);
    if (b && inicio !== null) { silencios.push([Math.max(0, inicio), Number(b[1])]); inicio = null; }
  }
  if (inicio !== null) silencios.push([inicio, total]);

  // A folga devolve o respiro que o silencedetect come nas pontas; sem ela a fala soa robótica.
  const trechos = [];
  let cursor = 0;
  for (const [s, e] of silencios) {
    const fim = Math.max(cursor, s + folga);
    if (fim - cursor > 0.08) trechos.push({inicio: cursor, fim});
    cursor = Math.max(cursor, e - folga);
  }
  if (total - cursor > 0.08) trechos.push({inicio: cursor, fim: total});

  return {
    limiar, automatico, duracaoOriginal: Number(total.toFixed(3)),
    trechos: trechos.map((t) => ({inicio: Number(t.inicio.toFixed(3)), fim: Number(t.fim.toFixed(3))})),
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const entrada = a.find((x) => !x.startsWith('--'));
  if (!entrada) { console.error('uso: node scripts/editor/cortar-silencio.mjs <video> [--db -32] [--min 0.45] [--folga 0.10]'); process.exit(1); }
  const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 ? Number(a[i + 1]) : undefined; };
  const r = cortarSilencio(entrada, {db: opt('db'), min: opt('min') ?? 0.45, folga: opt('folga') ?? 0.10});
  const util = r.trechos.reduce((t, c) => t + (c.fim - c.inicio), 0);
  const destino = path.join('saida', path.basename(entrada).replace(/\.\w+$/, '') + '.cortes.json');
  fs.mkdirSync('saida', {recursive: true});
  fs.writeFileSync(destino, JSON.stringify(r, null, 2));
  console.log(`limiar ${r.limiar} dB (${r.automatico ? 'automático' : 'manual'}), ${r.duracaoOriginal.toFixed(1)} s viram ${util.toFixed(1)} s em ${r.trechos.length} trechos: ${destino}`);
}
