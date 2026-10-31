import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import {inicioSlides, type RoteiroCarrossel} from '../timeline';

export type PropsCarrossel = RoteiroCarrossel & {marca: Marca};

const LARGURA = 864; // 80% da tela, medido no reel de referência
const BASE = 1700;   // borda de baixo dos slides; o terço de cima fica livre para a headline

// O take chega já cortado e acelerado pelo montar-carrossel (ffmpeg); aqui ele só toca.
export const Carrossel: React.FC<PropsCarrossel> = (p) => {
  const {fps} = useVideoConfig();
  const inicios = inicioSlides(p);
  const quadros = Math.round(p.porSlide * fps);
  return (
    <AbsoluteFill style={{backgroundColor: p.marca.cores.fundo}}>
      <OffthreadVideo src={staticFile(p.take)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      {p.slides.map((s, i) => {
        const ehVideo = /\.(mp4|mov|webm)$/i.test(s);
        const estilo: React.CSSProperties = {
          position: 'absolute', width: LARGURA, left: (1080 - LARGURA) / 2, bottom: 1920 - BASE,
          boxShadow: '0 24px 60px rgba(0,0,0,.45)',
        };
        return (
          <Sequence key={s} from={Math.round(inicios[i] * fps)} durationInFrames={quadros} layout="none">
            {ehVideo
              ? <OffthreadVideo src={staticFile(s)} muted style={estilo} />
              : <Img src={staticFile(s)} style={estilo} />}
            <Audio src={staticFile('troca.wav')} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
