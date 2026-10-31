import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import {montarCenas, type Palavra} from '../tempo';
import {Cena, type CenaDados} from '../componentes/Cena';
import {Legenda} from '../componentes/Legenda';
import {usarFontes} from '../usarFontes';

export type RoteiroTelaDividida = {formato: 'tela-dividida'; video: string; duracao: number;
  palavras: Palavra[]; filmagem: 'baixo' | 'cima'; cenas: CenaDados[]};

const METADE = 960;

// Filmagem em tela cheia na metade dela, com o áudio original; motion na outra metade, trocando na palavra.
export const TelaDividida: React.FC<RoteiroTelaDividida & {marca: Marca}> = (p) => {
  usarFontes(p.marca);
  const {fps} = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const cenas = montarCenas(p.palavras, p.cenas, p.duracao);
  const topoFilmagem = p.filmagem === 'baixo' ? METADE : 0;
  const topoMotion = p.filmagem === 'baixo' ? 0 : METADE;
  return (
    <AbsoluteFill style={{backgroundColor: p.marca.cores.fundo}}>
      <div style={{position: 'absolute', top: topoFilmagem, width: 1080, height: METADE, overflow: 'hidden'}}>
        <OffthreadVideo src={staticFile(p.video)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
      <div style={{position: 'absolute', top: topoMotion, width: 1080, height: METADE, overflow: 'hidden'}}>
        {cenas.map((c, i) => (
          <Sequence key={i} from={Math.round(c.de * fps)} durationInFrames={Math.max(1, Math.round((c.ate - c.de) * fps))} layout="none">
            <Cena cena={c} marca={p.marca} largura={1080} altura={METADE} />
          </Sequence>
        ))}
      </div>
      <Legenda palavras={p.palavras} t={t} marca={p.marca} y={METADE - 60} />
    </AbsoluteFill>
  );
};
