/* Registro de um vídeo no estilo quadro: <ComposicaoQuadro id="Meu-Quadro" roteiro={...} tempos={...} /> no Root.
   A duração sai da agenda (fim da fala + 0,8 s, ou "duracao" no roteiro). Sem o vídeo do rosto em
   public/, a abertura com rosto é pulada; sem o áudio, sai mudo (para conferir o desenho). */
import React from 'react';
import { Composition, getStaticFiles } from 'remotion';
import { agendaQuadro, type RoteiroQuadro } from '../agenda.mjs';
import type { TemposJson } from '../../tempos';
import { FontesEstilos } from '../comum/FontesEstilos';
import { Quadro } from './Quadro';

const existe = (arq?: string) => Boolean(arq) && getStaticFiles().some((f) => f.name === arq);

export const ComposicaoQuadro: React.FC<{ id: string; roteiro: RoteiroQuadro; tempos: TemposJson; largura?: number; altura?: number }> = ({
  id, roteiro, tempos, largura = 1080, altura = 1920,
}) => {
  const r: RoteiroQuadro = {
    ...roteiro,
    rosto: roteiro.rosto && existe(roteiro.rosto.video) ? roteiro.rosto : undefined,
    audio: existe(roteiro.audio) ? roteiro.audio : undefined,
    trilha: existe(roteiro.trilha) ? roteiro.trilha : undefined,
  };
  const ag = agendaQuadro(r, tempos, { largura, altura });
  const Comp: React.FC = () => <FontesEstilos><Quadro roteiro={r} tempos={tempos} /></FontesEstilos>;
  return <Composition id={id} component={Comp} durationInFrames={Math.ceil(ag.dur * 30)} fps={30} width={largura} height={altura} />;
};
