/* Composição "Prancha": junta quadros numa folha só (aprovação antes do render e conferência depois).
   Usada por scripts/prancha.mjs, que passa as imagens como data URL; não precisa abrir à mão. */
import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';

type Props = { imagens: { src: string; rotulo: string }[]; colunas: number; w: number; h: number };
const ROT = 34;
const Folha: React.FC<Props> = ({ imagens, w, h }) => (
  <AbsoluteFill style={{ background: '#141414', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8, padding: 8 }}>
    {imagens.map((im, i) => (
      <div key={i} style={{ width: w }}>
        <div style={{ height: ROT, color: '#E6E67A', fontFamily: 'monospace', fontSize: 20, lineHeight: `${ROT}px` }}>{im.rotulo}</div>
        <img src={im.src} style={{ width: w, height: h, objectFit: 'cover', display: 'block' }} />
      </div>
    ))}
  </AbsoluteFill>
);

export const ComposicaoPrancha: React.FC = () => (
  <Composition
    id="Prancha"
    component={Folha}
    durationInFrames={1}
    fps={30}
    width={1080}
    height={1080}
    defaultProps={{ imagens: [], colunas: 6, w: 270, h: 480 } as Props}
    calculateMetadata={({ props }) => {
      const linhas = Math.max(1, Math.ceil(props.imagens.length / props.colunas));
      return { width: props.colunas * (props.w + 8) + 8, height: linhas * (props.h + ROT + 8) + 8 };
    }}
  />
);
