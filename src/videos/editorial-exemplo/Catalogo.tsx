/* Catálogo do estilo editorial: os 18 blocos, um a cada 1,7 s, sobre o vídeo do exemplo (ou um fundo
   neutro se o vídeo não estiver em public/). Serve para ver todos de uma vez:
   node scripts/prancha.mjs Editorial-Catalogo out/catalogo-editorial.jpg --roteiro=... (ou --quadros) */
import React from 'react';
import { getStaticFiles } from 'remotion';
import { ComposicaoEditorial } from '../../estilos/editorial/Composicao';
import type { RoteiroEditorial } from '../../estilos/agenda.mjs';
import type { TemposJson } from '../../tempos';

const P = 1.7;
const texto = 'e a legenda entra como roteiro de filme'.split(' ');
// fala de mentira: só para o bloco de roteiro de filme ter palavras com tempo
const palavras = texto.map((t, i) => ({ t, s: 11.95 + i * 0.16, e: 11.95 + i * 0.16 + 0.14 }));
const TEMPOS: TemposJson = { fps: 30, fim_fala_s: 30.6, cenas: [{ cena: 1, inicio_s: 0, fim_s: 30.6, inicio_f: 0, dur_f: 918 }], palavras };
const b = (k: number, tipo: string, extra: Record<string, unknown> = {}) => ({ tipo, em: k * P + 0.05, ate: (k + 1) * P - 0.05, ...extra });
const mini = Array.from({ length: 8 }, (_, i) => `editorial-exemplo/mini/0${i + 1}.jpg`);

export const ComposicaoEditorialCatalogo: React.FC = () => {
  const temVideo = getStaticFiles().some((f) => f.name === 'editorial-exemplo/base.mp4');
  const roteiro = {
    estilo: 'editorial',
    video: temVideo ? 'editorial-exemplo/base.mp4' : '',
    recorte: 'editorial-exemplo/recorte.webm',
    ajusteVideo: 'brightness(1.3) contrast(1.04)',
    miniaturas: temVideo ? mini : [],
    legenda: false,
    duracao: 18 * P,
    blocos: [
      b(0, 'titulo-atras', { linhas: ['TÍTULO', 'ATRÁS'] }),
      b(1, 'manchete', { texto: 'manchete com *itálico.*' }),
      { ...b(2, 'cupom', { texto: 'Deixa mais sombrio.', numero: 2 }) },
      b(3, 'apps', { riscar: [{ app: 'CapCut', em: 3 * P + 0.45 }, { app: 'Edits', em: 3 * P + 0.75 }], fim: { texto: 'nada.', em: 3 * P + 1.15 } }),
      b(4, 'miniaturas', { modo: 'atras' }),
      b(5, 'miniaturas', { modo: 'calendario', titulo: 'DESSE AQUI' }),
      b(6, 'celular'),
      { tipo: 'roteiro-filme', em: 11.9, ate: 13.55 },
      { tipo: 'grade', em: 8 * P, ate: 9 * P - 0.05, modo: 'sombrio' },
      b(8, 'paleta', { modo: 'sombrio' }),
      { tipo: 'whip', em: 9 * P + 0.1 },
      b(10, 'comentario', { texto: 'EDITAR' }),
      b(11, 'palavra-imagem', { linhas: ['EN', 'OR', 'ME'], tam: 470 }),
      b(12, 'pelicula'),
      b(13, 'minutos-depois'),
      b(14, 'teclas'),
      b(15, 'pilula', { texto: 'uma *frase.*' }),
      { tipo: 'grade', em: 16 * P, ate: 17 * P - 0.05, modo: 'pb' },
      b(16, 'circulo', { x: 560, y: 840, r: 200 }),
      { tipo: 'grade', em: 17 * P, modo: 'cinema', pelicula: true },
      b(17, 'faixa-cta'),
    ],
  } as unknown as RoteiroEditorial;
  return <ComposicaoEditorial id="Editorial-Catalogo" roteiro={roteiro} tempos={TEMPOS} />;
};
