#!/usr/bin/env node
/* Mede o contraste real de um texto sobre o vídeo, num quadro e numa caixa.
 *   node scripts/editor/contraste.mjs saida/video.mp4 3.2 60,1380,1020,1500
 * Separa tinta e fundo pelo limiar de Otsu (a tinta é a classe com menos pixels) e compara o
 * núcleo de cada uma. Abaixo de 4,5:1 não se lê no celular: 2,3:1 já foi entregue e reprovado.
 */
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sondar} from './lib/sh.mjs';

const linear = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const percentil = (arr, p) => {
  const s = Float64Array.from(arr).sort();
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const otsu = (L) => {
  const h = new Array(256).fill(0);
  for (const v of L) h[Math.min(255, Math.floor(v * 256))]++;
  const n = L.length;
  let soma = 0;
  for (let i = 0; i < 256; i++) soma += i * h[i];
  let sB = 0, wB = 0, melhor = 0, k = 0;
  for (let i = 0; i < 256; i++) {
    wB += h[i];
    if (!wB || wB === n) continue;
    sB += i * h[i];
    const mB = sB / wB, mF = (soma - sB) / (n - wB);
    const v = wB * (n - wB) * (mB - mF) ** 2;
    if (v > melhor) { melhor = v; k = i; }
  }
  return (k + 1) / 256;
};

export const medirContraste = (mp4, t, [x0, y0, x1, y1]) => {
  const {largura, altura} = sondar(mp4);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', mp4, '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 26});
  if (raw.length < largura * altura * 3) throw new Error(`não consegui ler o quadro em ${t} s`);
  const L = [];
  for (let y = y0; y < Math.min(y1, altura); y++) {
    for (let x = x0; x < Math.min(x1, largura); x++) {
      const i = (y * largura + x) * 3;
      L.push(0.2126 * linear(raw[i] / 255) + 0.7152 * linear(raw[i + 1] / 255) + 0.0722 * linear(raw[i + 2] / 255));
    }
  }
  const k = otsu(L);
  const claro = L.filter((v) => v >= k), escuro = L.filter((v) => v < k);
  if (claro.length < 50 || escuro.length < 50) return 1; // caixa sem texto distinguível
  const tintaClara = claro.length <= escuro.length;
  const [alto, baixo] = tintaClara
    ? [percentil(claro, 90), percentil(escuro, 40)]
    : [percentil(claro, 60), percentil(escuro, 10)];
  return (alto + 0.05) / (baixo + 0.05);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mp4, t, caixa] = process.argv.slice(2);
  if (!caixa) { console.error('uso: node scripts/editor/contraste.mjs <mp4> <segundo> <x0,y0,x1,y1>'); process.exit(1); }
  const r = medirContraste(mp4, Number(t), caixa.split(',').map(Number));
  console.log(`${r.toFixed(1)}:1${r < 4.5 ? '  ABAIXO DE 4,5:1, não se lê no celular' : '  ok'}`);
}
