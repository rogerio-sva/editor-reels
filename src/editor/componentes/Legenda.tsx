import React from 'react';
import type {Marca} from '../marca';
import {grupos, type Palavra} from '../tempo';

/** A palavra que está sendo dita fica na cor de destaque. Sem caixa atrás: contorno. */
export const Legenda: React.FC<{palavras: Palavra[]; t: number; marca: Marca; y: number}> = ({palavras, t, marca, y}) => {
  const i = palavras.findIndex((p) => t >= p.start && t <= p.end + 0.12);
  if (i < 0) return null;
  const grupo = grupos(palavras).find((g) => g.includes(i))!;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: y, textAlign: 'center',
      fontFamily: marca.fontes.titulo, fontSize: 78, fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase',
      WebkitTextStroke: '12px rgba(0,0,0,.85)', paintOrder: 'stroke fill'}}>
      {grupo.map((k, n) => (
        <span key={k} style={{color: k === i ? marca.cores.destaque : '#FFFFFF'}}>
          {palavras[k].text.replace(/[.,!?]$/, '')}{n < grupo.length - 1 ? ' ' : ''}
        </span>
      ))}
    </div>
  );
};
