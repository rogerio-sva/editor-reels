/* Fita diagonal . T 14, k 7.
   Duas faixas largas inclinadas (amarelo marca-texto e azul-marinho) atravessam a tela de baixo-esquerda para
   cima-direita; no quadro k elas cobrem tudo e a cena troca por baixo; depois saem pelo outro lado. */
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions';
import { quadroDaJanela, type ComJanela } from '../base/transicao';
import { clamp01, ease } from '../tema';

export type PropsFita = ComJanela<{ cores?: [string, string]; angulo?: number }>;

export const FitaApresentacao: React.FC<TransitionPresentationComponentProps<PropsFita>> = ({ children, presentationDirection, presentationProgress, passedProps: p }) => {
  const { width: W, height: H } = useVideoConfig();
  const q = quadroDaJanela(presentationProgress, p.T);
  const saindo = presentationDirection === 'exiting';
  if (saindo) return <AbsoluteFill style={{ visibility: q >= p.k ? 'hidden' : 'visible' }}>{children}</AbsoluteFill>;
  const [c1, c2] = p.cores ?? ['#FFE066', '#13213A'];
  const ang = p.angulo ?? -24;
  const diag = Math.hypot(W, H);
  // posição da fita ao longo do caminho: entra (0 → 0,5 no quadro k) e sai (0,5 → 1)
  const t = q < p.k ? 0.5 * ease.sai(clamp01(q / p.k)) : 0.5 + 0.5 * ease.entra(clamp01((q - p.k) / (p.T - p.k)));
  const desloc = (t - 0.5) * diag * 2.2;
  const faixa = (cor: string, atraso: number, alt: number) => (
    <div style={{ position: 'absolute', left: W / 2 - diag, top: H / 2 - alt / 2, width: diag * 2, height: alt, background: cor,
      transform: `rotate(${ang}deg) translateY(${-desloc - atraso}px)`, boxShadow: '0 0 60px rgba(0,0,0,.35)' }} />
  );
  return (
    <>
      <AbsoluteFill style={{ visibility: q < p.k ? 'hidden' : 'visible' }}>{children}</AbsoluteFill>
      {q < p.T ? (
        <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
          {faixa(c2, 340, diag * 0.75)}
          {faixa(c1, 0, diag * 0.55)}
        </AbsoluteFill>
      ) : null}
    </>
  );
};

export const fita = (props: PropsFita): TransitionPresentation<PropsFita> => ({ component: FitaApresentacao, props });
