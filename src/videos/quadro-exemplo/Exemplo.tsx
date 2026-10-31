/* Exemplo do estilo quadro (~13 s, vertical). Áudio e rosto em public/quadro-exemplo/ (não vêm no
   pacote; sem eles o quadro sai mudo e sem a abertura). Modelo para vídeo novo: copie esta pasta. */
import React from 'react';
import { ComposicaoQuadro } from '../../estilos/quadro/Composicao';
import type { RoteiroQuadro } from '../../estilos/agenda.mjs';
import type { TemposJson } from '../../tempos';
import ROTEIRO from './roteiro.json';
import TEMPOS from './tempos.json';

export const ComposicaoQuadroExemplo: React.FC = () => (
  <ComposicaoQuadro id="Quadro-Exemplo" roteiro={ROTEIRO as unknown as RoteiroQuadro} tempos={TEMPOS as TemposJson} />
);
