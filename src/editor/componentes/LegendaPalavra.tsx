import React from 'react';
import type {Marca} from '../marca';
import {grupos, type Palavra} from '../tempo';

/** Uma ou duas palavras por vez, brancas, discretas, na altura do peito. Sem caixa: sombra macia. */
export const LegendaPalavra: React.FC<{palavras: Palavra[]; t: number; marca: Marca; y: number; tamanho?: number}> =
  ({palavras, t, marca, y, tamanho = 60}) => {
    const i = palavras.findIndex((p) => t >= p.start && t <= p.end + 0.08);
    if (i < 0) return null;
    const g = grupos(palavras, 0.34, 2).find((x) => x.includes(i))!;
    return (
      <div style={{position: 'absolute', left: 80, right: 80, top: y, textAlign: 'center', color: '#FFFFFF',
        fontFamily: marca.fontes.corpo, fontWeight: 700, fontSize: tamanho, lineHeight: 1.1, letterSpacing: '-0.01em',
        textShadow: '0 2px 10px rgba(0,0,0,.75), 0 0 2px rgba(0,0,0,.9)'}}>
        {g.map((k) => palavras[k].text.replace(/[.,!?]$/, '')).join(' ')}
      </div>
    );
  };
