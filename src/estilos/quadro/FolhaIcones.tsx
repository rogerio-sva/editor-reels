/* Folha com todos os ícones do estilo quadro (nome embaixo), para escolher: Quadro-Icones.
   node scripts/stills.mjs Quadro-Icones out/stills 0.5 0 */
import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { FontesEstilos, FE } from '../comum/FontesEstilos';
import { ICONES } from './icones';
import { CORES_QUADRO, INCLINA } from './Quadro';

const Folha: React.FC = () => {
  const nomes = Object.keys(ICONES);
  const cols = 7, cw = 1080 / cols, ch = 1920 / Math.ceil(nomes.length / cols);
  return (
    <AbsoluteFill style={{ background: CORES_QUADRO.papel }}>
      <svg width={1080} height={1920}>
        {nomes.map((n, i) => {
          const x = (i % cols) * cw + cw / 2, y = Math.floor(i / cols) * ch + ch / 2 - 14;
          const s = 64 / 24;
          return (
            <g key={n}>
              <g transform={`translate(${x - 32} ${y - 40}) scale(${s})`}>
                {ICONES[n].map((d, k) => <path key={k} d={d} fill="none" stroke={CORES_QUADRO.tinta} strokeWidth={3 / s} strokeLinecap="round" strokeLinejoin="round" />)}
              </g>
              <text x={x} y={y + 52} textAnchor="middle" fontFamily={FE.quadro} fontWeight={300} fontSize={26} fill={CORES_QUADRO.tinta}
                transform={`translate(${x} ${y + 52}) skewX(${INCLINA}) translate(${-x} ${-(y + 52)})`}>{n.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
export const ComposicaoQuadroIcones: React.FC = () => (
  <Composition id="Quadro-Icones" component={() => <FontesEstilos><Folha /></FontesEstilos>} durationInFrames={1} fps={30} width={1080} height={1920} />
);
