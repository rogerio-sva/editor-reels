import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import type {Palavra} from '../tempo';
import {paraTempoOriginal, type Trecho} from '../timeline';
import {Legenda} from '../componentes/Legenda';
import {usarFontes} from '../usarFontes';

// zooms: tempos na timeline final (depois do corte), decididos no roteiro aprovado.
export type RoteiroReel = {formato: 'reel'; video: string; trechos: Trecho[]; palavras: Palavra[];
  zooms: {de: number; ate: number}[]};

export const Reel: React.FC<RoteiroReel & {marca: Marca}> = (p) => {
  usarFontes(p.marca);
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  let cursor = 0;
  const blocos = p.trechos.map((tr) => {
    const dur = Math.max(1, Math.round((tr.fim - tr.inicio) * fps));
    const b = {...tr, de: cursor, dur};
    cursor += dur;
    return b;
  });
  const z = p.zooms.find((x) => t >= x.de && t <= x.ate);
  const escala = z ? interpolate(t, [z.de, z.de + 0.25], [1, 1.12], {extrapolateRight: 'clamp'}) : 1;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${escala})`}}>
        {blocos.map((b, i) => (
          <Sequence key={i} from={b.de} durationInFrames={b.dur}>
            <OffthreadVideo src={staticFile(p.video)} trimBefore={Math.round(b.inicio * fps)}
              trimAfter={Math.round(b.fim * fps)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <Legenda palavras={p.palavras} t={paraTempoOriginal(p.trechos, t)} marca={p.marca} y={1380} />
    </AbsoluteFill>
  );
};
