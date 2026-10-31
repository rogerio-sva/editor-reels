import React from 'react';
import type {Marca} from '../marca';

/** Figurinha de caixinha de pergunta, no desenho da do Instagram. */
export const Caixinha: React.FC<{rotulo: string; pergunta: string; marca: Marca; largura?: number}> = ({rotulo, pergunta, marca, largura = 760}) => (
  <div style={{width: largura, borderRadius: 26, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,.45)', fontFamily: marca.fontes.corpo}}>
    <div style={{background: '#262626', color: '#FFFFFF', fontSize: 30, fontWeight: 600, textAlign: 'center', padding: '18px 24px'}}>{rotulo}</div>
    <div style={{background: '#FFFFFF', color: '#111111', fontSize: 40, fontWeight: 500, lineHeight: 1.25, textAlign: 'center', padding: '28px 34px 32px'}}>{pergunta}</div>
  </div>
);
