/* =====================================================================================
   Estilo EDITORIAL: talking head com cartões (referência: @justyn.ai).

   Camadas, de trás para a frente:
     1. o vídeo gravado (public/<nome>/base.mp4), com a grade de cor do momento
     2. o que fica ATRÁS da pessoa: título gigante, grade de miniaturas
     3. a pessoa recortada (public/<nome>/recorte.webm, com transparência; só Mac, ver
        scripts/preparar-video.mjs). Sem recorte, o título fica na frente: o efeito é pulado.
     4. faixas de cinema, borda de película, vinheta e grão (quando a grade pede)
     5. cartões da frente, telas cheias e a legenda em tarja
   Com blocos "layout" no roteiro, as camadas 1 a 3 vão para dentro de um retângulo que muda de lugar
   (cheio, dividido, pequeno; ver ./layout.tsx), sobre um palco verde.
   Tudo vem do roteiro.json + tempos.json, passando pela agenda (src/estilos/agenda.mjs).
   ===================================================================================== */
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { agendaEditorial, type BlocoAgenda, type RoteiroEditorial } from '../agenda.mjs';
import type { TemposJson } from '../../tempos';
import { clamp, eio, eout } from '../comum/util';
import { BLOCOS_FRENTE, Miniaturas, RoteiroFilme, Tarja, TituloAtras, type Ctx } from './blocos';
import { MEDIDAS, PALETA_EDITORIAL, type Paleta } from './tema';
import { Caixa, layoutEm, layouts, mascaraRecorte, Palco, trocasDeLayout } from './layout';

const interpolar = (t: number, a: number, b: number, va: number, vb: number) => va + (vb - va) * clamp((t - a) / (b - a));

/* grades de cor: curva por canal (como uma LUT simples) + saturação. "natural" = só o ajuste do vídeo */
export const GRADES: Record<string, { r: string; g: string; b: string; sat: number; brilho: number; barras: number; vinheta: number; grao: number }> = {
  natural: { r: '0 1', g: '0 1', b: '0 1', sat: 1, brilho: 1, barras: 0, vinheta: 0.25, grao: 0.05 },
  cinema: { r: '0.0 0.2 0.54 0.88 1', g: '0.035 0.18 0.45 0.76 0.95', b: '0.07 0.16 0.35 0.58 0.8', sat: 1.2, brilho: 0.92, barras: 150, vinheta: 0.55, grao: 0.1 },
  sombrio: { r: '0.0 0.1 0.3 0.62 0.86', g: '0.02 0.13 0.33 0.62 0.84', b: '0.02 0.1 0.27 0.52 0.74', sat: 0.6, brilho: 0.78, barras: 0, vinheta: 0.8, grao: 0.12 },
  quente: { r: '0.04 0.3 0.62 0.9 1', g: '0.02 0.22 0.5 0.8 0.95', b: '0.0 0.14 0.36 0.62 0.82', sat: 1.1, brilho: 1, barras: 0, vinheta: 0.4, grao: 0.07 },
  pb: { r: '0 0.18 0.5 0.85 1', g: '0 0.18 0.5 0.85 1', b: '0 0.18 0.5 0.85 1', sat: 0, brilho: 1, barras: 0, vinheta: 0.5, grao: 0.12 },
};

const Defs: React.FC<{ frame: number; whip: number }> = ({ frame, whip }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      {Object.entries(GRADES).map(([nome, g]) => (
        <filter key={nome} id={`g-${nome}`} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={g.r} />
            <feFuncG type="table" tableValues={g.g} />
            <feFuncB type="table" tableValues={g.b} />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values={String(g.sat)} />
        </filter>
      ))}
      <filter id="grao-ed" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 9} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <filter id="whip-ed" x="-10%" y="0" width="120%" height="100%">
        <feGaussianBlur stdDeviation={`${whip} 0`} />
      </filter>
    </defs>
  </svg>
);

/** vídeo + o que fica atrás da pessoa + pessoa recortada, todos com a mesma grade.
    fundo < 1 esconde o fundo do vídeo (layout "pequeno" com recorte: só a pessoa; o som continua) */
const Pilha: React.FC<{ c: Ctx; recorte: string | null; volume: number; atras: React.ReactNode; audio: boolean; fundo?: number; mascara?: string; brilho?: string }> = ({
  c, recorte, volume, atras, audio, fundo = 1, mascara, brilho,
}) => (
  <AbsoluteFill>
    {c.video ? (
      <OffthreadVideo src={staticFile(c.video)} muted={!audio || volume === 0} volume={volume} style={{ width: 1080, height: 1920, objectFit: 'cover', filter: c.filtro, opacity: fundo < 1 ? fundo : undefined }} />
    ) : (
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, #5A5348 0%, #26231F 70%, #121110 100%)', filter: c.filtro }} />
    )}
    {atras}
    {recorte ? (
      <OffthreadVideo src={staticFile(recorte)} muted transparent style={{ position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover',
        filter: brilho ? `${c.filtro} ${brilho}` : c.filtro, WebkitMaskImage: mascara, maskImage: mascara }} />
    ) : null}
  </AbsoluteFill>
);

export const Editorial: React.FC<{ roteiro: RoteiroEditorial; tempos: TemposJson }> = ({ roteiro, tempos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ag = useMemo(() => agendaEditorial(roteiro, tempos), [roteiro, tempos]);
  const pal: Paleta = { ...PALETA_EDITORIAL, ...(roteiro.paleta ?? {}) };
  const ajuste = (roteiro as { ajusteVideo?: string }).ajusteVideo ?? '';
  const recorte = roteiro.recorte ?? null;

  // grade do momento e a anterior (a nova desce como cortina em 0,32 s)
  const grades = ag.blocos.filter((b) => b.tipo === 'grade');
  const atual = [...grades].reverse().find((g) => t >= g.t0 && t < g.t1);
  const idx = atual ? grades.indexOf(atual) : -1;
  const anterior = idx > 0 && grades[idx - 1].t1 >= atual!.t0 ? grades[idx - 1] : null;
  const modo = (b: BlocoAgenda | null | undefined) => (b ? String(b.modo ?? 'cinema') : 'natural');
  const g1 = GRADES[modo(atual)] ?? GRADES.natural;
  const g0 = GRADES[modo(anterior)] ?? GRADES.natural;
  const virada = atual ? eio((t - atual.t0) / 0.32) : 0;
  const filtro = (nome: string, g: typeof g1) => `${ajuste} brightness(${g.brilho}) url(#g-${nome})`;
  const fAtual = filtro(modo(atual), g1);
  const fAntes = filtro(modo(anterior), g0);
  const mix = (a: number, b: number) => a + (b - a) * virada;
  const barras = mix(g0.barras, g1.barras) * (atual?.barras === false ? 0 : 1);
  const vinheta = mix(g0.vinheta, g1.vinheta);
  const grao = mix(g0.grao, g1.grao);
  const pelicula = atual?.pelicula === true ? virada : 0;

  // câmera: aproximação lenta + soco de 3,5% quando a grade muda
  const soco = atual ? 1 + 0.035 * Math.sin(clamp((t - atual.t0) / 0.35) * Math.PI) : 1;
  const zoom = interpolar(t, 0, ag.dur, 1.0, 1.06) * soco;
  // whip pan: sai para a esquerda com borrão e volta pela direita
  const whip = ag.blocos.find((b) => b.tipo === 'whip' && t >= b.t0 && t < b.t1);
  let dx = 0, borrao = 0;
  if (whip) {
    const p = (t - whip.t0) / (whip.t1 - whip.t0);
    dx = p < 0.5 ? -eio(p * 2) * 1250 : (1 - eio((p - 0.5) * 2)) * 1250;
    borrao = Math.sin(p * Math.PI) * 60;
  }

  const miniaturas = roteiro.miniaturas ?? [];
  const ctxBase = { t, pal, video: roteiro.video, miniaturas, recorte: Boolean(recorte), palavras: tempos.palavras };
  const atras = (f: string) => (
    <>
      {ag.blocos.filter((b) => b.tipo === 'titulo-atras').map((b) => <TituloAtras key={b.id} b={b} c={{ ...ctxBase, filtro: f }} />)}
      {ag.blocos.filter((b) => b.tipo === 'miniaturas' && b.modo !== 'calendario').map((b) => <Miniaturas key={b.id} b={b} c={{ ...ctxBase, filtro: f }} />)}
    </>
  );
  const c: Ctx = { ...ctxBase, filtro: fAtual };
  const volume = roteiro.volumeVideo ?? 0;

  // layout do momento (só quando o roteiro tem blocos "layout"; sem eles, o caminho de sempre)
  const trocas = useMemo(() => trocasDeLayout(ag.blocos, ag.dur), [ag]);
  const temLayout = trocas.length > 0;
  const legY = roteiro.legenda ? roteiro.legenda.y ?? MEDIDAS.legendaY : MEDIDAS.legendaY;
  const foco = (ag.blocos.find((b) => b.tipo === 'layout' && Array.isArray(b.foco))?.foco as [number, number] | undefined) ?? [540, 900];
  const { lay } = layoutEm(t, trocas, layouts(foco, Boolean(recorte), legY));
  const so = 1 - lay.bg; // 1 = só a pessoa recortada (layout pequeno)
  const extra = temLayout ? { fundo: lay.bg, mascara: mascaraRecorte(lay), brilho: so > 0.02 ? `drop-shadow(0 0 ${14 * so}px ${pal.ouro}88)` : undefined } : {};
  const camadas = (
    <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '50% 42%' }}>
      <Pilha c={{ ...c, filtro: virada < 1 ? fAntes : fAtual }} recorte={recorte} volume={volume} atras={atras(fAntes)} audio {...extra} />
      {virada > 0 && virada < 1 ? (
        <AbsoluteFill style={{ clipPath: `inset(0 0 ${(1 - virada) * 100}% 0)` }}>
          <Pilha c={c} recorte={recorte} volume={0} atras={atras(fAtual)} audio={false} {...extra} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Defs frame={frame} whip={borrao} />
      {roteiro.audio ? <Audio src={staticFile(roteiro.audio)} /> : null}
      {roteiro.trilha ? <Audio src={staticFile(roteiro.trilha)} /> : null}
      <AbsoluteFill style={{ transform: `translateX(${dx}px)`, filter: borrao > 0.5 ? 'url(#whip-ed)' : undefined }}>
        {temLayout ? (
          <>
            <Palco t={t} pal={pal} />
            <Caixa lay={lay} pal={pal}>{camadas}</Caixa>
          </>
        ) : (
          camadas
        )}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 78% 62% at 50% 44%, transparent 50%, rgba(0,0,0,${vinheta}) 100%)` }} />
        {grao > 0 ? (
          <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: grao, mixBlendMode: 'overlay' }}>
            <rect width={1080} height={1920} filter="url(#grao-ed)" />
          </svg>
        ) : null}
        {pelicula > 0 ? <BordaPelicula k={pelicula} t={t} /> : null}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: barras * eout(virada), background: '#050505' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barras * eout(virada), background: '#050505' }} />
      </AbsoluteFill>
      {ag.blocos.filter((b) => b.tipo === 'miniaturas' && b.modo === 'calendario').map((b) => <Miniaturas key={b.id} b={b} c={c} />)}
      {ag.blocos.filter((b) => b.tipo === 'roteiro-filme').map((b) => <RoteiroFilme key={b.id} b={b} c={c} palavras={tempos.palavras} />)}
      {ag.blocos.map((b) => {
        const B = BLOCOS_FRENTE[b.tipo];
        return B ? <B key={b.id} b={b} c={c} /> : null;
      })}
      <Tarja t={t} pal={pal} leg={ag.legendas} y={temLayout ? lay.legY : roteiro.legenda ? roteiro.legenda.y : undefined} tam={roteiro.legenda ? roteiro.legenda.tam : undefined} />
    </AbsoluteFill>
  );
};

/** borda de película com furos, correndo (entra com a grade "cinema" + "pelicula": true) */
const BordaPelicula: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const desl = (t * 240) % 74;
  const lado = (esq: boolean) => (
    <div style={{ position: 'absolute', top: 0, bottom: 0, [esq ? 'left' : 'right']: 0, width: 62 * eout(k), background: '#070707', overflow: 'hidden' }}>
      {Array.from({ length: 28 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 16, top: i * 74 - desl, width: 30, height: 40, borderRadius: 7, background: '#EDE6D6' }} />
      ))}
    </div>
  );
  return (
    <>
      {lado(true)}
      {lado(false)}
    </>
  );
};
