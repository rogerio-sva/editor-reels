import React from 'react';
import {Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Marca} from '../marca';

export const MONO = 'JetBrains Mono';

export type DadosPainel =
  | {tipo: 'imagem'; imagem: string; rotulo?: string}
  | {tipo: 'imagens'; imagens: string[]; rotulo?: string}
  | {tipo: 'logos'; logos: {src: string; nome: string}[]; rotulo?: string}
  | {tipo: 'numero'; valor: string; texto?: string; rotulo?: string}
  | {tipo: 'titulo'; texto: string; destaque?: string; rotulo?: string}
  | {tipo: 'lista'; itens: string[]; rotulo?: string}
  | {tipo: 'chat'; cabecalho: string; mensagens: {de: 'eu' | 'ia'; texto: string}[]}
  | {tipo: 'arquivos'; pasta: string; itens: string[]}
  | {tipo: 'terminal'; linhas: string[]; rotulo?: string};

/** Cartão de motion no terço de cima, acima da cabeça: entra com mola e troca a cada frase-âncora. */
export const Painel: React.FC<{dados: DadosPainel; marca: Marca}> = ({dados, marca}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = marca.cores;
  const e = spring({frame: f, fps, config: {damping: 16, stiffness: 190}});
  const item = (i: number) => spring({frame: f - 4 - i * 5, fps, config: {damping: 18, stiffness: 170}});
  const verde = c.destaque;

  const cartao: React.CSSProperties = {
    width: 960, boxSizing: 'border-box', borderRadius: 30, padding: '34px 40px',
    background: 'rgba(8,14,11,0.93)', border: `2px solid ${verde}55`,
    boxShadow: `0 0 70px ${verde}22, 0 24px 60px rgba(0,0,0,.55)`,
    color: c.texto, fontFamily: marca.fontes.corpo,
    opacity: e, transform: `translateY(${(1 - e) * 36}px) scale(${0.96 + e * 0.04})`,
  };
  const rotulo = (texto?: string) => texto ? (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, fontFamily: MONO, fontSize: 26,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: c.suave}}>
      <div style={{width: 12, height: 12, borderRadius: 6, background: verde, boxShadow: `0 0 12px ${verde}`}} />{texto}
    </div>
  ) : null;

  switch (dados.tipo) {
    case 'imagem':
      return (
        <div style={cartao}>
          {rotulo(dados.rotulo)}
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Img src={staticFile(dados.imagem)} style={{maxWidth: '100%', maxHeight: 440, borderRadius: 18, objectFit: 'contain'}} />
          </div>
        </div>
      );
    case 'imagens':
      return (
        <div style={cartao}>
          {rotulo(dados.rotulo)}
          <div style={{display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center'}}>
            {dados.imagens.map((im, i) => (
              <Img key={i} src={staticFile(im)} style={{width: (880 - 24 * (dados.imagens.length - 1)) / dados.imagens.length,
                maxHeight: 420, objectFit: 'contain', borderRadius: 16, opacity: item(i), transform: `translateY(${(1 - item(i)) * 24}px)`}} />
            ))}
          </div>
        </div>
      );
    case 'logos':
      return (
        <div style={cartao}>
          {rotulo(dados.rotulo)}
          <div style={{display: 'flex', justifyContent: 'center', gap: 80}}>
            {dados.logos.map((l, i) => (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: item(i),
                transform: `scale(${0.8 + item(i) * 0.2})`}}>
                <div style={{width: 170, height: 170, borderRadius: 40, background: '#161B19', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '2px solid rgba(255,255,255,.08)'}}>
                  <Img src={staticFile(l.src)} style={{width: 100, height: 100}} />
                </div>
                <div style={{fontSize: 40, fontWeight: 700}}>{l.nome}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'numero':
      return (
        <div style={{...cartao, textAlign: 'center'}}>
          {rotulo(dados.rotulo)}
          <div style={{fontFamily: marca.fontes.titulo, fontWeight: 800, fontSize: 190, lineHeight: 1, color: verde,
            textShadow: `0 0 40px ${verde}66`}}>{dados.valor}</div>
          {dados.texto && <div style={{fontSize: 46, marginTop: 18, color: c.texto, opacity: item(0)}}>{dados.texto}</div>}
        </div>
      );
    case 'titulo': {
      const partes = dados.destaque ? dados.texto.split(dados.destaque) : [dados.texto];
      return (
        <div style={{...cartao, textAlign: 'center', padding: '44px 46px'}}>
          {rotulo(dados.rotulo)}
          <div style={{fontFamily: marca.fontes.titulo, fontWeight: 800, fontSize: 80, lineHeight: 1.08, letterSpacing: '-0.02em'}}>
            {partes[0]}
            {dados.destaque && <span style={{color: verde}}>{dados.destaque}</span>}
            {partes[1]}
          </div>
        </div>
      );
    }
    case 'lista':
      return (
        <div style={cartao}>
          {rotulo(dados.rotulo)}
          {dados.itens.map((it, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, fontSize: 50, fontWeight: 600, margin: '14px 0',
              opacity: item(i), transform: `translateX(${(1 - item(i)) * 40}px)`}}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={verde} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>{it}
            </div>
          ))}
        </div>
      );
    case 'chat':
      return (
        <div style={cartao}>
          {rotulo(dados.cabecalho)}
          {dados.mensagens.map((m, i) => (
            <div key={i} style={{display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start', margin: '12px 0',
              opacity: item(i * 2), transform: `translateY(${(1 - item(i * 2)) * 20}px)`}}>
              <div style={{maxWidth: 720, fontSize: 40, lineHeight: 1.3, padding: '18px 26px', borderRadius: 26,
                background: m.de === 'eu' ? '#2A2F2C' : `${verde}1F`, border: m.de === 'ia' ? `1.5px solid ${verde}55` : 'none'}}>{m.texto}</div>
            </div>
          ))}
        </div>
      );
    case 'arquivos':
      return (
        <div style={{...cartao, fontFamily: MONO}}>
          <div style={{fontSize: 34, color: c.suave, marginBottom: 18}}>▾ {dados.pasta}</div>
          {dados.itens.map((it, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, margin: '10px 0 10px 24px',
              opacity: item(i), color: c.texto}}>
              <span style={{color: verde}}>✓</span>{it}
            </div>
          ))}
        </div>
      );
    case 'terminal':
      return (
        <div style={{...cartao, fontFamily: MONO}}>
          {rotulo(dados.rotulo)}
          {dados.linhas.map((l, i) => (
            <div key={i} style={{fontSize: 38, margin: '10px 0', opacity: item(i * 2), color: l.startsWith('>') ? verde : c.texto}}>{l}</div>
          ))}
        </div>
      );
  }
};
