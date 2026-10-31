/* Tipos de agenda.mjs (a conta está lá, em JavaScript puro, para o Node também ler). */
import type { TemposJson } from '../tempos';

export type Ref = string | number;
export type Som = { t: number; som: string; ganho: number; dur?: number };
export type PalavraLeg = { t: string; s: number; e: number; destaque: boolean };
export type Legenda = { t0: number; t1: number; palavras: PalavraLeg[] };

/* ---------- editorial ---------- */
export type TipoBloco =
  | 'titulo-atras' | 'manchete' | 'cupom' | 'apps' | 'miniaturas' | 'celular' | 'roteiro-filme' | 'grade' | 'paleta'
  | 'whip' | 'comentario' | 'palavra-imagem' | 'pelicula' | 'minutos-depois' | 'teclas' | 'pilula' | 'circulo' | 'faixa-cta' | 'layout';
export type BlocoRoteiro = {
  tipo: TipoBloco;
  em: Ref;
  ate?: Ref;
  dur?: number;
  [k: string]: unknown;
};
export type RoteiroEditorial = {
  estilo: 'editorial';
  video: string;
  recorte?: string | null;
  audio?: string;
  volumeVideo?: number;
  trilha?: string;
  duracao?: number;
  paleta?: Partial<Record<'verde' | 'creme' | 'ouro' | 'papel' | 'tinta' | 'vermelho', string>>;
  legenda?: false | { max?: number; maxLetras?: number; destaques?: string[]; y?: number; tam?: number };
  miniaturas?: string[];
  preencherPainel?: boolean;
  blocos: BlocoRoteiro[];
};
export type BlocoAgenda = BlocoRoteiro & { id: number; t0: number; t1: number; palavra: { s: number; e: number };
  digita?: { t0: number; t1: number }; letras?: number[]; riscos?: { app: string; t: number }[]; fimEm?: number | null; resposta?: number };
export type AgendaEditorial = { estilo: 'editorial'; dur: number; blocos: BlocoAgenda[]; legendas: Legenda[]; sons: Som[] };

/* ---------- quadro ---------- */
export type Cor = 'tinta' | 'verde' | 'vermelho';
export type ItemRoteiro = {
  em: Ref;
  icone?: string; texto?: string; rotulo?: string; rotuloEm?: Ref; nota?: string; cor?: Cor;
  marca?: 'x' | 'check' | 'circulo' | 'sublinha'; sobre?: number;
  livre?: boolean; x?: number; y?: number; tam?: number; tamTexto?: number; tamRotulo?: number; ligar?: boolean;
};
export type CenaRoteiro = {
  em: Ref; titulo?: string; subtitulo?: string; subtituloEm?: Ref; tamTitulo?: number; corTitulo?: Cor;
  layout?: 'linha' | 'coluna' | 'arvore' | 'grade'; ligar?: boolean; itens?: ItemRoteiro[];
};
export type RoteiroQuadro = {
  estilo: 'quadro';
  audio?: string;
  trilha?: string;
  duracao?: number;
  rosto?: { video: string; ate: Ref; inicio?: number; legenda?: boolean };
  cores?: Partial<Record<Cor | 'papel', string>>;
  cenas: CenaRoteiro[];
};
export type Op = {
  tipo: 'icone' | 'texto' | 'traco'; t0: number; t1: number; dur: number; cor: Cor;
  nome?: string; x?: number; y?: number; tam?: number; txt?: string; d?: string; seta?: boolean; depois?: boolean;
};
export type CenaAgenda = { titulo: string; t0: number; limpa: number | null; ops: Op[] };
export type AgendaQuadro = { estilo: 'quadro'; dur: number; rosto: (RoteiroQuadro['rosto'] & { t1: number }) | null; cenas: CenaAgenda[]; sons: Som[] };

export const FPS: number;
export const TELA_CHEIA: Set<string>;
export function limpa(w: string): string;
export function tempoLetras(texto: string, palavras: TemposJson['palavras'], desde: number, d0: number, d1: number): number[];
export function achar(palavras: TemposJson['palavras'], ref: Ref): { i: number; j: number; s: number; e: number };
export function legendas(palavras: TemposJson['palavras'], o?: { max?: number; maxLetras?: number; destaques?: string[]; ocultar?: [number, number][] }): Legenda[];
export function agendaEditorial(roteiro: RoteiroEditorial, tempos: Pick<TemposJson, 'palavras'> & { fim_fala_s?: number }): AgendaEditorial;
export function agendaQuadro(roteiro: RoteiroQuadro, tempos: Pick<TemposJson, 'palavras'> & { fim_fala_s?: number }, o?: { largura?: number; altura?: number }): AgendaQuadro;
export function tabelaDeBatidas(a: AgendaEditorial | AgendaQuadro): string;
