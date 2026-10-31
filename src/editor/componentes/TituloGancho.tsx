import React from 'react';
import type {Marca} from '../marca';

export const SERIFA = 'DM Serif Display';

/** Texto do gancho no topo: serifa grande ("DIA 1", frase de efeito) ou bold pequeno ("pov: ..."). */
export const TituloGancho: React.FC<{texto: string; fonte: 'serifa' | 'bold'; marca: Marca; topo?: number}> = ({texto, fonte, marca, topo = 150}) => (
  <div style={{position: 'absolute', top: topo, left: 70, right: 70, textAlign: 'center', color: '#FFFFFF', whiteSpace: 'pre-line',
    textShadow: '0 3px 14px rgba(0,0,0,.7)',
    ...(fonte === 'serifa'
      ? {fontFamily: SERIFA, fontSize: 92, lineHeight: 1.02}
      : {fontFamily: marca.fontes.corpo, fontWeight: 700, fontSize: 50, lineHeight: 1.2})}}>
    {texto}
  </div>
);
