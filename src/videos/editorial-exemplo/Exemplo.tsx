/* Exemplo do estilo editorial (13 s, vertical). Mídia em public/editorial-exemplo/ (não vem no pacote:
   gere com scripts/preparar-video.mjs a partir do seu vídeo). Modelo para vídeo novo: copie esta pasta. */
import React from 'react';
import { ComposicaoEditorial } from '../../estilos/editorial/Composicao';
import type { RoteiroEditorial } from '../../estilos/agenda.mjs';
import type { TemposJson } from '../../tempos';
import ROTEIRO from './roteiro.json';
import TEMPOS from './tempos.json';

export const ComposicaoEditorialExemplo: React.FC = () => (
  <ComposicaoEditorial id="Editorial-Exemplo" roteiro={ROTEIRO as unknown as RoteiroEditorial} tempos={TEMPOS as TemposJson} />
);
