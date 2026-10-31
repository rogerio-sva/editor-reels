import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Marca} from '../marca';
import {Cena, type CenaDados} from '../componentes/Cena';
import {Legenda} from '../componentes/Legenda';
import {usarFontes} from '../usarFontes';

// Mostruário dos componentes, usado no teste e para conferir uma marca nova no estúdio.
const CENAS: CenaDados[] = [
  {ancora: '', tipo: 'titulo', texto: 'Seu vídeo, sua marca'},
  {ancora: '', tipo: 'numero', valor: '10%', texto: 'do que você paga'},
  {ancora: '', tipo: 'lista', itens: ['Roteiro', 'Narração']},
  {ancora: '', tipo: 'icone', icone: 'cerebro', texto: 'Segundo cérebro'},
];

export const TesteComponentes: React.FC<{marca: Marca}> = ({marca}) => {
  usarFontes(marca);
  return (
    <AbsoluteFill style={{backgroundColor: marca.cores.fundo}}>
      {CENAS.map((c, i) => (
        <div key={i} style={{position: 'absolute', top: i * 400, height: 400, width: 1080}}>
          <Cena cena={c} marca={marca} largura={1080} altura={400} />
        </div>
      ))}
      <Legenda marca={marca} t={0.3} y={1700}
        palavras={[{text: 'Legenda', start: 0, end: 0.2}, {text: 'sem', start: 0.2, end: 0.4}, {text: 'caixa', start: 0.4, end: 0.6}]} />
    </AbsoluteFill>
  );
};
