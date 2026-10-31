/* =====================================================================================
   Filmagem.tsx: a gravação (16:9) dentro de uma cena de "fala + motion".

   A gravação corre no tempo do vídeo inteiro: cada cena mostra o trecho certo (startFrom = início da
   Sequence da cena), então as transições misturam as duas cenas no mesmo instante da fala.
   O som NÃO sai daqui (muted): o áudio da fala corre inteiro por baixo (VideoMontado audio=...).

   MODOS
     retrato  ocupa a tela vertical inteira, recortada em volta de `foco` (x do rosto, 0 a 1)
     faixa    o quadro 16:9 inteiro numa faixa (largura da tela), em `y`
     card     dentro de um cartão (x, y, w, h) com borda do acento e brilho; recorte em volta de `foco`
   `zoom` = [início, fim] da aproximação ao longo da cena (câmera viva, curva suave).
   `planos` (partitura): trocas de câmera com o x do rosto de cada plano. No retrato, plano com rosto
   recorta no rosto; plano aberto (duas pessoas) mostra o quadro inteiro numa faixa sobre ele mesmo
   desfocado; gravação vertical só cobre a tela. `orig` = tamanho da gravação (padrão 1920x1080).
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { useCenaM } from '../cena';
import { ease, FPS_M, RGB } from '../tema';
import type { Plano } from '../biblioteca/tipos';

type Props = {
  src: string;
  modo?: 'retrato' | 'faixa' | 'card';
  foco?: number;
  focoY?: number;
  zoom?: [number, number];
  y?: number;
  caixa?: { x: number; y: number; w: number; h: number };
  brilho?: number;
  escurece?: number;
  planos?: Plano[];
  orig?: { w: number; h: number };
  /** retrato com plano aberto: y do topo da faixa (padrão: terço de cima, deixa o texto embaixo) */
  yAberto?: number;
};

export const Filmagem: React.FC<Props> = ({ src, modo = 'retrato', foco = 0.5, focoY = 0.4, zoom = [1, 1.06], y = 600, caixa, brilho = 1, escurece = 0, planos, orig, yAberto }) => {
  const c = useCenaM();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const ORIG_W = orig?.w ?? 1920;
  const ORIG_H = orig?.h ?? 1080;
  // plano da câmera neste instante (partitura): o rosto dele manda no recorte
  const t = c.global / FPS_M;
  const plano = planos?.find((p) => t >= p.a - 1e-3 && t < p.b) ?? planos?.[planos.length - 1];
  const vertical = ORIG_H > ORIG_W || plano?.tipo === 'vertical';
  const aberto = !vertical && plano?.tipo === 'aberto';
  if (plano?.tipo === 'rosto' && plano.x != null) foco = plano.x;
  const dur = Number.isFinite(c.seqDuracao) ? c.seqDuracao : durationInFrames;
  const z = zoom[0] + (zoom[1] - zoom[0]) * ease.suave(Math.min(1, Math.max(0, c.frame / Math.max(1, dur))));
  const video = (w: number, h: number, fx: number, fy: number, extra?: React.CSSProperties) => {
    // escala para cobrir a caixa w x h, com o ponto (fx, fy) da gravação no centro sempre que der
    const s = Math.max(w / ORIG_W, h / ORIG_H) * z;
    const vw = ORIG_W * s;
    const vh = ORIG_H * s;
    const left = Math.min(0, Math.max(w - vw, w / 2 - fx * vw));
    const top = Math.min(0, Math.max(h - vh, h / 2 - fy * vh));
    return (
      <OffthreadVideo src={staticFile(src)} startFrom={c.seqInicio} muted
        style={{ position: 'absolute', left, top, width: vw, height: vh, filter: `brightness(${brilho - escurece})`, ...extra }} />
    );
  };
  if (modo === 'retrato' && aberto) {
    // duas pessoas no quadro: recorta o vão entre os rostos (x0..x1) numa faixa larga sobre o quadro desfocado;
    // sem rostos achados, o quadro inteiro
    const x0 = plano?.x0 ?? 0;
    const x1 = plano?.x1 ?? 1;
    const vao = Math.min(1, Math.max(0.42, x1 - x0));
    const h = Math.min(H * 0.62, (W / vao) * (ORIG_H / ORIG_W));
    const top = yAberto ?? Math.round(Math.max(H * 0.06, H * 0.42 - h / 2));
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {video(W, H, 0.5, 0.5, { filter: `blur(28px) brightness(${0.55 - escurece})`, transform: 'scale(1.1)' })}
        <div style={{ position: 'absolute', left: 0, top, width: W, height: h, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>{video(W, h, (x0 + x1) / 2, 0.45)}</div>
      </AbsoluteFill>
    );
  }
  if (modo === 'retrato') {
    return <AbsoluteFill style={{ overflow: 'hidden' }}>{video(W, H, foco, focoY)}</AbsoluteFill>;
  }
  if (modo === 'faixa') {
    const h = (W * ORIG_H) / ORIG_W;
    return <div style={{ position: 'absolute', left: 0, top: y, width: W, height: h, overflow: 'hidden' }}>{video(W, h, 0.5, 0.5)}</div>;
  }
  let b = caixa ?? { x: 60, y: 220, w: W - 120, h: 860 };
  let fx = foco;
  if (aberto) {
    // duas pessoas: o cartão mostra o vão inteiro entre os rostos (não o meio vazio da mesa); a altura acompanha
    const x0 = plano?.x0 ?? 0;
    const x1 = plano?.x1 ?? 1;
    const vao = Math.min(1, Math.max(0.42, x1 - x0));
    const h = Math.min(b.h, Math.round((b.w / vao) * (ORIG_H / ORIG_W)));
    b = { ...b, y: b.y + Math.round((b.h - h) / 2), h };
    fx = (x0 + x1) / 2;
  }
  return (
    <div style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, overflow: 'hidden', borderRadius: 32,
      border: `3px solid rgba(${RGB.acento},.85)`, boxShadow: `0 0 60px rgba(${RGB.acento},.35), 0 40px 90px rgba(0,0,0,.6)` }}>
      {video(b.w, b.h, fx, focoY)}
    </div>
  );
};

/** Degradê escuro sobre a gravação, para o texto ler (de baixo, de cima ou dos dois lados). */
export const Veu: React.FC<{ de?: 'baixo' | 'cima' | 'ambos'; forca?: number }> = ({ de = 'baixo', forca = 0.85 }) => {
  const g = (dir: string) => `linear-gradient(${dir}, rgba(${RGB.fundo},${forca}) 0%, rgba(${RGB.fundo},${forca * 0.6}) 22%, rgba(${RGB.fundo},0) 48%)`;
  const fundos = de === 'ambos' ? [g('to top'), g('to bottom')] : [g(de === 'baixo' ? 'to top' : 'to bottom')];
  return <AbsoluteFill style={{ background: fundos.join(','), pointerEvents: 'none' }} />;
};
