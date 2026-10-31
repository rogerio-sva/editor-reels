/* =====================================================================================
   biblioteca/EditorialPartitura.tsx: o estilo EDITORIAL da Skill Motion v2 com roteiro por props. O script de render prepara o vídeo
   vertical, o recorte da pessoa e a trilha, o Claude escreve os blocos, e o render chama:
     npx remotion render src/index.ts EditorialPartitura saida.mp4 --props=arquivo.json
   props = { roteiro: RoteiroEditorial, tempos: TemposJson }. Duração = a da agenda (fim da fala + respiro).
   ===================================================================================== */
import React from 'react';
import { Composition, type CalculateMetadataFunction } from 'remotion';
import { agendaEditorial, type RoteiroEditorial } from '../estilos/agenda.mjs';
import { FontesEstilos } from '../estilos/comum/FontesEstilos';
import { Editorial } from '../estilos/editorial/Editorial';
import type { TemposJson } from '../tempos';
import ROTEIRO from '../videos/editorial-exemplo/roteiro.json';
import TEMPOS from '../videos/editorial-exemplo/tempos.json';

type Props = { roteiro: RoteiroEditorial; tempos: TemposJson };

const Comp: React.FC<Props> = ({ roteiro, tempos }) => (
  <FontesEstilos>
    <Editorial roteiro={roteiro} tempos={tempos} />
  </FontesEstilos>
);

const metadados: CalculateMetadataFunction<Props> = ({ props }) => ({
  durationInFrames: Math.ceil(agendaEditorial(props.roteiro, props.tempos).dur * 30),
});

export const ComposicaoEditorialPartitura: React.FC = () => (
  <Composition id="EditorialPartitura" component={Comp} calculateMetadata={metadados}
    defaultProps={{ roteiro: ROTEIRO as unknown as RoteiroEditorial, tempos: TEMPOS as TemposJson }}
    durationInFrames={300} fps={30} width={1080} height={1920} />
);
