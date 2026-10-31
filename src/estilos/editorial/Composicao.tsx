/* Registro de um vídeo editorial: <ComposicaoEditorial id="Meu-Reel" roteiro={...} tempos={...} /> no Root.
   A duração sai da agenda (fim da fala + 0,8 s, ou "duracao" no roteiro). */
import React from 'react';
import { AbsoluteFill, Composition, getStaticFiles } from 'remotion';
import { agendaEditorial, type RoteiroEditorial } from '../agenda.mjs';
import type { TemposJson } from '../../tempos';
import { FontesEstilos, FE } from '../comum/FontesEstilos';
import { Editorial } from './Editorial';

const existe = (arq?: string | null) => !arq || getStaticFiles().some((f) => f.name === arq);
// (vídeo vazio "" = fundo neutro, usado pelo catálogo quando não há vídeo de exemplo)

const Falta: React.FC<{ arquivos: string[] }> = ({ arquivos }) => (
  <AbsoluteFill style={{ background: '#1E3A2A', color: '#F2EAD8', fontFamily: FE.serif, fontSize: 64, padding: 100, justifyContent: 'center', textAlign: 'center' }}>
    Falta o vídeo em public/:<br />
    <span style={{ fontFamily: FE.mono, fontSize: 34 }}>{arquivos.join(', ')}</span>
    <span style={{ fontSize: 40, marginTop: 30 }}>Rode scripts/preparar-video.mjs (ver ESTILO.md do editorial).</span>
  </AbsoluteFill>
);

export const ComposicaoEditorial: React.FC<{ id: string; roteiro: RoteiroEditorial; tempos: TemposJson; largura?: number; altura?: number }> = ({
  id, roteiro, tempos, largura = 1080, altura = 1920,
}) => {
  const ag = agendaEditorial(roteiro, tempos);
  const faltam = [roteiro.video, roteiro.recorte, roteiro.audio, roteiro.trilha].filter((a): a is string => Boolean(a) && !existe(a));
  // sem trilha ou sem recorte, o vídeo sai do mesmo jeito (sem trilha / título na frente)
  const graves = faltam.filter((a) => a === roteiro.video || a === roteiro.audio);
  const r: RoteiroEditorial = {
    ...roteiro,
    recorte: roteiro.recorte && existe(roteiro.recorte) ? roteiro.recorte : null,
    trilha: roteiro.trilha && existe(roteiro.trilha) ? roteiro.trilha : undefined,
  };
  const Comp: React.FC = () => <FontesEstilos>{graves.length ? <Falta arquivos={graves} /> : <Editorial roteiro={r} tempos={tempos} />}</FontesEstilos>;
  return <Composition id={id} component={Comp} durationInFrames={Math.ceil(ag.dur * 30)} fps={30} width={largura} height={altura} />;
};
