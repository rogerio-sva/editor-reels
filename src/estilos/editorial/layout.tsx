/* =====================================================================================
   Layouts do editorial (bloco "layout"): onde fica o vídeo da pessoa na tela.
     cheio     a pessoa na tela inteira, cartões por cima (o editorial de sempre)
     dividido  motion em cima (0 a 960), a pessoa embaixo, com o rosto no meio do painel
     pequeno   motion na tela toda e a pessoa pequena embaixo à esquerda: recortada, sem fundo e
               esmaecendo para baixo (Mac, com o recorte); sem recorte, numa janela com borda
   A troca é uma mola de 0,6 s no retângulo do vídeo (nunca corte seco), começando 0,12 s antes da
   palavra. Sem nenhum bloco "layout" no roteiro, nada disto entra e o vídeo sai como antes.
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { BlocoAgenda } from '../agenda.mjs';
import { clamp, lerp } from '../comum/util';
import type { Paleta } from './tema';

export type Lay = {
  clip: [number, number, number, number, number]; // x y largura altura raio
  s: number; // escala do vídeo
  f: [number, number]; // ponto do vídeo (1080x1920)…
  c: [number, number]; // …que vai para este ponto da tela
  bg: number; // opacidade do fundo do vídeo (0 = só a pessoa recortada)
  fade: number; // y da tela onde a pessoa recortada começa a esmaecer
  borda: number; // contorno do retângulo (janela)
  legY: number; // topo da tarja
};
export type NomeLayout = 'cheio' | 'dividido' | 'pequeno';

const ANTECIPA = 0.12;
const SEM_FADE = 99999;

export const layouts = (foco: [number, number], recorte: boolean, legY: number): Record<NomeLayout, Lay> => ({
  cheio: { clip: [0, 0, 1080, 1920, 0], s: 1, f: [540, 960], c: [540, 960], bg: 1, fade: SEM_FADE, borda: 0, legY },
  dividido: { clip: [0, 960, 1080, 960, 0], s: 1, f: foco, c: [540, 1440], bg: 1, fade: SEM_FADE, borda: 0, legY: 924 },
  pequeno: recorte
    ? { clip: [0, 0, 1080, 1920, 0], s: 0.5, f: [foco[0], foco[1] + 140], c: [290, 1338], bg: 0, fade: 1560, borda: 0, legY: 1085 }
    : { clip: [70, 1150, 380, 676, 26], s: 380 / 1080, f: [540, 960], c: [260, 1488], bg: 1, fade: SEM_FADE, borda: 1, legY: 1040 },
});

const mix = (a: Lay, b: Lay, k: number): Lay => ({
  clip: a.clip.map((v, i) => lerp(v, b.clip[i], k)) as Lay['clip'],
  s: lerp(a.s, b.s, k),
  f: [lerp(a.f[0], b.f[0], k), lerp(a.f[1], b.f[1], k)],
  c: [lerp(a.c[0], b.c[0], k), lerp(a.c[1], b.c[1], k)],
  bg: lerp(a.bg, b.bg, clamp(k)),
  fade: lerp(Math.min(a.fade, 2400), Math.min(b.fade, 2400), k),
  borda: lerp(a.borda, b.borda, clamp(k)),
  legY: lerp(a.legY, b.legY, clamp(k)),
});

/** mola amortecida (0 → 1, passa um pouco do ponto e assenta) */
const mola = (t: number, dur = 0.6) => (t <= 0 ? 0 : 1 - Math.exp(-5.2 * (t / dur)) * Math.cos(4.2 * (t / dur)));

/** As trocas de layout na linha do tempo: cada bloco liga o seu modo; se tem "ate" e ninguém
    assume depois, volta para o cheio. */
export const trocasDeLayout = (blocos: BlocoAgenda[], dur: number) => {
  const lays = blocos.filter((b) => b.tipo === 'layout').sort((a, b) => a.t0 - b.t0);
  const trocas: { t: number; nome: NomeLayout }[] = [];
  lays.forEach((b, k) => {
    const nome = (['cheio', 'dividido', 'pequeno'].includes(String(b.modo)) ? b.modo : 'cheio') as NomeLayout;
    trocas.push({ t: Math.max(0, b.t0 - ANTECIPA), nome });
    const prox = lays[k + 1];
    if (b.t1 < dur - 0.01 && (!prox || prox.t0 > b.t1)) trocas.push({ t: b.t1, nome: 'cheio' });
  });
  return trocas;
};

/** layout do instante t, já com a mola da troca */
export const layoutEm = (t: number, trocas: { t: number; nome: NomeLayout }[], L: Record<NomeLayout, Lay>) => {
  let k = -1;
  for (let i = 0; i < trocas.length; i++) if (t >= trocas[i].t) k = i;
  if (k < 0) return { lay: L.cheio, nome: 'cheio' as NomeLayout };
  const antes = k > 0 ? L[trocas[k - 1].nome] : L.cheio;
  const p = trocas[k].t <= 0.001 && k === 0 ? 1 : mola(t - trocas[k].t);
  return { lay: mix(antes, L[trocas[k].nome], p), nome: trocas[k].nome };
};

/** Onde o vídeo (1080x1920) vai dentro do retângulo: escala e deslocamento, sem deixar borda vazia. */
export const enquadrar = (lay: Lay) => {
  const [x, y, cw, ch] = lay.clip;
  let s = lay.s;
  let [fx, fy] = lay.f;
  const [cx, cy] = lay.c;
  if (lay.bg > 0.01) {
    s = Math.max(s, cw / 1080, ch / 1920);
    const minX = (cx - x) / s, maxX = 1080 - (x + cw - cx) / s;
    const minY = (cy - y) / s, maxY = 1920 - (y + ch - cy) / s;
    if (minX <= maxX) fx = clamp(fx, minX, maxX);
    if (minY <= maxY) fy = clamp(fy, minY, maxY);
  }
  return { s, ox: cx - fx * s - x, oy: cy - fy * s - y };
};

/** fundo das áreas de motion (o que aparece onde o vídeo não cobre): verde da paleta com grade leve */
export const Palco: React.FC<{ t: number; pal: Paleta }> = ({ t, pal }) => {
  const gx = 50 + Math.sin(t * 0.35) * 16;
  const gy = 28 + Math.cos(t * 0.28) * 8;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 55% at ${gx}% ${gy}%, ${pal.verde} 0%, ${pal.verdeEscuro} 55%, #070C09 100%)` }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id="grade-palco" width={60} height={60} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(t * 14) % 60})`}>
            <path d="M60 0H0V60" fill="none" stroke={pal.creme} strokeOpacity={0.07} strokeWidth={1.2} />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#grade-palco)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Recorta e posiciona o conteúdo (o vídeo 1080x1920 e o que vai junto) no retângulo do layout. */
export const Caixa: React.FC<{ lay: Lay; pal: Paleta; children: React.ReactNode }> = ({ lay, pal, children }) => {
  const [x, y, cw, ch, r] = lay.clip;
  const { s, ox, oy } = enquadrar(lay);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: cw, height: ch, borderRadius: r, overflow: 'hidden',
      boxShadow: lay.borda > 0 ? `0 0 0 ${3 * lay.borda}px ${pal.ouro}, 0 24px 48px rgba(0,0,0,.45)` : undefined }}>
      <div style={{ position: 'absolute', left: ox, top: oy, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  );
};

/** máscara que esmaece a pessoa recortada para baixo, em coordenadas do vídeo (para usar dentro da Caixa) */
export const mascaraRecorte = (lay: Lay) => {
  if (lay.fade >= 2300) return undefined;
  const { s, oy } = enquadrar(lay);
  const y0 = (lay.fade - lay.clip[1] - oy) / s;
  return `linear-gradient(180deg, #000 0px, #000 ${y0}px, transparent ${y0 + 230 / s}px)`;
};
