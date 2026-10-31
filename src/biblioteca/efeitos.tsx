/* =====================================================================================
   biblioteca/efeitos.tsx: efeitos novos (inspirados em Reels de referência). O princípio que se repete em todos:
   TUDO APARECE APAGADO E ACENDE QUANDO É FALADO, com uma cor de destaque só.

     <LegendaKaraoke>   legenda em 3 estados: dita (cheia), palavra-chave (cor + moldura de seleção), próxima (apagada)
     <MolduraSelecao>   caixa de seleção estilo Figma (borda + alças nos cantos) em volta de uma palavra
     <MarcaTexto>       faixa de marca-texto que corre por trás de uma palavra
     <CirculoMao>       círculo desenhado à mão em volta de uma palavra (traço que se escreve)
     <Carimbo>          carimbo inclinado que bate na tela (APROVADO, IMPORTANTE...)
     <Capitulos>        barra "PARTE N/T" no topo + pílulas-resumo que se somam no rodapé
     <FundoPapel>       papel creme pontilhado (modelo Aula em capítulos)
   Cores do papel em FOLHA (não dependem do tema: o modelo documentos põe papel claro sobre a mesa escura).
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, Img, random, staticFile, useVideoConfig } from 'remotion';
import { useLayoutFala, type FalaProps } from '../blocos';
import { useCenaM } from '../cena';
import { clamp01, ease, FONTEM, janelaM, mola, PALETA, TIPOM, type EstiloM } from '../tema';
import type { Palavra } from '../tempos';

export const FOLHA = {
  papel: '#F3EEE3',
  papelDoc: '#FBF8F1',
  tinta: '#13213A',
  tintaSuave: '#5B6475',
  apagada: '#B9B3A7',
  marca: '#FFE066',
  caneta: '#C8372D',
  azulSelecao: '#2F80ED',
};

export const SERIFA = 'Georgia';

type PalavraG = Palavra & { gi: number };

/* ---------------- legenda karaokê em 3 estados ---------------- */
type CoresKaraoke = { dita: string; proxima: string; chave: string };
export const CORES_ESCURO: CoresKaraoke = { dita: '#FFFFFF', proxima: 'rgba(255,255,255,.32)', chave: PALETA.acento };
export const CORES_PAPEL: CoresKaraoke = { dita: FOLHA.tinta, proxima: FOLHA.apagada, chave: FOLHA.caneta };

/** Um bloco: todas as palavras aparecem apagadas e cada uma acende no quadro em que é dita. */
const BlocoKaraoke: React.FC<{
  ws: PalavraG[];
  x: number;
  y: number;
  largura: number;
  estilo: EstiloM;
  cores: CoresKaraoke;
  destaques: number[];
  moldura: boolean;
  entra: number;
  sai?: number;
  alinhar?: 'centro' | 'esquerda';
  /** realce da palavra-chave: moldura de seleção (padrão) ou marca-texto atrás */
  realce?: 'moldura' | 'marca';
  /** índice global de uma palavra que ganha círculo à mão */
  circulo?: number | null;
}> = ({ ws, x, y, largura, estilo, cores, destaques, moldura, entra, sai, alinhar = 'centro', realce = 'moldura', circulo = null }) => {
  const c = useCenaM();
  const f = c.frame;
  const props: FalaProps = { palavras: ws, x, y, alinhar, largura, estilo };
  const lf = useLayoutFala(props);
  if (f < entra || (sai !== undefined && f > sai + 6)) return null;
  const aparece = mola(f, 'assenta', entra);
  const some = sai !== undefined ? janelaM(f, sai, sai + 6, 'entra') : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: aparece * (1 - some), transform: `translateY(${(1 - aparece) * 24 - some * 30}px)` }}>
      {lf.itens.map((it) => {
        const w = ws[it.i];
        const dita = f >= it.q;
        const chave = destaques.includes(w.gi);
        const acende = clamp01((f - it.q) / 3);
        const cor = !dita ? cores.proxima : chave ? cores.chave : cores.dita;
        return (
          <React.Fragment key={it.i}>
            {chave && moldura && dita && realce === 'moldura' ? <MolduraSelecao x={it.x} y={it.y} w={it.w} h={it.h} q0={it.q} cor={FOLHA.azulSelecao} /> : null}
            {chave && dita && realce === 'marca' ? <MarcaTexto x={it.x} y={it.y} w={it.w} h={it.h} q0={it.q} /> : null}
            {circulo === w.gi && dita ? <CirculoMao x={it.x} y={it.y} w={it.w} h={it.h} q0={it.q + 2} semente={`c${w.gi}`} /> : null}
            <div style={{ position: 'absolute', left: it.x, top: it.y, height: it.h, lineHeight: `${it.h}px`, whiteSpace: 'pre',
              // a fonte da palavra-chave é a mesma da medida (serifa trocada mudava a largura e encostava na vizinha)
              fontFamily: it.estilo.familia, fontStyle: chave && dita ? 'italic' : 'normal', fontWeight: it.estilo.peso, fontSize: it.estilo.tamanho, letterSpacing: `${it.estilo.tracking}em`,
              color: cor, transform: `scale(${1 + 0.06 * (1 - acende) * (dita ? 1 : 0)})`, transformOrigin: '50% 70%' }}>{it.texto}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/** Legenda karaokê: divide a fala em blocos curtos; cada bloco aparece inteiro e apagado 4 quadros antes da
    primeira palavra e acende palavra a palavra. */
export const LegendaKaraoke: React.FC<{
  blocos: PalavraG[][];
  y: number;
  estilo?: EstiloM;
  cores?: CoresKaraoke;
  destaques?: number[];
  moldura?: boolean;
  largura?: number;
  x?: number;
  alinhar?: 'centro' | 'esquerda';
  realce?: 'moldura' | 'marca';
  circulo?: number | null;
  /** quadro local em que o último bloco sai (ex.: entra a palavra grande) */
  saiEm?: number;
}> = ({ blocos, y, estilo = { ...TIPOM.frase, tamanho: 86 }, cores = CORES_ESCURO, destaques = [], moldura = true, largura = 840, x, alinhar, realce, circulo, saiEm }) => {
  // 840 px de largura deixa a legenda fora da coluna de botões do Instagram (conferência automática)
  const c = useCenaM();
  const { width: W } = useVideoConfig();
  return (
    <>
      {blocos.map((b, k) => {
        const entra = Math.max(0, c.local(b[0].s) - 4);
        const prox = blocos[k + 1];
        const sai = prox ? c.local(prox[0].s) - 6 : saiEm;
        return <BlocoKaraoke key={k} ws={b} x={x ?? W / 2} y={y} largura={largura} estilo={estilo} cores={cores} destaques={destaques}
          moldura={moldura} entra={entra} sai={sai} alinhar={alinhar} realce={realce} circulo={circulo} />;
      })}
    </>
  );
};

/* ---------------- moldura de seleção (estilo Figma) ---------------- */
export const MolduraSelecao: React.FC<{ x: number; y: number; w: number; h: number; q0: number; cor?: string; folga?: number }> = ({ x, y, w, h, q0, cor = FOLHA.azulSelecao, folga = 5 }) => {
  const c = useCenaM();
  const p = mola(c.frame, 'estalo', q0);
  if (c.frame < q0) return null;
  const X = x - folga, Y = y + h * 0.12 - folga, Wd = w + folga * 2, Hd = h * 0.82 + folga * 2;
  const alca = (ax: number, ay: number, k: number) => (
    <div key={k} style={{ position: 'absolute', left: ax - 7, top: ay - 7, width: 14, height: 14, background: '#fff', border: `3px solid ${cor}`, transform: `scale(${p})` }} />
  );
  return (
    <>
      <div style={{ position: 'absolute', left: X + (Wd * (1 - p)) / 2, top: Y, width: Wd * p, height: Hd, border: `3px solid ${cor}`, background: `${cor}14` }} />
      {[alca(X, Y, 0), alca(X + Wd, Y, 1), alca(X, Y + Hd, 2), alca(X + Wd, Y + Hd, 3)]}
    </>
  );
};

/* ---------------- marca-texto e círculo à mão ---------------- */
export const MarcaTexto: React.FC<{ x: number; y: number; w: number; h: number; q0: number; cor?: string; dur?: number }> = ({ x, y, w, h, q0, cor = FOLHA.marca, dur = 8 }) => {
  const c = useCenaM();
  const p = janelaM(c.frame, q0, q0 + dur, 'sai');
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', left: x - 8, top: y + h * 0.42, width: (w + 16) * p, height: h * 0.5, background: cor, opacity: 0.85,
    borderRadius: 6, transform: 'rotate(-1deg)', mixBlendMode: 'multiply' }} />;
};

export const CirculoMao: React.FC<{ x: number; y: number; w: number; h: number; q0: number; cor?: string; semente?: string }> = ({ x, y, w, h, q0, cor = FOLHA.caneta, semente = 'circ' }) => {
  const c = useCenaM();
  const p = janelaM(c.frame, q0, q0 + 14, 'sai');
  if (p <= 0) return null;
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2 + 28, ry = h / 2 + 14;
  // elipse um pouco torta, com a ponta passando do começo (como caneta de verdade)
  const pts = Array.from({ length: 40 }, (_, i) => {
    const a = -Math.PI * 0.6 + (i / 39) * Math.PI * 2.15;
    const j = 1 + (random(`${semente}-${i}`) - 0.5) * 0.06;
    return `${(cx + Math.cos(a) * rx * j).toFixed(1)},${(cy + Math.sin(a) * ry * j).toFixed(1)}`;
  });
  const comp = 2 * Math.PI * Math.max(rx, ry) * 1.15;
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }} width="100%" height="100%">
      <polyline points={pts.join(' ')} fill="none" stroke={cor} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={comp} strokeDashoffset={comp * (1 - p)} opacity={0.92} />
    </svg>
  );
};

/* ---------------- carimbo ---------------- */
export const CARIMBOS = ['APROVADO', 'REPROVADO', 'VERDADE', 'MITO', 'ATENÇÃO', 'IMPORTANTE', 'URGENTE', 'CONCLUÍDO', 'NOVO', 'CUIDADO'] as const;

export const Carimbo: React.FC<{ texto: string; x: number; y: number; q0: number; cor?: string; giro?: number; tamanho?: number }> = ({ texto, x, y, q0, cor = FOLHA.caneta, giro = -12, tamanho = 96 }) => {
  const c = useCenaM();
  const f = c.frame;
  if (f < q0) return null;
  const m = mola(f, 'estalo', q0);
  const tremor = f - q0 < 4 ? (random(`car-${f}`) - 0.5) * 6 : 0;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) translate(${tremor}px,0) rotate(${giro}deg) scale(${1 + 0.9 * (1 - m)})`,
      opacity: clamp01((f - q0) / 2), padding: '14px 34px', border: `8px solid ${cor}`, borderRadius: 16, color: cor,
      fontFamily: FONTEM.mono, fontWeight: 700, fontSize: tamanho, letterSpacing: '0.06em', whiteSpace: 'nowrap',
      boxShadow: `inset 0 0 0 4px ${cor}22`, mixBlendMode: 'multiply' }}>{texto}</div>
  );
};

/* ---------------- capítulos ---------------- */
export type Capitulo = { em: number; titulo: string };

/** Barra "PARTE N/T" no topo (segmentos que enchem) e pílulas-resumo no rodapé: cada capítulo que termina vira
    uma pílula que fica. `quadros` = quadro global em que cada capítulo começa; `fim` = quadro global do fim da fala. */
export const Capitulos: React.FC<{ caps: Capitulo[]; quadros: number[]; fim: number; global: number; claro?: boolean }> = ({ caps, quadros, fim, global, claro }) => {
  const { width: W } = useVideoConfig();
  if (!caps.length) return null;
  const atual = Math.max(0, quadros.filter((q) => global >= q - 2).length - 1);
  if (global < quadros[0] - 2) return null;
  const tinta = claro ? FOLHA.tinta : '#FFFFFF';
  const fundoSeg = claro ? 'rgba(19,33,58,.14)' : 'rgba(255,255,255,.18)';
  const acento = claro ? FOLHA.caneta : PALETA.acento;
  const n = caps.length;
  const gap = 10;
  const segW = (W - 120 - gap * (n - 1)) / n;
  const troca = mola(global, 'estalo', quadros[atual]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {caps.map((_, k) => {
        const ini = quadros[k];
        const fimK = k + 1 < n ? quadros[k + 1] : fim;
        const p = k < atual ? 1 : k > atual ? 0 : clamp01((global - ini) / Math.max(1, fimK - ini));
        return (
          <div key={k} style={{ position: 'absolute', left: 60 + k * (segW + gap), top: 120, width: segW, height: 10, borderRadius: 5, background: fundoSeg, overflow: 'hidden' }}>
            <div style={{ width: `${p * 100}%`, height: '100%', background: k === atual ? acento : tinta, opacity: k === atual ? 1 : 0.75 }} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 60, top: 146, fontFamily: FONTEM.mono, fontSize: 30, letterSpacing: '0.1em', color: tinta, opacity: 0.85 }}>
        {`PARTE ${atual + 1}/${n}`}
        <span style={{ marginLeft: 18, fontFamily: FONTEM.titulo, fontWeight: 800, letterSpacing: '-0.01em', fontSize: 34, color: acento,
          display: 'inline-block', transform: `translateY(${(1 - troca) * 14}px)`, opacity: troca }}>{caps[atual].titulo.toUpperCase()}</span>
      </div>
      {/* pílulas-resumo: os capítulos já vistos ficam no rodapé (acima da área da legenda do Instagram) */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: 1530, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {caps.slice(0, atual).map((cap, k) => {
          const e = mola(global, 'assenta', quadros[k + 1] ?? fim);
          return <div key={k} style={{ padding: '8px 20px', borderRadius: 30, fontFamily: FONTEM.titulo, fontWeight: 700, fontSize: 28,
            color: claro ? FOLHA.tinta : '#fff', background: claro ? 'rgba(255,224,102,.85)' : 'rgba(255,255,255,.12)',
            border: claro ? `2px solid ${FOLHA.tinta}` : `1px solid rgba(255,255,255,.3)`, opacity: e, transform: `scale(${0.8 + 0.2 * e})` }}>
            {`✓ ${cap.titulo}`}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- papel pontilhado ---------------- */
export const FundoPapel: React.FC<{ cor?: string }> = ({ cor = FOLHA.papel }) => (
  <AbsoluteFill style={{ background: cor }}>
    <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(19,33,58,.16) 2px, transparent 2.5px)', backgroundSize: '36px 36px', backgroundPosition: '18px 18px' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 45%, transparent 60%, rgba(120,100,60,.18) 100%)' }} />
  </AbsoluteFill>
);

/** Easing exportado para quem desenha à mão (linha que se escreve). */
export const escrita = (f: number, q0: number, dur: number) => ease.sai(clamp01((f - q0) / dur));

/** Logo da marca (marca/marca.json → public/) ou, sem logo, o nome em texto. */
export const LogoMarca: React.FC<{ marca?: { nome?: string; logo?: string }; x: number; y: number; largura: number; cor: string; opacidade?: number; deslocaY?: number }> = ({ marca, x, y, largura, cor, opacidade = 1, deslocaY = 0 }) => {
  if (marca?.logo) return <Img src={staticFile(marca.logo)} style={{ position: 'absolute', left: x - largura / 2, top: y, width: largura, opacity: opacidade, transform: `translateY(${deslocaY}px)` }} />;
  return <div style={{ position: 'absolute', left: x - largura, width: largura * 2, top: y, textAlign: 'center', fontFamily: FONTEM.titulo, fontWeight: 900, fontSize: 64, letterSpacing: '-0.02em',
    color: cor, opacity: opacidade, transform: `translateY(${deslocaY}px)` }}>{marca?.nome ?? ''}</div>;
};
