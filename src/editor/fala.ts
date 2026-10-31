// Formato "fala": a pessoa falando para a câmera, com gancho e corpo gravados separados.
// Tudo aqui é puro (sem Remotion) para ser testado no Node.
import type {Palavra} from './tempo.ts';
export {grupos} from './tempo.ts';

export type Clipe = {video: string; de: number; ate: number};
export type Intervalo = {de: number; ate: number};
export type Oferta = {titulo: string; preco: string; detalhe?: string; cta?: string; imagem?: string; duracao: number};
export type EstiloFala = 'selfie' | 'caixinha' | 'dividida' | 'call';
// Cartão de motion acima da cabeça, com início e fim na linha do tempo final (ver componentes/Painel.tsx).
export type PainelNaLinha = Intervalo & {dados: Record<string, unknown> & {tipo: string}};

export type RoteiroFala = {
  formato: 'fala';
  estilo: EstiloFala;
  clipes: Clipe[];
  palavras: Palavra[];                          // já na linha do tempo final
  provas: (Intervalo & {imagem: string})[];     // imagem no terço de cima (na dividida: a metade de cima)
  pb: Intervalo[];                              // inserções em preto e branco, com close
  flashes: number[];                            // clarões de transição (segundo da linha final)
  titulo?: Intervalo & {texto: string; fonte: 'serifa' | 'bold'};
  caixinha?: {rotulo: string; pergunta: string};
  call?: {participantes: {nome: string; foto: string}[]; falaDe: number[]}; // falaDe[i] = participante do clipe i
  paineis?: PainelNaLinha[];
  oferta?: Oferta;
};

export const clipesNaLinha = <T extends {de: number; ate: number}>(clipes: T[]) => {
  let cursor = 0;
  return clipes.map((c) => {
    const inicio = cursor;
    cursor += c.ate - c.de;
    return {...c, inicio, fim: cursor};
  });
};

export const duracaoFala = (r: {clipes: Clipe[]; oferta?: {duracao: number}}) =>
  r.clipes.reduce((s, c) => s + (c.ate - c.de), 0) + (r.oferta?.duracao ?? 0);

/** Palavras transcritas do vídeo original que caem no trecho, deslocadas para onde o trecho entra. */
export const palavrasDoClipe = (fonte: Palavra[], trecho: Intervalo, inicio: number): Palavra[] =>
  fonte.filter((p) => p.start >= trecho.de && p.end <= trecho.ate + 0.05)
    .map((p) => ({text: p.text, start: +(p.start - trecho.de + inicio).toFixed(3), end: +(p.end - trecho.de + inicio).toFixed(3)}));

export const ativo = (r: Intervalo[], t: number) => r.some((x) => t >= x.de && t < x.ate);
