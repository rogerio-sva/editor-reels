import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {Marca} from '../marca';
import type {Oferta} from '../fala';

/** Cartão final de oferta na identidade da marca: produto, título, preço, chamada e setas. */
export const CartaoOferta: React.FC<{oferta: Oferta; marca: Marca}> = ({oferta, marca}) => {
  const f = useCurrentFrame();
  const seta = interpolate(f % 30, [0, 15, 30], [0, 14, 0]);
  const c = marca.cores;
  return (
    <AbsoluteFill style={{background: `radial-gradient(900px 700px at 50% 38%, ${c.destaque}33, transparent 70%), ${c.fundo}`,
      alignItems: 'center', justifyContent: 'center', fontFamily: marca.fontes.corpo, color: c.texto}}>
      <div style={{width: 900, borderRadius: 36, border: `2px solid ${c.destaque}66`, background: '#0B120E',
        boxShadow: `0 0 80px ${c.destaque}33`, padding: '56px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        {oferta.imagem && <Img src={staticFile(oferta.imagem)} style={{width: '100%', borderRadius: 20}} />}
        <div style={{fontFamily: marca.fontes.titulo, fontWeight: 800, fontSize: 64, lineHeight: 1.05, textAlign: 'center',
          textTransform: 'uppercase', color: c.destaque}}>{oferta.titulo}</div>
        <div style={{fontSize: 34, color: c.suave}}>por apenas</div>
        <div style={{fontFamily: marca.fontes.titulo, fontWeight: 800, fontSize: 110, lineHeight: 1, marginTop: -20}}>{oferta.preco}</div>
        {oferta.detalhe && <div style={{fontSize: 36, color: c.suave, textAlign: 'center'}}>{oferta.detalhe}</div>}
        <div style={{border: `3px solid ${c.texto}`, borderRadius: 999, padding: '18px 48px', fontWeight: 800, fontSize: 38,
          letterSpacing: '0.04em', textTransform: 'uppercase'}}>{oferta.cta ?? 'clique em saiba mais'}</div>
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke={c.destaque} strokeWidth="2.4" strokeLinecap="round"
          strokeLinejoin="round" style={{transform: `translateY(${seta}px)`}}>
          <path d="M6 5l6 6 6-6M6 12l6 6 6-6" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
