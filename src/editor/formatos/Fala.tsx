import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import {ativo, clipesNaLinha, type Clipe, type RoteiroFala} from '../fala';
import {grupos} from '../tempo';
import {usarFontes} from '../usarFontes';
import {LegendaPalavra} from '../componentes/LegendaPalavra';
import {ProvaTopo} from '../componentes/ProvaTopo';
import {Flash} from '../componentes/Flash';
import {Caixinha} from '../componentes/Caixinha';
import {TituloGancho, SERIFA} from '../componentes/TituloGancho';
import {FaixaPincel} from '../componentes/FaixaPincel';
import {CartaoOferta} from '../componentes/CartaoOferta';
import {Painel, MONO, type DadosPainel} from '../componentes/Painel';

type Props = RoteiroFala & {marca: Marca};

/** Os clipes em sequência, cortes secos. `mostrar` filtra quais clipes este lugar da tela toca. */
const Clipes: React.FC<{clipes: Clipe[]; estilo?: React.CSSProperties; mostrar?: (i: number) => boolean}> = ({clipes, estilo, mostrar}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {clipesNaLinha(clipes).map((c, i) => (mostrar && !mostrar(i)) ? null : (
        <Sequence key={i} from={Math.round(c.inicio * fps)} durationInFrames={Math.max(1, Math.round((c.fim - c.inicio) * fps))} layout="none">
          <OffthreadVideo src={staticFile(c.video)} trimBefore={Math.round(c.de * fps)} trimAfter={Math.round(c.ate * fps)}
            style={{width: '100%', height: '100%', objectFit: 'cover', ...estilo}} />
        </Sequence>
      ))}
    </>
  );
};

export const Fala: React.FC<Props> = (p) => {
  usarFontes(p.marca, [...(p.titulo?.fonte === 'serifa' ? [SERIFA] : []), ...(p.paineis?.length ? [MONO] : [])]);
  const {fps} = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const fimFala = clipesNaLinha(p.clipes).at(-1)?.fim ?? 0;
  const pb = ativo(p.pb, t);
  // close em preto e branco: aproxima o rosto e tira a cor, só no vídeo da pessoa
  const efeito: React.CSSProperties = pb ? {filter: 'grayscale(1) contrast(1.12)', transform: 'scale(1.22)', transformOrigin: '50% 38%'} : {};
  const prova = p.provas.find((x) => t >= x.de && t < x.ate);
  const tituloVisivel = p.titulo && t >= p.titulo.de && t < p.titulo.ate;

  let cena: React.ReactNode;
  if (p.estilo === 'caixinha') {
    cena = (
      <AbsoluteFill style={{background: '#000'}}>
        <div style={{position: 'absolute', left: 80, top: 420, width: 920, height: 1320, borderRadius: 56, overflow: 'hidden'}}>
          <Clipes clipes={p.clipes} estilo={efeito} />
        </div>
        {p.caixinha && <div style={{position: 'absolute', top: 330, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <Caixinha rotulo={p.caixinha.rotulo} pergunta={p.caixinha.pergunta} marca={p.marca} />
        </div>}
        <LegendaPalavra palavras={p.palavras} t={t} marca={p.marca} y={1480} />
      </AbsoluteFill>
    );
  } else if (p.estilo === 'dividida') {
    const i = p.palavras.findIndex((w) => t >= w.start && t <= w.end + 0.08);
    const g = i >= 0 ? grupos(p.palavras, 0.34, 2).find((x) => x.includes(i))! : [];
    cena = (
      <AbsoluteFill style={{background: p.marca.cores.fundo}}>
        <div style={{position: 'absolute', top: 0, width: 1080, height: 960, overflow: 'hidden'}}>
          {prova && <Img src={staticFile(prova.imagem)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
        </div>
        <div style={{position: 'absolute', top: 960, width: 1080, height: 960, overflow: 'hidden'}}>
          <Clipes clipes={p.clipes} estilo={efeito} />
        </div>
        {g.length > 0 && <FaixaPincel texto={g.map((k) => p.palavras[k].text.replace(/[.,!?]$/, '')).join(' ')} marca={p.marca} y={960} />}
      </AbsoluteFill>
    );
  } else if (p.estilo === 'call' && p.call) {
    const falaDe = p.call.falaDe;
    const atual = clipesNaLinha(p.clipes).findIndex((c) => t >= c.inicio && t < c.fim);
    cena = (
      <AbsoluteFill style={{background: '#202124', fontFamily: p.marca.fontes.corpo}}>
        {p.call.participantes.map((pa, k) => {
          const falando = atual >= 0 && falaDe[atual] === k;
          return (
            <div key={k} style={{position: 'absolute', left: 60, top: 110 + k * 560, width: 960, height: 530, borderRadius: 22, overflow: 'hidden',
              background: '#3C4043', outline: falando ? '5px solid #8AB4F8' : 'none', outlineOffset: -5}}>
              <Img src={staticFile(pa.foto)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}} />
              <Clipes clipes={p.clipes} mostrar={(i) => falaDe[i] === k} />
              <div style={{position: 'absolute', left: 24, bottom: 20, color: '#FFF', fontSize: 34, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,.8)'}}>{pa.nome}</div>
              <div style={{position: 'absolute', right: 20, top: 20, width: 52, height: 52, borderRadius: 26, background: falando ? '#8AB4F8' : 'rgba(0,0,0,.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5}}>
                {[14, 24, 14].map((h, j) => <div key={j} style={{width: 6, height: falando ? h + ((Math.floor(t * 8) + j) % 3) * 4 : 6, borderRadius: 3, background: '#FFF'}} />)}
              </div>
            </div>
          );
        })}
        <div style={{position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 26}}>
          {['#5F6368', '#5F6368', '#8AB4F8', '#5F6368', '#5F6368', '#EA4335'].map((cor, j) => (
            <div key={j} style={{width: j === 5 ? 110 : 76, height: 76, borderRadius: 38, background: cor}} />
          ))}
        </div>
      </AbsoluteFill>
    );
  } else {
    cena = (
      <AbsoluteFill style={{background: '#000'}}>
        <Clipes clipes={p.clipes} estilo={efeito} />
        {prova && <ProvaTopo imagem={prova.imagem} />}
        {(p.paineis ?? []).map((pn, i) => (
          <Sequence key={i} from={Math.round(pn.de * fps)} durationInFrames={Math.max(1, Math.round((pn.ate - pn.de) * fps))} layout="none">
            <div style={{position: 'absolute', top: 70, left: 60}}>
              <Painel dados={pn.dados as unknown as DadosPainel} marca={p.marca} />
            </div>
          </Sequence>
        ))}
        <LegendaPalavra palavras={p.palavras} t={t} marca={p.marca} y={1190} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {t < fimFala && cena}
      {tituloVisivel && <TituloGancho texto={p.titulo!.texto} fonte={p.titulo!.fonte} marca={p.marca} topo={p.estilo === 'caixinha' ? 140 : 150} />}
      {p.flashes.map((f, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(f * fps) - 1)} durationInFrames={10}><Flash /></Sequence>
      ))}
      {p.oferta && (
        <Sequence from={Math.round(fimFala * fps)} durationInFrames={Math.round(p.oferta.duracao * fps)}>
          <CartaoOferta oferta={p.oferta} marca={p.marca} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
