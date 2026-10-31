/* =====================================================================================
   biblioteca/tipos.ts: a PARTITURA de um vídeo "fala + motion".

   O script recorta a gravação do corte, transcreve e o Claude escreve a partitura: em que palavra
   começa cada cena, o tipo da cena e os parâmetros. A composição `Partitura` monta o vídeo sem código
   por vídeo. Índices de palavra são GLOBAIS (posição em `palavras`, a partir de 0).
   As cenas cobrem a fala inteira, em ordem: cenas[0].de = 0, cenas[i+1].de = cenas[i].ate + 1,
   última .ate = palavras.length - 1 (o validador do script garante).
   ===================================================================================== */
import type { Palavra } from '../tempos';

export type TipoCena = 'fala' | 'heroi' | 'slam' | 'contraste' | 'dividido' | 'numero' | 'lista' | 'citacao'
  // cenas de papel (modelos aula-capitulos e autos)
  | 'documento' | 'chips' | 'passos' | 'duelo';

export type CenaPart = {
  tipo: TipoCena;
  /** primeira e última palavra da cena (inclusive) */
  de: number;
  ate: number;
  /** transição de ENTRADA (ignorada na cena 1); nome do catálogo vertical */
  transicao?: string | null;
  /** palavras que acendem na cor do acento */
  destaques?: number[];
  /** heroi / slam: a palavra que bate grande */
  palavra?: number;
  /** como a palavra grande aparece (só caixa alta ou número da mesma palavra) */
  texto?: string;
  /** contraste: trecho que é riscado [de, ate] e a palavra grande da virada */
  riscado?: [number, number];
  grande?: number;
  /** numero: primeiro e segundo número (b opcional = contador) e a palavra da unidade */
  a?: { i: number; texto: string };
  b?: { i: number; texto: string } | null;
  unidade?: number | null;
  /** lista: itens [de, ate] */
  itens?: [number, number][];
  /** rótulo do canto inferior esquerdo (nome de quem fala, assunto); no documento, o cabeçalho */
  rotulo?: string;
  /** palavra que ganha círculo à mão (índice global) */
  circulo?: number | null;
  /** carimbo inclinado que bate na palavra `em` (texto da lista CARIMBOS de efeitos.tsx) */
  carimbo?: { texto: string; em: number } | null;
  /** duelo: rótulos das duas barras [de, ate] */
  la?: [number, number] | null;
  lb?: [number, number] | null;
};

/** x = rosto do plano (0 a 1); x0/x1 = vão entre os rostos de um plano aberto (duas pessoas) */
export type Plano = { a: number; b: number; tipo: 'rosto' | 'aberto' | 'vertical'; x?: number | null; x0?: number; x1?: number };

export type Partitura = {
  /** em public/: gravação do corte já recortada (sem som), áudio do corte, último quadro (jpg) */
  video: string;
  /** modelo Moldura Pop: a pessoa recortada (webm com transparência, mesmo enquadramento do vídeo vertical) */
  recorte?: string | null;
  /** rosto medido no vídeo vertical (centro x, y e altura, de 0 a 1) */
  rosto?: { x: number; y: number; h: number } | null;
  audio: string;
  ultimo: string;
  larguraOrig: number;
  alturaOrig: number;
  /** trocas de câmera e onde está o rosto em cada plano (x de 0 a 1) */
  planos: Plano[];
  palavras: Palavra[];
  /** fim da última palavra (s) */
  fim_s: number;
  modelo: string;
  /** tema de cores (src/temas.ts); o render põe o do modelo */
  tema?: string;
  /** cores que trocam as do tema (estilo clonado de um Reel de referência) */
  paleta?: Record<string, string>;
  /** quem fala (canto do HUD) */
  pessoa?: string;
  /** marca/marca.json: nome, @ e logo (caminho dentro de public/; vazio = nome em texto) */
  marca?: { nome?: string; handle?: string; logo?: string };
  cenas: CenaPart[];
  final: { titulo: string; sub?: string; /** palavra do "Comenta X": final encenado com comentário e direct */ palavra?: string;
    /** gatilho | comentario | seguir | quiz | aula | direct (folha.tsx, FinalComentario) */ tipo?: string };
  /** capítulos (modelos com capítulos): começam na palavra `em` */
  capitulos?: { em: number; titulo: string }[];
  sfx?: boolean;
};
