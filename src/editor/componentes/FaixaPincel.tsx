import React from 'react';
import type {Marca} from '../marca';

/** Faixa de pincel na junção da tela dividida, com a palavra da vez. Texto escuro: contraste acima de 4,5:1 no verde. */
export const FaixaPincel: React.FC<{texto: string; marca: Marca; y: number}> = ({texto, marca, y}) => (
  <div style={{position: 'absolute', top: y - 70, left: 0, right: 0, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <svg viewBox="0 0 1000 140" preserveAspectRatio="none" style={{position: 'absolute', left: 150, width: 780, height: 140}}>
      <path fill={marca.cores.destaque} d="M18 34 L60 22 L140 30 L230 18 L330 28 L420 16 L520 26 L610 14 L700 24 L790 16 L880 26 L960 20 L988 44 L976 70 L992 98 L950 118 L860 110 L770 124 L680 112 L590 126 L500 114 L410 124 L320 112 L230 122 L140 110 L60 120 L14 104 L26 78 L8 54 Z" />
    </svg>
    <div style={{position: 'relative', fontFamily: marca.fontes.titulo, fontWeight: 800, fontSize: 60, color: marca.cores.fundo,
      textTransform: 'uppercase', letterSpacing: '0.01em'}}>{texto}</div>
  </div>
);
