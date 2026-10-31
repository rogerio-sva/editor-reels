/* =====================================================================================
   Estilo QUADRO: quadro branco desenhado a lápis no ritmo da fala (referência: @beprecht, no
   estilo do @davidabn_).

   Abertura opcional com o rosto (vídeo gravado, legenda curta no alto); depois papel off-white com
   vinheta, ícones de traço fino desenhados por um lápis que segue a ponta do traço, rótulos em
   caixa alta condensada inclinada, cada desenho preso à palavra que o cita. Cada cena nova limpa o
   quadro. Verde para o que é bom; vermelho (e X) para o que é ruim. Sem legenda de fala no quadro:
   o desenho é a legenda.
   Tudo vem do roteiro.json + tempos.json, passando pela agenda (src/estilos/agenda.mjs).
   ===================================================================================== */
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { agendaQuadro, legendas, type Op, type RoteiroQuadro } from '../agenda.mjs';
import type { TemposJson } from '../../tempos';
import { FE, medirTexto } from '../comum/FontesEstilos';
import { clamp, eio, eout, lerp } from '../comum/util';
import { ICONES } from './icones';

export const CORES_QUADRO = { tinta: '#2E2E33', verde: '#1E9E46', vermelho: '#D2382B', papel: '#F3F3EC' };
export const TRACO = 3.4; // px na tela, igual em qualquer tamanho de ícone
export const INCLINA = -9; // graus da letra
const ESPACO_LETRA = 1.5;
type Pt = [number, number];

/* ---------- geometria de cada operação: subcaminhos na tela + onde está a ponta do lápis ---------- */
type Geo = { subs: { d: string; len: number; a: number; b: number }[]; s: number; ox: number; oy: number; larg?: number };
const geometria = (o: Op): Geo => {
  if (o.tipo === 'icone') {
    const ds = ICONES[o.nome ?? 'interrogacao'] ?? ICONES.interrogacao;
    const s = (o.tam ?? 160) / 24;
    const lens = ds.map((d) => getLength(d));
    const total = lens.reduce((x, y) => x + y, 0);
    let acc = 0;
    const subs = ds.map((d, i) => {
      const a = acc / total;
      acc += lens[i];
      return { d, len: lens[i], a, b: acc / total };
    });
    return { subs, s, ox: (o.x ?? 0) - 12 * s, oy: (o.y ?? 0) - 12 * s };
  }
  if (o.tipo === 'traco') return { subs: [{ d: o.d!, len: getLength(o.d!), a: 0, b: 1 }], s: 1, ox: 0, oy: 0 };
  const fonte = `300 ${o.tam}px "${FE.quadro}"`;
  return { subs: [], s: 1, ox: 0, oy: 0, larg: medirTexto(o.txt ?? '', fonte) + ESPACO_LETRA * (o.txt ?? '').length };
};

const pontaDe = (o: Op, g: Geo, p: number): Pt => {
  p = clamp(p);
  if (o.tipo === 'texto') {
    const x0 = (o.x ?? 0) - (g.larg ?? 0) / 2;
    const tam = o.tam ?? 50;
    // a ponta corre na borda do texto revelado, subindo e descendo entre a base e o topo das letras
    const y = (o.y ?? 0) - tam * (0.3 + 0.24 * Math.sin(p * Math.max(8, (o.txt ?? '').length * 2.2)));
    return [x0 + (g.larg ?? 0) * p + Math.tan((-INCLINA * Math.PI) / 180) * ((o.y ?? 0) - y), y];
  }
  const sub = g.subs.find((q) => p <= q.b + 1e-9) ?? g.subs[g.subs.length - 1];
  const lp = clamp((p - sub.a) / Math.max(1e-6, sub.b - sub.a));
  const q = getPointAtLength(sub.d, sub.len * lp);
  return [g.ox + g.s * q.x, g.oy + g.s * q.y];
};

/* ---------- lápis amarelo (aponta para baixo à esquerda, ponta = origem) ---------- */
export const Lapis: React.FC<{ x: number; y: number; ang: number; escala?: number }> = ({ x, y, ang, escala = 0.42 }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang}) scale(${escala})`}>
    <g transform="translate(12 18)" opacity={0.16}>
      <rect x={14} y={-11} width={204} height={22} rx={6} fill="#000" filter="url(#sombraLapis)" />
    </g>
    <polygon points="0,0 13,-3.4 13,3.4" fill="#3b3b3b" />
    <polygon points="13,-3.4 40,-11 40,11 13,3.4" fill="#EBC79F" />
    <path d="M40 -11 Q36 -7 40 -3.6 Q36 0 40 3.6 Q36 7 40 11" fill="#F2D4AE" />
    <rect x={40} y={-11} width={140} height={22} fill="#F3BE2A" />
    <rect x={40} y={-11} width={140} height={6} fill="#F8D25C" />
    <rect x={40} y={5} width={140} height={6} fill="#D79C14" />
    <rect x={180} y={-11.5} width={18} height={23} fill="#C7CBD1" />
    <rect x={184} y={-11.5} width={2} height={23} fill="#A3A8B0" />
    <rect x={191} y={-11.5} width={2} height={23} fill="#A3A8B0" />
    <rect x={198} y={-11} width={22} height={22} rx={6} fill="#EE8E9E" />
  </g>
);

/* ---------- uma operação desenhada até o progresso p ---------- */
const Desenho: React.FC<{ o: Op; g: Geo; p: number; cor: string; id: string }> = ({ o, g, p, cor, id }) => {
  if (p <= 0) return null;
  if (o.tipo === 'texto') {
    const tam = o.tam ?? 50;
    const x = o.x ?? 0, y = o.y ?? 0;
    const x0 = x - (g.larg ?? 0) / 2;
    // inclinação em volta da linha de base; o recorte que revela o texto vive no mesmo espaço inclinado
    return (
      <g transform={`translate(${x} ${y}) skewX(${INCLINA}) translate(${-x} ${-y})`}>
        <clipPath id={id}>
          <rect x={x0 - 12} y={y - tam * 1.15} width={(g.larg ?? 0) * p + 12} height={tam * 1.5} />
        </clipPath>
        <text x={x} y={y} textAnchor="middle" fontFamily={FE.quadro} fontWeight={300} fontSize={tam} fill={cor} letterSpacing={ESPACO_LETRA}
          clipPath={`url(#${id})`}>
          {o.txt}
        </text>
      </g>
    );
  }
  return (
    <g transform={`translate(${g.ox} ${g.oy}) scale(${g.s})`}>
      {g.subs.map((sb, i) => {
        const lp = clamp((p - sb.a) / Math.max(1e-6, sb.b - sb.a));
        if (lp <= 0) return null;
        const ev = evolvePath(lp, sb.d);
        const dash = { strokeDasharray: lp < 1 ? ev.strokeDasharray : undefined, strokeDashoffset: lp < 1 ? ev.strokeDashoffset : undefined };
        // duas passadas, como lápis repassado: a segunda mais fina, mais clara e um pouco deslocada
        return (
          <g key={i}>
            <path d={sb.d} fill="none" stroke={cor} strokeWidth={TRACO / g.s} strokeLinecap="round" strokeLinejoin="round" {...dash} />
            <path d={sb.d} fill="none" stroke={cor} strokeWidth={(TRACO * 0.55) / g.s} strokeLinecap="round" strokeLinejoin="round" opacity={0.45}
              transform={`translate(${1.1 / g.s} ${-0.8 / g.s})`} {...dash} />
          </g>
        );
      })}
    </g>
  );
};

export const Quadro: React.FC<{ roteiro: RoteiroQuadro; tempos: TemposJson }> = ({ roteiro, tempos }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const ag = useMemo(() => agendaQuadro(roteiro, tempos, { largura: width, altura: height }), [roteiro, tempos, width, height]);
  const geos = useMemo(() => ag.cenas.map((c) => c.ops.map(geometria)), [ag]);
  const cores = { ...CORES_QUADRO, ...(roteiro.cores ?? {}) };
  const cor = (c: string) => (cores as Record<string, string>)[c] ?? cores.tinta;
  const legRosto = useMemo(() => (ag.rosto && ag.rosto.legenda !== false ? legendas(tempos.palavras, { max: 6, maxLetras: 34 }) : []), [ag, tempos]);

  const audio = (
    <>
      {roteiro.audio ? <Audio src={staticFile(roteiro.audio)} /> : null}
      {roteiro.trilha ? <Audio src={staticFile(roteiro.trilha)} /> : null}
    </>
  );

  // abertura com o rosto
  if (ag.rosto && t < ag.rosto.t1) {
    const l = legRosto.find((x) => t >= x.t0 - 0.07 && t < x.t1);
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        {audio}
        <OffthreadVideo src={staticFile(ag.rosto.video)} muted startFrom={Math.round((ag.rosto.inicio ?? 0) * fps)}
          style={{ width, height, objectFit: 'cover' }} />
        {l ? (
          <div style={{ position: 'absolute', top: height * 0.1, left: 90, right: 90, textAlign: 'center', fontFamily: FE.sans, fontWeight: 600,
            fontSize: 46, lineHeight: 1.2, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,.6)' }}>
            {l.palavras.map((p) => p.t).join(' ')}
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }

  // cena atual (a anterior some enquanto o quadro limpa)
  let ponta: Pt = [width + 120, height * 0.9];
  let desenhando = false;
  const visiveis: React.ReactNode[] = [];
  ag.cenas.forEach((c, ci) => {
    const proxT0 = ag.cenas[ci + 1]?.t0 ?? Infinity;
    if (t < c.t0 - 0.4 || t >= proxT0) return;
    const limpa = c.limpa !== null ? eio((t - c.limpa) / 0.22) : 0;
    const ops = c.ops;
    const g = geos[ci];
    visiveis.push(
      <g key={ci} opacity={1 - limpa} transform={`translate(0 ${-limpa * 30})`}>
        {ops.map((o, oi) => (
          <Desenho key={oi} o={o} g={g[oi]} p={(t - o.t0) / (o.t1 - o.t0)} cor={cor(o.cor)} id={`c${ci}o${oi}`} />
        ))}
      </g>,
    );
    // lápis: na ponta da operação ativa; entre operações viaja com arco; antes da primeira, entra pela direita
    if (c.limpa !== null && t >= c.limpa) {
      ponta = [width + 120, height * 0.9];
      return;
    }
    const primeira = ops[0];
    if (!primeira) return;
    if (t < primeira.t0) {
      const k = eio(clamp((t - (primeira.t0 - 0.4)) / 0.4));
      const b = pontaDe(primeira, g[0], 0);
      ponta = [lerp(width + 120, b[0], k), lerp(height * 0.75, b[1], k)];
      return;
    }
    for (let i = 0; i < ops.length; i++) {
      const o = ops[i];
      const prox = ops[i + 1];
      if (t >= o.t0 && t <= o.t1) {
        ponta = pontaDe(o, g[i], (t - o.t0) / (o.t1 - o.t0));
        desenhando = true;
        return;
      }
      if (t > o.t1 && (!prox || t < prox.t0)) {
        const a = pontaDe(o, g[i], 1);
        if (!prox) {
          const k = eio((t - o.t1 - 0.3) / 0.6);
          ponta = [lerp(a[0], width - 140, k), lerp(a[1], height * 0.82, k)];
        } else {
          const b = pontaDe(prox, g[i + 1], 0);
          const k = eio((t - o.t1) / Math.max(0.05, prox.t0 - o.t1));
          ponta = [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 22];
        }
        return;
      }
    }
  });
  const ang = -38 + (desenhando ? Math.sin(t * 31) * 2.2 : 0);
  const entrada = ag.rosto ? eout((t - ag.rosto.t1) / 0.12) : 1;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 70% at 50% 42%, ${cores.papel} 0%, #EFEDE4 55%, #D9D6CB 100%)` }}>
      {audio}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', opacity: entrada }}>
        <defs>
          <filter id="sombraLapis" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* fibra e dente do papel: relevo de ruído fino iluminado de lado */}
          <filter id="papelDente" filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed={11} result="n" />
            <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale={1.4} result="luz">
              <feDistantLight azimuth={235} elevation={58} />
            </feDiffuseLighting>
            <feColorMatrix in="luz" type="saturate" values="0" />
          </filter>
          {/* manchas grandes e suaves, como papel de verdade sob luz desigual */}
          <filter id="papelMancha" filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="3" seed={5} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.52  0 0 0 0 0.45  1.6 0 0 0 -0.75" />
          </filter>
          {/* grafite: o traço treme de leve e falha onde o papel tem dente */}
          <filter id="grafite" filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed={7} result="ondula" />
            <feDisplacementMap in="SourceGraphic" in2="ondula" scale={2.4} xChannelSelector="R" yChannelSelector="G" result="torto" />
            <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed={2} result="grao" />
            <feColorMatrix in="grao" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.8 0 0 0 -0.6" result="mascara" />
            <feComposite in="torto" in2="mascara" operator="in" result="granulado" />
            <feComponentTransfer in="granulado"><feFuncA type="linear" slope={0.92} /></feComponentTransfer>
          </filter>
        </defs>
        <rect width={width} height={height} filter="url(#papelMancha)" opacity={0.2} style={{ mixBlendMode: 'multiply' }} />
        <rect width={width} height={height} filter="url(#papelDente)" opacity={0.42} style={{ mixBlendMode: 'multiply' }} />
        <g filter="url(#grafite)">{visiveis}</g>
        <Lapis x={ponta[0]} y={ponta[1]} ang={ang} />
      </svg>
    </AbsoluteFill>
  );
};
