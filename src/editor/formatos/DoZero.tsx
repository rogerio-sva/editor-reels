import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import {montarCenas, type Palavra} from '../tempo';
import {Cena, type CenaDados} from '../componentes/Cena';
import {Legenda} from '../componentes/Legenda';
import {usarFontes} from '../usarFontes';

// audio, duracao e palavras são escritos pelo scripts/editor/narrar.mjs depois do roteiro aprovado.
export type RoteiroDoZero = {formato: 'do-zero'; narracao: {blocos: {id: string; texto: string}[]; velocidade?: number};
  audio: string; duracao: number; palavras: Palavra[]; cenas: CenaDados[]};

export const DoZero: React.FC<RoteiroDoZero & {marca: Marca}> = (p) => {
  usarFontes(p.marca);
  const {fps} = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const cenas = montarCenas(p.palavras, p.cenas, p.duracao);
  return (
    <AbsoluteFill style={{backgroundColor: p.marca.cores.fundo}}>
      {cenas.map((c, i) => (
        <Sequence key={i} from={Math.round(c.de * fps)} durationInFrames={Math.max(1, Math.round((c.ate - c.de) * fps))}>
          <Cena cena={c} marca={p.marca} largura={1080} altura={1920} />
        </Sequence>
      ))}
      <Audio src={staticFile(p.audio)} />
      <Legenda palavras={p.palavras} t={t} marca={p.marca} y={1500} />
    </AbsoluteFill>
  );
};
