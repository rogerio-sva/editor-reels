#!/usr/bin/env node
/* Trilha + efeitos sonoros por código, presos à MESMA tabela de batidas da imagem
   (src/estilos/agenda.mjs). Nada de banco de som nem de internet: cada som é sintetizado aqui.

   Uso:  node scripts/trilha.mjs src/videos/<nome> [--saida=public/<nome>/trilha.wav] [--musica=editorial|quadro|nenhuma]
                                 [--volume-musica=1] [--volume-efeitos=1] [--bpm=84]
   Estilo cinético (pasta sem roteiro.json): usa o tempos.json para a duração, efeitos de um sons.json
   opcional ([{ "t": 1.2, "som": "whoosh" }]) e --audio=narracao.mp3 (em public/) para o ducking.
   Lê roteiro.json e tempos.json da pasta do vídeo. Se o roteiro tem "audio" (a narração em public/),
   a música abaixa sozinha enquanto alguém fala (ducking). No roteiro, aponte "trilha" para o arquivo
   gerado e a composição toca narração + trilha juntas.

   Sons (o nome é o que a agenda põe na tabela): ping, tecla, papel, pop, risco, whoosh, subida, impacto,
   swell, projetor, tique, caneta, lapis, apagar, ding, virada.
   Música: "editorial" = lo-fi quente (piano elétrico, baixo, bateria macia, chiado de vinil) que ganha
   cordas e grave quando a grade vira "cinema"/"sombrio"; "quadro" = marimba leve em pentatônica + pad. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { agendaEditorial, agendaQuadro } from '../src/estilos/agenda.mjs';

const args = process.argv.slice(2);
const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [pasta] = args.filter((a) => !a.startsWith('--'));
if (!pasta) {
  console.error('Uso: node scripts/trilha.mjs src/videos/<nome> [--saida=public/<nome>/trilha.wav] [--musica=editorial|quadro|nenhuma]');
  process.exit(1);
}
const tempos = JSON.parse(fs.readFileSync(path.join(pasta, 'tempos.json'), 'utf8'));
const arqRoteiro = path.join(pasta, 'roteiro.json');
// estilo cinético (sem roteiro.json): duração pelo tempos.json, efeitos opcionais em sons.json
// ([{ "t": 1.2, "som": "whoosh" }, ...]) e a narração por --audio=<arquivo em public/>
const roteiro = fs.existsSync(arqRoteiro) ? JSON.parse(fs.readFileSync(arqRoteiro, 'utf8')) : { estilo: 'cinetico', audio: opc.audio };
const ag = roteiro.estilo === 'quadro' ? agendaQuadro(roteiro, tempos)
  : roteiro.estilo === 'editorial' ? agendaEditorial(roteiro, tempos)
  : { dur: Number(opc.duracao ?? (tempos.fim_fala_s + 0.8)), sons: fs.existsSync(path.join(pasta, 'sons.json')) ? JSON.parse(fs.readFileSync(path.join(pasta, 'sons.json'), 'utf8')).map((x) => ({ ganho: 1, ...x })) : [] };
const saida = opc.saida ?? path.join('public', path.basename(pasta), 'trilha.wav');
const estiloMusica = opc.musica ?? (roteiro.estilo === 'cinetico' ? 'editorial' : roteiro.estilo);

const SR = 44100;
const DUR = ag.dur;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N); // efeitos
const ML = new Float32Array(N), MR = new Float32Array(N); // música (vai para o ducking e a sala)

/* ------------------------------------------------------------ utilidades */
let semente = 1607;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
const ruido = () => rnd() * 2 - 1;
const amostras = (d) => Math.max(1, Math.round(d * SR));
const buf = (d, f) => { const n = amostras(d), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = f(i / SR, i, n); return x; };
const soma = (L_, R_, t, x, g = 1, pan = 0) => {
  const i0 = Math.round(t * SR), a = ((pan + 1) * Math.PI) / 4, gl = Math.cos(a) * Math.SQRT2 * g, gr = Math.sin(a) * Math.SQRT2 * g;
  for (let k = 0; k < x.length; k++) { const j = i0 + k; if (j < 0) continue; if (j >= N) break; L_[j] += x[k] * gl; R_[j] += x[k] * gr; }
};
// filtros de 1 e 2 polos (biquad do cookbook do RBJ)
const biquad = (x, tipo, f, q = 0.707) => {
  const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  if (tipo === 'pb') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (tipo === 'pa') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; }
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
};
const env = (t, ataque, queda) => (t < ataque ? t / ataque : Math.exp(-(t - ataque) * queda));
const varre = (x, f0, f1, q = 1.4) => { // passa-banda que varre de f0 a f1 (blocos de 256)
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i += 256) {
    const u = i / x.length, f = f0 * Math.pow(f1 / f0, u);
    y.set(biquad(x.subarray(i, i + 256), 'pf', f, q), i);
  }
  return y;
};

/* ------------------------------------------------------------ efeitos */
const SONS = {
  ping: () => buf(0.9, (t) => (Math.sin(2 * Math.PI * 1568 * t) + 0.35 * Math.sin(2 * Math.PI * 2352 * t) + 0.15 * Math.sin(2 * Math.PI * 3136 * t)) * env(t, 0.002, 6) * 0.5),
  tecla: () => {
    const f = 2600 + rnd() * 1800;
    const clique = biquad(buf(0.03, () => ruido()), 'pf', f, 2.2);
    const corpo = buf(0.04, (t) => Math.sin(2 * Math.PI * (170 + rnd() * 30) * t) * Math.exp(-t * 120));
    return buf(0.04, (t, i) => (clique[i] ?? 0) * Math.exp(-t * 160) * 1.4 + corpo[i] * 0.5);
  },
  papel: () => { const x = biquad(buf(0.35, () => ruido()), 'pf', 2400, 0.6); return buf(0.35, (t, i, n) => x[i] * Math.sin((Math.PI * i) / n) ** 2 * 0.35); },
  pop: () => buf(0.12, (t) => Math.sin(2 * Math.PI * (300 + 600 * Math.exp(-t * 60)) * t) * Math.exp(-t * 32) * 0.7),
  risco: () => { const x = biquad(buf(0.22, () => ruido()), 'pf', 2600, 0.9); return buf(0.22, (t, i, n) => x[i] * (i / n) ** 0.5 * (1 - i / n) * 1.6 * (0.7 + 0.3 * Math.sin(t * 160))); },
  whoosh: () => { const x = varre(buf(0.45, () => ruido()), 250, 3200); return buf(0.45, (t, i, n) => x[i] * Math.sin((Math.PI * i) / n) ** 2 * 1.3); },
  subida: () => {
    const x = varre(buf(0.55, () => ruido()), 400, 6000, 2);
    return buf(0.55, (t, i, n) => (x[i] * 0.6 + 0.25 * Math.sin(2 * Math.PI * (200 + 500 * (i / n) ** 2) * t)) * (i / n) ** 2);
  },
  impacto: () => {
    const grave = buf(1.6, (t) => Math.sin(2 * Math.PI * (35 + 45 * Math.exp(-t * 4)) * t) * Math.exp(-t * 2.4));
    const baque = biquad(buf(0.25, () => ruido()), 'pb', 500);
    return buf(1.6, (t, i) => Math.tanh((grave[i] + (baque[i] ?? 0) * Math.exp(-t * 18) * 0.8) * 1.6) * 0.8);
  },
  swell: () => buf(1.2, (t, i, n) => {
    const u = i / n, e = u < 0.75 ? (u / 0.75) ** 2 : Math.exp(-(u - 0.75) * 14);
    return [196, 293.66, 392, 493.88].reduce((a, f) => a + Math.sin(2 * Math.PI * f * t + f), 0) * e * 0.12;
  }),
  projetor: (d = 1.5) => {
    const n = amostras(d), x = new Float32Array(n);
    for (let k = 0; k * (SR / 24) < n; k++) { const i0 = Math.round(k * (SR / 24)); for (let j = 0; j < 220 && i0 + j < n; j++) x[i0 + j] += ruido() * Math.exp(-j / 40) * 0.25; }
    const filtrado = biquad(x, 'pf', 1800, 0.8);
    return buf(d, (t, i, nn) => filtrado[i] + Math.sin(2 * Math.PI * 60 * t) * 0.04 * Math.min(1, t * 8, ((nn - i) / SR) * 8));
  },
  tique: () => buf(0.5, (t) => (t < 0.02 ? ruido() * Math.exp(-t * 300) : 0) + (t > 0.25 && t < 0.27 ? ruido() * Math.exp(-(t - 0.25) * 300) * 0.7 : 0)),
  caneta: () => { const x = biquad(buf(0.5, () => ruido()), 'pf', 3500, 1.2); return buf(0.5, (t, i, n) => x[i] * (0.6 + 0.4 * Math.sin(t * 60)) * Math.sin((Math.PI * i) / n) * 0.9); },
  lapis: (d = 0.5) => {
    // grafite no papel: raspado macio no médio-agudo, sem chiado; o grão varia devagar, como a mão
    const a = biquad(biquad(buf(d, () => ruido()), 'pf', 2600, 0.7), 'pb', 4200), b = biquad(buf(d, () => ruido()), 'pf', 900, 0.9);
    let g = 0.6, alvo = 0.6;
    return buf(d, (t, i, n) => {
      if (i % 2400 === 0) alvo = 0.45 + rnd() * 0.55;
      g += (alvo - g) * 0.002;
      const borda = Math.min(1, t / 0.05, (n - i) / SR / 0.08);
      return (a[i] * 0.5 + b[i] * 0.2) * g * borda;
    });
  },
  apagar: () => { const x = biquad(buf(0.32, () => ruido()), 'pb', 1600); return buf(0.32, (t, i, n) => x[i] * Math.abs(Math.sin(t * Math.PI * 9)) * Math.sin((Math.PI * i) / n) * 1.2); },
  ding: () => buf(1.2, (t) => (Math.sin(2 * Math.PI * 1318.5 * t) + 0.6 * Math.sin(2 * Math.PI * 1975.5 * t)) * env(t, 0.003, 4) * 0.35),
  virada: () => { const x = varre(buf(0.3, () => ruido()), 3000, 400); return buf(0.3, (t, i, n) => x[i] * Math.sin((Math.PI * i) / n) ** 2); },
};
const GANHO_EFEITO = { tecla: 0.55, lapis: 0.11, pop: 0.6, ping: 0.7, papel: 0.6, risco: 0.7, whoosh: 0.75, subida: 0.5, impacto: 0.8, swell: 0.7,
  projetor: 0.5, tique: 0.5, caneta: 0.6, apagar: 0.6, ding: 0.55, virada: 0.6 };
const vEf = Number(opc['volume-efeitos'] ?? 1);
for (const s of ag.sons) {
  const f = SONS[s.som];
  if (!f) { console.warn('som desconhecido:', s.som); continue; }
  soma(L, R, s.t, f(s.dur ?? undefined), s.ganho * (GANHO_EFEITO[s.som] ?? 0.6) * vEf, (rnd() - 0.5) * 0.4);
}

/* ------------------------------------------------------------ música */
const BPM = Number(opc.bpm ?? (estiloMusica === 'quadro' ? 100 : 84));
const BATIDA = 60 / BPM;
const nota = (m) => 440 * Math.pow(2, (m - 69) / 12);
// a partir de quando a música "abre" (grade de cor que muda, no editorial)
const virada = estiloMusica === 'editorial' ? (ag.blocos ?? []).find((b) => b.tipo === 'grade')?.t0 ?? Infinity : Infinity;
const modoVirada = estiloMusica === 'editorial' ? String((ag.blocos ?? []).find((b) => b.tipo === 'grade')?.modo ?? 'cinema') : '';

if (estiloMusica === 'editorial') {
  const ACORDES = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
  const ESCUROS = [[50, 53, 57, 60], [46, 50, 53, 57], [48, 51, 55, 58], [45, 48, 52, 55]]; // Dm7 Bbmaj7 Cm7 Am7
  const piano = (f, d) => buf(d, (t) => (Math.sin(2 * Math.PI * f * t) + 0.28 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 3)) * env(t, 0.006, 1.6) * (1 + 0.08 * Math.sin(2 * Math.PI * 4.5 * t)));
  const bumbo = buf(0.4, (t) => Math.sin(2 * Math.PI * (48 + 70 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9));
  const chimbal = biquad(buf(0.06, () => ruido()), 'pa', 7000);
  const aro = biquad(buf(0.12, () => ruido()), 'pf', 1800, 1.5);
  for (let k = 0; k * BATIDA < DUR; k++) {
    const t = k * BATIDA, compasso = Math.floor(k / 4), tempo = k % 4;
    const escuro = t >= virada && modoVirada === 'sombrio';
    const ac = (escuro ? ESCUROS : ACORDES)[compasso % 4];
    if (tempo === 0) ac.forEach((m, i) => soma(ML, MR, t + i * 0.012, piano(nota(m + 12), BATIDA * 4), 0.06, -0.3 + 0.2 * i));
    if (tempo === 2) ac.slice(1).forEach((m, i) => soma(ML, MR, t + BATIDA * 0.5 + i * 0.01, piano(nota(m + 12), BATIDA * 2), 0.035, 0.3 - 0.2 * i));
    if (tempo === 0 || tempo === 2) soma(ML, MR, t, buf(BATIDA * 1.8, (tt) => Math.sin(2 * Math.PI * nota(ac[0] - 12) * tt) * env(tt, 0.01, 2.2)), 0.16);
    soma(ML, MR, t, bumbo, tempo === 0 || (tempo === 2 && t >= virada) ? 0.5 : tempo === 2 ? 0.3 : 0);
    if (tempo === 1 || tempo === 3) soma(ML, MR, t, buf(0.12, (tt, i) => aro[i] * Math.exp(-tt * 40)), 0.22, 0.1);
    soma(ML, MR, t, buf(0.06, (tt, i) => chimbal[i] * Math.exp(-tt * 70)), 0.05, 0.4);
    soma(ML, MR, t + BATIDA / 2, buf(0.06, (tt, i) => chimbal[i] * Math.exp(-tt * 90)), 0.03, 0.4);
  }
  // chiado de vinil (estalos esparsos + ruído baixo)
  const vin = biquad(buf(DUR, () => ruido()), 'pf', 3000, 0.5);
  soma(ML, MR, 0, buf(DUR, (t, i) => vin[i] * 0.012 + (rnd() < 0.0004 ? ruido() * 0.25 : 0)), 1);
  // depois da virada: cordas (dente de serra desafinado, filtrado) + grave contínuo
  if (Number.isFinite(virada)) {
    const d = DUR - virada;
    const raiz = modoVirada === 'sombrio' ? 38 : 41;
    const cordas = buf(d, (t) => [0, 7, 12, 16].reduce((a, m) => a + [0.997, 1.003].reduce((b, det) => b + ((((nota(raiz + 12 + m) * det * t) % 1) * 2) - 1), 0), 0) * Math.min(1, t / 0.9) * 0.05);
    soma(ML, MR, virada, biquad(biquad(cordas, 'pb', modoVirada === 'sombrio' ? 800 : 1400), 'pb', 1600), 0.9);
    soma(ML, MR, virada, buf(d, (t) => Math.sin(2 * Math.PI * nota(raiz - 12) * t) * Math.min(1, t / 0.5) * 0.18), 1);
  }
} else if (estiloMusica === 'quadro') {
  const PENTA = [62, 64, 66, 69, 71, 74, 76, 78]; // D maior pentatônica
  const marimba = (f) => buf(0.6, (t) => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 4 * f * t) * Math.exp(-t * 30)) * env(t, 0.002, 9));
  const padrao = [0, 2, 4, 2, 5, 4, 2, 1];
  for (let k = 0; k * (BATIDA / 2) < DUR; k++) {
    const t = k * (BATIDA / 2);
    const base = Math.floor(k / 16) % 2 ? 1 : 0;
    soma(ML, MR, t, marimba(nota(PENTA[(padrao[k % 8] + base) % PENTA.length])), k % 2 ? 0.05 : 0.08, k % 2 ? 0.3 : -0.3);
  }
  const pad = buf(DUR, (t) => [50, 57, 62, 66].reduce((a, m) => a + Math.sin(2 * Math.PI * nota(m) * 0.998 * t) + Math.sin(2 * Math.PI * nota(m) * 1.002 * t), 0) * 0.012 * Math.min(1, t / 1.5));
  soma(ML, MR, 0, biquad(pad, 'pb', 1200), 1);
  for (const c of ag.cenas ?? []) soma(ML, MR, c.t0, SONS.ding(), 0.12);
}

// sala (Schroeder: 4 pentes + 2 passa-tudo) só na música
const sala = (x) => {
  const pentes = [1557, 1617, 1491, 1422].map((d) => ({ d, b: new Float32Array(d), i: 0 }));
  const passa = [225, 556].map((d) => ({ d, b: new Float32Array(d), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const p of pentes) { const v = p.b[p.i]; p.b[p.i] = x[n] + v * 0.78; p.i = (p.i + 1) % p.d; s += v; }
    s *= 0.25;
    for (const p of passa) { const v = p.b[p.i]; const o = -s + v; p.b[p.i] = s + v * 0.5; p.i = (p.i + 1) % p.d; s = o; }
    y[n] = x[n] + s * 0.28;
  }
  return y;
};
const mL = sala(ML), mR = sala(MR);

/* ------------------------------------------------------------ ducking pela narração */
let duck = null;
let rmsVoz = null; // RMS da voz nos trechos falados (referência do volume da trilha)
// a voz é a narração ("audio") ou, no editorial com a fala no próprio vídeo, o som do vídeo
const fonteVoz = roteiro.audio ?? ((roteiro.volumeVideo ?? 0) >= 0.5 ? roteiro.video : undefined);
if (fonteVoz && fs.existsSync(path.join('public', fonteVoz))) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const bruto = execFileSync(npx, ['remotion', 'ffmpeg', '-loglevel', 'error', '-i', path.join('public', fonteVoz), '-vn', '-f', 'wav', '-c:a', 'pcm_s16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  // (o ffmpeg do Remotion só grava em formatos com contêiner: lê-se o WAV e pula-se o cabeçalho)
  const ini = bruto.indexOf('data') + 8;
  const voz = new Float32Array(Math.floor((bruto.length - ini) / 2));
  for (let i = 0; i < voz.length; i++) voz[i] = bruto.readInt16LE(ini + i * 2) / 32768;
  { let s2 = 0, nn = 0; for (let i = 0; i < voz.length; i++) if (Math.abs(voz[i]) > 0.01) { s2 += voz[i] * voz[i]; nn++; } rmsVoz = Math.sqrt(s2 / Math.max(1, nn)); }
  duck = new Float32Array(N);
  const jan = Math.round(0.03 * SR);
  let e = 0, pico = 1e-6;
  for (let i = 0; i < voz.length; i += jan) { let s = 0; for (let k = i; k < Math.min(voz.length, i + jan); k++) s += voz[k] * voz[k]; pico = Math.max(pico, Math.sqrt(s / jan)); }
  for (let i = 0; i < N; i += jan) {
    let s = 0; for (let k = i; k < Math.min(voz.length, i + jan); k++) s += voz[k] * voz[k];
    const alvo = Math.min(1, Math.sqrt(s / jan) / (pico * 0.25));
    e = alvo > e ? e + (alvo - e) * 0.6 : e + (alvo - e) * 0.12; // sobe rápido, solta devagar
    for (let k = i; k < Math.min(N, i + jan); k++) duck[k] = 1 - 0.55 * e;
  }
}

/* ------------------------------------------------------------ mix, normalização e WAV */
const vMu = estiloMusica === 'nenhuma' ? 0 : Number(opc['volume-musica'] ?? 1);
let picoM = 1e-9;
for (let i = 0; i < N; i++) picoM = Math.max(picoM, Math.abs(mL[i]), Math.abs(mR[i]));
const alvoMusica = 0.22 * vMu; // pico da música antes do ducking (~ -13 dBFS), fica embaixo da voz
const outL = new Float32Array(N), outR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const d = duck ? duck[i] : 1;
  const fim = Math.min(1, (N - i) / (SR * 0.6), i / (SR * 0.05));
  outL[i] = (mL[i] / picoM) * alvoMusica * d * fim + L[i];
  outR[i] = (mR[i] / picoM) * alvoMusica * d * fim + R[i];
}
// volume relativo à voz: a trilha (música + efeitos) fica ~12 dB abaixo da fala; sem narração, RMS -24 dBFS
let pico = 1e-9, s2 = 0;
for (let i = 0; i < N; i++) { pico = Math.max(pico, Math.abs(outL[i]), Math.abs(outR[i])); s2 += (outL[i] ** 2 + outR[i] ** 2) / 2; }
const rmsTrilha = Math.sqrt(s2 / N);
const alvoRms = rmsVoz ? rmsVoz * Math.pow(10, -12 / 20) : Math.pow(10, -24 / 20);
const ganho = Math.min(alvoRms / Math.max(1e-9, rmsTrilha), 0.7 / pico);
if (rmsVoz) console.log(`voz: ${(20 * Math.log10(rmsVoz)).toFixed(1)} dBFS (RMS nos trechos falados); trilha ajustada para ~12 dB abaixo`);
const dados = Buffer.alloc(44 + N * 4);
dados.write('RIFF', 0); dados.writeUInt32LE(36 + N * 4, 4); dados.write('WAVE', 8); dados.write('fmt ', 12);
dados.writeUInt32LE(16, 16); dados.writeUInt16LE(1, 20); dados.writeUInt16LE(2, 22); dados.writeUInt32LE(SR, 24);
dados.writeUInt32LE(SR * 4, 28); dados.writeUInt16LE(4, 32); dados.writeUInt16LE(16, 34); dados.write('data', 36); dados.writeUInt32LE(N * 4, 40);
const q = (v) => Math.max(-32767, Math.min(32767, Math.round(Math.tanh(v * ganho * 1.1) / 1.1 * 32767)));
for (let i = 0; i < N; i++) { dados.writeInt16LE(q(outL[i]), 44 + i * 4); dados.writeInt16LE(q(outR[i]), 46 + i * 4); }
fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
fs.writeFileSync(saida, dados);
console.log(`ok ${saida}: ${DUR.toFixed(2)} s, ${ag.sons.length} efeitos, música "${estiloMusica}"${duck ? ' com ducking pela narração' : ''}`);
