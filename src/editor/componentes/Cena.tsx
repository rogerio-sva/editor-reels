import React from 'react';
import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';
import {Icone, type NomeIcone} from './Icone';

export type TipoCena = 'titulo' | 'lista' | 'numero' | 'icone' | 'imagem';
export type CenaDados = {ancora: string; tipo: TipoCena; texto?: string; itens?: string[];
  valor?: string; icone?: NomeIcone; imagem?: string};

/** Uma cena por vez. Entra com mola curta; nada fica animando por cima do fim da frase. */
export const Cena: React.FC<{cena: CenaDados; marca: Marca; largura: number; altura: number}> = ({cena, marca, largura, altura}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const e = spring({frame: f, fps, config: {damping: 18, stiffness: 180}});
  // Em tela cheia (1920) tudo cresce 1,5x; na metade da tela dividida (960) fica no tamanho base.
  const k = Math.min(1.5, Math.max(1, altura / 960));
  const base: React.CSSProperties = {width: largura, height: altura, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 36 * k, padding: 60 * k, boxSizing: 'border-box',
    background: marca.cores.fundo, color: marca.cores.texto, fontFamily: marca.fontes.corpo, overflow: 'hidden'};
  const entrada: React.CSSProperties = {opacity: e, transform: `translateY(${(1 - e) * 40}px)`};
  const titulo: React.CSSProperties = {fontFamily: marca.fontes.titulo, fontSize: 96 * k, fontWeight: 800,
    lineHeight: 1.05, textAlign: 'center', letterSpacing: '-0.02em'};
  switch (cena.tipo) {
    case 'titulo':
      return <div style={base}><div style={{...titulo, ...entrada}}>{cena.texto}</div></div>;
    case 'numero':
      return (
        <div style={base}>
          <div style={{...titulo, ...entrada, fontSize: 220 * k, color: marca.cores.destaque}}>{cena.valor}</div>
          {cena.texto && <div style={{...entrada, fontSize: 48 * k, color: marca.cores.suave, textAlign: 'center'}}>{cena.texto}</div>}
        </div>
      );
    case 'lista':
      return (
        <div style={{...base, alignItems: 'flex-start'}}>
          {cena.texto && <div style={{...titulo, ...entrada, fontSize: 72 * k, textAlign: 'left'}}>{cena.texto}</div>}
          {(cena.itens ?? []).map((it, i) => {
            const ei = spring({frame: f - i * 5, fps, config: {damping: 18}});
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24 * k, fontSize: 52 * k, opacity: ei,
                transform: `translateX(${(1 - ei) * 40}px)`}}>
                <Icone nome="check" cor={marca.cores.destaque} tamanho={56 * k} />{it}
              </div>
            );
          })}
        </div>
      );
    case 'icone':
      return (
        <div style={base}>
          <div style={entrada}><Icone nome={cena.icone ?? 'raio'} cor={marca.cores.destaque} tamanho={260 * k} /></div>
          {cena.texto && <div style={{...titulo, ...entrada, fontSize: 80 * k}}>{cena.texto}</div>}
        </div>
      );
    case 'imagem':
      return (
        <div style={{...base, padding: 0}}>
          <Img src={staticFile(cena.imagem ?? '')} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: e}} />
        </div>
      );
  }
};
