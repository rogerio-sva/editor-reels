/* =====================================================================================
   biblioteca/cenas.tsx: os tipos de cena dos Reels "fala + motion".
   Cada cena lê a sua parte da partitura (useCenaM().n → partitura.cenas[n-1]) e a fala daquele trecho;
   nada aqui é escrito para um vídeo só. Tela vertical 1080x1920; texto entre y 300 e 1560 (embaixo
   disso o Instagram cobre com legenda e botões).

     fala       gravação recortada no rosto, a frase se escreve em blocos, destaques acendem
     heroi      câmera empurra no rosto e UMA palavra bate grande no meio
     slam       tela cheia de motion: apoio em cima, palavra gigante bate com onda e faíscas
     contraste  um trecho é riscado em vermelho e a virada entra grande ("não é fácil, mas é POSSÍVEL")
     dividido   o rosto num cartão em cima, a frase embaixo com linha de luz
     numero     dois números com régua e mira (25 → 77) ou um contador (0 → 300)
     lista      itens entram um a um com contador 01, 02, 03
     citacao    gravação escurecida, aspas grandes, frase em serifa itálica
     Final      chamada sobre o último quadro desfocado + logo (entra sozinha depois da fala)
   ===================================================================================== */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { Fagulhas, Fala, FundoM, GradeChao, HUD, LinhaLuz, MiraLaser, Onda, Poeira, timecodeM, useLayoutFala } from '../blocos';
import { Filmagem, Veu } from '../base/Filmagem';
import { useCenaM } from '../cena';
import { BRILHO, clamp01, CORM, FONTEM, janelaM, lerp, mola, PALETA, RGB, TIPOM, type EstiloM } from '../tema';
import type { Palavra } from '../tempos';
import MODELOS_JSON from './modelos.json';
import type { CenaPart, Partitura } from './tipos';
import { LogoMarca } from './efeitos';
import { FinalComentario, TIPOS_FOLHA } from './folha';
import { TIPOS_MOLDURA } from './moldura';

/* ---------------- contexto: a partitura e o modelo ---------------- */
export type Modelo = {
  nome: string;
  /** "folha": cenas de papel (src/biblioteca/folha.tsx); "editorial": outro motor; sem = cinético */
  estilo?: string;
  /** folha: "papel" (creme pontilhado) ou "mesa" (documentos claros sobre o fundo escuro do tema) */
  fundo?: string;
  capitulos?: boolean;
  /** folha: a pessoa num círculo no canto em toda cena de papel sem gravação */
  pessoaSempre?: boolean;
  tema: string;
  programa: string;
  hud: boolean;
  fx: number;
  serifa: boolean;
  transicoes: string[];
  preferidas: string[];
};
export const MODELOS = MODELOS_JSON as unknown as Record<string, Modelo>;
export const modeloDe = (nome?: string): Modelo => MODELOS[nome ?? ''] ?? MODELOS.cast;

type Ctx = { p: Partitura; m: Modelo };
export const PartituraCtx = createContext<Ctx | null>(null);
export const usePart = (): Ctx => {
  const v = useContext(PartituraCtx);
  if (!v) throw new Error('biblioteca: cena fora da <Partitura>');
  return v;
};

/* ---------------- palavras ---------------- */
export type PalavraG = Palavra & { gi: number };
export const faixa = (p: Partitura, de: number, ate: number): PalavraG[] => {
  const out: PalavraG[] = [];
  for (let i = Math.max(0, de); i <= Math.min(ate, p.palavras.length - 1); i++) out.push({ ...p.palavras[i], gi: i });
  return out;
};
export const limpa = (t: string) => t.replace(/[.,!?;:…"“”]+$/g, '');

/** Divide a fala em blocos que cabem na tela: quebra depois de pontuação ou no limite de palavras/letras. */
export const emBlocos = (ws: PalavraG[], maxPal = 6, maxLetras = 30): PalavraG[][] => {
  const blocos: PalavraG[][] = [];
  let atual: PalavraG[] = [];
  let letras = 0;
  ws.forEach((w, k) => {
    const n = limpa(w.t).length;
    if (atual.length && (atual.length >= maxPal || letras + n > maxLetras)) {
      blocos.push(atual);
      atual = [];
      letras = 0;
    }
    atual.push(w);
    letras += n + 1;
    const pausa = k + 1 < ws.length ? ws[k + 1].s - w.e : 0;
    if (/[.!?;:]$/.test(w.t) || (/,$/.test(w.t) && atual.length >= 3) || pausa > 0.45) {
      blocos.push(atual);
      atual = [];
      letras = 0;
    }
  });
  if (atual.length) blocos.push(atual);
  // bloco de uma palavra só no fim gruda no anterior (não deixa "anos." sozinho na tela)
  if (blocos.length > 1 && blocos[blocos.length - 1].length === 1 && blocos[blocos.length - 2].length < maxPal) {
    const u = blocos.pop()!;
    blocos[blocos.length - 1].push(...u);
  }
  return blocos;
};

/** Os blocos em sequência no mesmo lugar: cada um sai 3 quadros antes do próximo entrar. */
const Blocos: React.FC<{
  ws: PalavraG[];
  y: number;
  estilo: EstiloM;
  cor?: string;
  destaques?: number[];
  largura?: number;
  maxPal?: number;
  maxLetras?: number;
  modo?: 'sobe' | 'letras' | 'foco';
  /** quadro local em que o último bloco sai (ex.: a palavra-herói entra) */
  saiEm?: number;
  italico?: boolean;
}> = ({ ws, y, estilo, cor = CORM.papel, destaques = [], largura = 860, maxPal, maxLetras, modo = 'sobe', saiEm, italico }) => {
  // 860 px mantém a frase fora da coluna de botões do Instagram (conferência automática)
  const c = useCenaM();
  const { width: W } = useVideoConfig();
  if (!ws.length) return null;
  const blocos = emBlocos(ws, maxPal, maxLetras);
  return (
    <>
      {blocos.map((b, k) => {
        const prox = blocos[k + 1];
        const sai = prox ? { em: c.local(prox[0].s) - 10 } : saiEm !== undefined ? { em: saiEm } : undefined;
        const dest = b.map((w, j) => (destaques.includes(w.gi) ? j : -1)).filter((j) => j >= 0);
        return (
          <Fala key={k} palavras={b} x={W / 2} y={y} alinhar="centro" largura={largura} estilo={estilo} cor={cor} destaque={dest}
            modo={modo} sai={sai} estiloPalavra={italico ? () => ({ fontStyle: 'italic' }) : undefined} />
        );
      })}
    </>
  );
};

/* ---------------- estilo por modelo ---------------- */
const SERIFA = 'Georgia';
const estilos = (m: Modelo) => ({
  frase: m.serifa ? { ...TIPOM.frase, familia: SERIFA, peso: 700, tracking: -0.01, tamanho: 90, entrelinha: 1.12 } : { ...TIPOM.frase, tamanho: 94 },
  grande: m.serifa ? { ...TIPOM.frase, familia: SERIFA, peso: 700, tracking: -0.01, tamanho: 104, entrelinha: 1.1 } : { ...TIPOM.frase, tamanho: 104 },
  apoio: m.serifa ? { ...TIPOM.apoio, familia: SERIFA, peso: 400, tamanho: 80 } : { ...TIPOM.apoio, tamanho: 80 },
  gigante: (texto: string, max = 230): EstiloM => ({ ...TIPOM.gigante, ...(m.serifa ? { familia: SERIFA, peso: 700, tracking: -0.02 } : {}),
    tamanho: Math.round(Math.min(max, 960 / (Math.max(1, texto.length) * 0.74))) }),
});

/** O texto da palavra grande: o que a partitura mandou (caixa alta/número) ou a palavra em caixa alta. */
export const textoGrande = (w: PalavraG | undefined, texto?: string) => (texto && texto.trim() ? texto.trim() : limpa(w?.t ?? '').toUpperCase());


const Hud: React.FC<{ rotulo?: string }> = ({ rotulo }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  if (!m.hud) return null;
  return <HUD tl={`${(m.programa || p.marca?.nome || '').toUpperCase()} / ${String(c.n).padStart(2, '0')}`} tr={`REC  ${timecodeM(c.global)}`} bl={(rotulo ?? p.pessoa ?? '').toUpperCase()} br={(p.marca?.handle ?? '').toUpperCase()} inicio={2} />;
};

const Gravacao: React.FC<{ zoom?: [number, number]; escurece?: number; modo?: 'retrato' | 'card'; caixa?: { x: number; y: number; w: number; h: number } }> = ({ zoom, escurece, modo = 'retrato', caixa }) => {
  const { p } = usePart();
  return <Filmagem src={p.video} modo={modo} planos={p.planos} orig={{ w: p.larguraOrig, h: p.alturaOrig }} zoom={zoom} escurece={escurece} caixa={caixa} focoY={0.4} />;
};

const Estouro: React.FC<{ q0: number; x: number; y: number; semente: string; raio?: number }> = ({ q0, x, y, semente, raio = 560 }) => {
  const c = useCenaM();
  const { m } = usePart();
  if (m.fx <= 0) return null;
  return (
    <>
      <Onda f={c.frame} q0={q0 + 1} x={x} y={y} r1={raio * Math.min(1.3, m.fx)} />
      {m.fx >= 0.6 ? <Fagulhas f={c.frame} q0={q0 + 2} x={x} y={y} n={Math.round(24 * m.fx)} raio={raio * 0.7} semente={semente} /> : null}
    </>
  );
};

/* =============================== as cenas =============================== */

const CenaFala: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { height: H } = useVideoConfig();
  const e = estilos(m);
  const z: [number, number] = c.n % 2 ? [1.0, 1.09] : [1.12, 1.03];
  return (
    <AbsoluteFill>
      <Gravacao zoom={z} />
      <Veu de="baixo" forca={0.88} />
      <Blocos ws={faixa(p, s.de, s.ate)} y={Math.round(H * 0.66)} estilo={e.frase} destaques={s.destaques} italico={m.serifa} maxLetras={26} />
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaHeroi: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W, height: H } = useVideoConfig();
  const e = estilos(m);
  const hi = s.palavra ?? s.ate;
  const heroi = faixa(p, hi, hi);
  const txt = textoGrande(heroi[0], s.texto);
  const qR = c.local(heroi[0].s);
  const yH = Math.round(H * 0.42);
  return (
    <AbsoluteFill>
      <Gravacao zoom={[1.06, 1.3]} escurece={0.3 * clamp01((c.frame - qR + 2) / 6)} />
      <Veu de="ambos" forca={0.82} />
      <Blocos ws={faixa(p, s.de, hi - 1)} y={Math.round(H * 0.66)} estilo={e.frase} destaques={s.destaques} saiEm={qR - 4} italico={m.serifa} />
      <Fala palavras={heroi} x={W / 2} y={yH} alinhar="centro" largura={1040} estilo={e.gigante(txt, 210)} modo="slam" destaque={[0]} textos={{ 0: txt }} />
      <Estouro q0={qR} x={W / 2} y={yH + 60} semente={`heroi-${c.n}`} />
      <Blocos ws={faixa(p, hi + 1, s.ate)} y={Math.round(H * 0.66)} estilo={e.frase} destaques={s.destaques} italico={m.serifa} />
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaSlam: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const e = estilos(m);
  const hi = s.palavra ?? s.ate;
  const g = faixa(p, hi, hi);
  const txt = textoGrande(g[0], s.texto);
  const qP = c.local(g[0].s);
  const f = c.frame;
  return (
    <AbsoluteFill>
      <FundoM brilho={[50, 45]} forcaBrilho={1 + 0.7 * clamp01((f - qP) / 10)} />
      <GradeChao horizonte={1400} velocidade={2.2 * Math.max(0.6, m.fx)} />
      <Poeira semente={`slam-${c.n}`} velocidade={1.2} />
      <Blocos ws={faixa(p, s.de, hi - 1)} y={400} estilo={e.apoio} cor={CORM.papel} destaques={s.destaques} maxPal={8} maxLetras={34} />
      <Fala palavras={g} x={W / 2} y={760} alinhar="centro" largura={1040} estilo={e.gigante(txt)} modo="slam" destaque={[0]} textos={{ 0: txt }} />
      <Estouro q0={qP} x={W / 2} y={880} semente={`slam-f-${c.n}`} raio={620} />
      <Blocos ws={faixa(p, hi + 1, s.ate)} y={1160} estilo={e.grande} destaques={s.destaques} />
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaContraste: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const e = estilos(m);
  const f = c.frame;
  const [r0, r1] = s.riscado ?? [s.de, Math.min(s.ate, s.de + 2)];
  const riscado = faixa(p, r0, r1);
  const gi = s.grande ?? null;
  const estR = { ...e.frase, tamanho: riscado.reduce((a, w) => a + limpa(w.t).length + 1, 0) > 14 ? 110 : 140 };
  const lr = useLayoutFala({ palavras: riscado, x: W / 2, y: 560, alinhar: 'centro', largura: 980, estilo: estR });
  const prox = p.palavras[r1 + 1];
  const qRisco = prox && r1 + 1 <= s.ate ? c.local(prox.s) : lr.itens[lr.itens.length - 1].qFim + 6;
  // um risco por linha do trecho riscado
  const linhas = Array.from(new Set(lr.itens.map((it) => it.linha))).map((ln) => {
    const its = lr.itens.filter((it) => it.linha === ln);
    return { x0: its[0].x - 16, x1: its[its.length - 1].x + its[its.length - 1].w + 16, y: its[0].base - estR.tamanho * 0.3 };
  });
  const gW = gi !== null ? faixa(p, gi, gi) : [];
  const txt = gW.length ? textoGrande(gW[0], s.texto) : '';
  const qG = gW.length ? c.local(gW[0].s) : 0;
  return (
    <AbsoluteFill>
      <FundoM brilho={[50, 55]} forcaBrilho={1 + 0.6 * (gW.length ? clamp01((f - qG) / 10) : 0)} />
      <GradeChao horizonte={1400} velocidade={2.4} />
      <Poeira semente={`contraste-${c.n}`} velocidade={1.3} />
      <Blocos ws={faixa(p, s.de, r0 - 1)} y={360} estilo={e.apoio} cor={CORM.papel} maxPal={8} maxLetras={34} />
      <Fala palavras={riscado} x={W / 2} y={560} alinhar="centro" largura={980} estilo={estR} cor={CORM.papel} modo="letras" />
      {linhas.map((l, k) => {
        const pr = janelaM(f, qRisco + k * 3, qRisco + k * 3 + 8, 'corte');
        return <div key={k} style={{ position: 'absolute', left: l.x0, top: l.y, width: (l.x1 - l.x0) * pr, height: 14, borderRadius: 7, background: PALETA.alerta,
          boxShadow: BRILHO.vermelho, transform: 'rotate(-3deg)', transformOrigin: '0 50%' }} />;
      })}
      {gW.length ? (
        <>
          <Blocos ws={faixa(p, r1 + 1, gi! - 1)} y={830} estilo={e.apoio} cor={CORM.papel} maxPal={8} />
          <Fala palavras={gW} x={W / 2} y={940} alinhar="centro" largura={1040} estilo={e.gigante(txt, 200)} modo="slam" destaque={[0]} textos={{ 0: txt }} />
          <Estouro q0={qG} x={W / 2} y={1040} semente={`contraste-f-${c.n}`} />
          <Blocos ws={faixa(p, gi! + 1, s.ate)} y={1240} estilo={e.grande} destaques={s.destaques} />
        </>
      ) : (
        <Blocos ws={faixa(p, r1 + 1, s.ate)} y={900} estilo={e.grande} destaques={s.destaques} />
      )}
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaDividido: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const e = estilos(m);
  const f = c.frame;
  const ent = mola(f, 'assenta', c.corteLocal);
  return (
    <AbsoluteFill>
      <FundoM brilho={[50, 30]} />
      <Poeira semente={`dividido-${c.n}`} />
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - ent) * 80}px) scale(${0.94 + 0.06 * ent})`, opacity: ent }}>
        <Gravacao modo="card" zoom={[1.12, 1.24]} caixa={{ x: 70, y: 230, w: W - 140, h: 860 }} />
      </div>
      <LinhaLuz x1={W / 2 - 320} x2={W / 2 + 320} y={1170} progresso={janelaM(f, c.corteLocal + 4, c.corteLocal + 20, 'sai')} />
      <Blocos ws={faixa(p, s.de, s.ate)} y={1230} estilo={e.grande} destaques={s.destaques} italico={m.serifa} maxLetras={24} />
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

/** "25" → 25; "R$ 5.000" → 5000; "1,5" → 1.5 (para o contador). */
export const valorDe = (t: string) => {
  const so = t.replace(/[^\d,.]/g, '');
  if (!so) return null;
  const n = Number(so.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const formata = (n: number, modelo: string) => {
  const casas = /,\d+/.test(modelo) ? (modelo.split(',')[1]?.replace(/\D/g, '').length ?? 0) : 0;
  const num = n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return modelo.replace(/[\d.,]+/, num);
};

const CenaNumero: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const e = estilos(m);
  const f = c.frame;
  const a = s.a ?? { i: s.de, texto: limpa(p.palavras[s.de].t) };
  const b = s.b ?? null;
  const qa = c.local(p.palavras[a.i].s);
  const ultimo = Math.max(a.i, b?.i ?? -1, s.unidade ?? -1);
  const uni = s.unidade != null ? faixa(p, s.unidade, s.unidade) : [];
  const txtU = uni.length ? limpa(uni[0].t).toUpperCase() : '';
  const aW = faixa(p, a.i, a.i);
  if (b) {
    const qb = c.local(p.palavras[b.i].s);
    const bW = faixa(p, b.i, b.i);
    const xa = 250, xb = W - 250, yR = 860;
    const prog = janelaM(f, qa + 4, qb, 'corte');
    const mx = lerp(xa, xb, prog);
    const travou = mola(f, 'estalo', qb);
    const tamN = Math.min(220, 520 / (Math.max(a.texto.length, b.texto.length) * 0.62));
    return (
      <AbsoluteFill>
        <FundoM brilho={[50, 45]} forcaGrade={1 + travou} />
        <Poeira semente={`numero-${c.n}`} velocidade={1.2} />
        <Blocos ws={faixa(p, s.de, a.i - 1)} y={320} estilo={e.apoio} cor={CORM.papel} destaques={s.destaques} maxPal={8} maxLetras={34} />
        <Fala palavras={aW} x={xa} y={500} alinhar="centro" estilo={{ ...TIPOM.gigante, tamanho: tamN }} modo="slam" cor={CORM.papel} textos={{ 0: a.texto }} />
        <Fala palavras={bW} x={xb} y={500} alinhar="centro" estilo={{ ...TIPOM.gigante, tamanho: tamN }} modo="slam" destaque={[0]} textos={{ 0: b.texto }} />
        {Array.from({ length: 41 }, (_, i) => {
          const x = lerp(xa, xb, i / 40);
          const aceso = x <= mx;
          const alto = i % 5 === 0 ? 46 : 22;
          return <div key={i} style={{ position: 'absolute', left: x - 1.5, top: yR - alto / 2, width: 3, height: alto, borderRadius: 2,
            background: aceso ? PALETA.acento : `rgba(${RGB.claro},.18)`, boxShadow: aceso ? `0 0 10px rgba(${RGB.acento},.7)` : 'none' }} />;
        })}
        <LinhaLuz x1={xa} x2={xb} y={yR} progresso={prog} />
        <MiraLaser x={mx} y={yR} raio={110 - 30 * travou} opacidade={janelaM(f, qa, qa + 6) * (1 - janelaM(f, qb + 14, qb + 22))} />
        {uni.length ? <Fala palavras={uni} x={W / 2} y={960} alinhar="centro" estilo={e.gigante(txtU, 200)} modo="letras" cor={CORM.papel} textos={{ 0: txtU }} /> : null}
        <Estouro q0={qb} x={xb} y={600} semente={`numero-f-${c.n}`} raio={380} />
        <Blocos ws={faixa(p, ultimo + 1, s.ate)} y={1300} estilo={e.frase} destaques={s.destaques} />
        <Hud rotulo={s.rotulo} />
      </AbsoluteFill>
    );
  }
  // contador: o número sobe de 0 até o valor dito, e trava no som da palavra
  const alvo = valorDe(a.texto);
  const pr = janelaM(f, qa - 18, qa, 'sai');
  const mostra = alvo !== null && f < qa ? formata(alvo * pr, a.texto) : a.texto;
  const est = e.gigante(a.texto, 260);
  const trava = mola(f, 'estalo', qa);
  const surge = clamp01((f - (qa - 18)) / 3);
  return (
    <AbsoluteFill>
      <FundoM brilho={[50, 40]} forcaBrilho={1 + 0.6 * clamp01((f - qa) / 10)} />
      <GradeChao horizonte={1400} velocidade={1.6} />
      <Poeira semente={`contador-${c.n}`} />
      <Blocos ws={faixa(p, s.de, a.i - 1)} y={360} estilo={e.apoio} cor={CORM.papel} destaques={s.destaques} maxPal={8} maxLetras={34} />
      <div style={{ position: 'absolute', left: 0, width: W, top: 620, textAlign: 'center', fontFamily: est.familia, fontWeight: est.peso, fontSize: est.tamanho,
        letterSpacing: `${est.tracking}em`, lineHeight: 1, color: PALETA.acento, textShadow: BRILHO.verde, opacity: surge, fontVariantNumeric: 'tabular-nums',
        transform: `scale(${1 + 0.12 * (1 - trava) * (f >= qa ? 1 : 0)})` }}>{mostra}</div>
      {uni.length ? <Fala palavras={uni} x={W / 2} y={920} alinhar="centro" estilo={e.gigante(txtU, 150)} modo="letras" cor={CORM.papel} textos={{ 0: txtU }} /> : null}
      <Estouro q0={qa} x={W / 2} y={740} semente={`contador-f-${c.n}`} />
      <Blocos ws={faixa(p, ultimo + 1, s.ate)} y={1220} estilo={e.frase} destaques={s.destaques} />
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaLista: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const e = estilos(m);
  const f = c.frame;
  const itens = (s.itens ?? []).slice(0, 5);
  const passo = itens.length > 3 ? (1520 - 540) / itens.length : 250;
  return (
    <AbsoluteFill>
      <FundoM brilho={[30, 30]} />
      <Poeira semente={`lista-${c.n}`} />
      <Blocos ws={faixa(p, s.de, (itens[0]?.[0] ?? s.ate + 1) - 1)} y={330} estilo={e.apoio} cor={CORM.papel} destaques={s.destaques} maxPal={8} maxLetras={34} />
      {itens.map(([a, b], k) => {
        const ws = faixa(p, a, b);
        const q = c.local(ws[0].s) - 2;
        const ent = mola(f, 'assenta', q);
        const y = 540 + k * passo;
        if (f < q) return null;
        return (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: 60, top: y - 18, width: W - 120, height: passo - 40, borderRadius: 24,
              background: `rgba(${RGB.floresta},.82)`, border: `2px solid rgba(${RGB.acento},${0.25 + 0.5 * (1 - clamp01((f - q) / 20))})`,
              transform: `translateX(${(1 - ent) * -120}px)`, opacity: ent }} />
            <div style={{ position: 'absolute', left: 92, top: y + (passo - 40) / 2 - 52, fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 52,
              color: PALETA.acento, textShadow: BRILHO.verdeLeve, opacity: ent }}>{String(k + 1).padStart(2, '0')}</div>
            <Fala palavras={ws} x={210} y={y + (passo - 40) / 2 - 46} alinhar="esquerda" largura={W - 300}
              estilo={{ ...e.frase, tamanho: ws.reduce((t, w) => t + w.t.length + 1, 0) > 26 ? 56 : 72 }} cor={CORM.papel} />
          </React.Fragment>
        );
      })}
      <Hud rotulo={s.rotulo} />
    </AbsoluteFill>
  );
};

const CenaCitacao: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  const f = c.frame;
  const est: EstiloM = { ...TIPOM.frase, familia: SERIFA, peso: 700, tracking: -0.01, tamanho: 84, entrelinha: 1.16 };
  const ent = janelaM(f, c.corteLocal, c.corteLocal + 18, 'sai');
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: 'blur(5px)' }}>
        <Gravacao zoom={[1.15, 1.22]} escurece={0.5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(${RGB.fundo},.35), rgba(${RGB.fundo},.85))` }} />
      <div style={{ position: 'absolute', left: 0, width: W, top: 260, textAlign: 'center', fontFamily: SERIFA, fontSize: 340, lineHeight: 1,
        color: PALETA.acento, opacity: 0.85 * ent, transform: `translateY(${(1 - ent) * 40}px)`, textShadow: BRILHO.verdeLeve }}>“</div>
      <Blocos ws={faixa(p, s.de, s.ate)} y={640} estilo={est} destaques={s.destaques} maxPal={10} maxLetras={46} modo="foco" italico />
      <LinhaLuz x1={W / 2 - 160} x2={W / 2 + 160} y={1300} progresso={ent} />
      {p.pessoa || s.rotulo ? (
        <div style={{ position: 'absolute', left: 0, width: W, top: 1330, textAlign: 'center', fontFamily: FONTEM.mono, fontSize: 34, letterSpacing: '0.12em',
          color: CORM.dim, opacity: ent }}>{(s.rotulo ?? p.pessoa ?? '').toUpperCase()}</div>
      ) : null}
      {m.hud ? <Hud rotulo={s.rotulo} /> : null}
    </AbsoluteFill>
  );
};

/** Final: chamada sobre o último quadro desfocado, logo e @ da conta. */
export const Final: React.FC = () => {
  const c = useCenaM();
  const { p } = usePart();
  const { width: W, height: H } = useVideoConfig();
  const f = c.frame - c.corteLocal;
  const a = mola(f, 'assenta', 0);
  const t1 = mola(f, 'estalo', 4);
  const t2 = mola(f, 'estalo', 10);
  const t3 = mola(f, 'assenta', 16);
  return (
    <AbsoluteFill>
      <Img src={staticFile(p.ultimo)} style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', filter: 'blur(26px) brightness(.45)', transform: `scale(${1.12 + 0.04 * a})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(${RGB.fundo},.55), rgba(${RGB.fundo},.25) 40%, rgba(${RGB.fundo},.75))` }} />
      <Poeira semente="final" opacidade={0.7} />
      <LogoMarca marca={p.marca} x={W / 2} y={380} largura={560} cor={CORM.papel} opacidade={a} deslocaY={(1 - a) * -30} />
      <div style={{ position: 'absolute', left: 70, width: W - 140, top: 720, textAlign: 'center', fontFamily: FONTEM.titulo, fontWeight: 900, fontSize: 96,
        letterSpacing: '-0.03em', lineHeight: 1.04, color: CORM.papel, textWrap: 'balance', opacity: clamp01(f / 4 - 1), transform: `translateY(${(1 - t1) * 60}px) scale(${0.9 + 0.1 * t1})` }}>
        {p.final.titulo}
      </div>
      {p.final.sub ? (
        <div style={{ position: 'absolute', left: 90, width: W - 180, top: 1010, textAlign: 'center', fontFamily: FONTEM.titulo, fontWeight: 600, fontSize: 56,
          lineHeight: 1.15, color: PALETA.acentoClaro, textWrap: 'balance', opacity: clamp01((f - 10) / 4), transform: `translateY(${(1 - t2) * 40}px)` }}>{p.final.sub}</div>
      ) : null}
      <div style={{ position: 'absolute', left: W / 2 - 300, width: 600, top: 1230, height: 92, borderRadius: 46, border: `3px solid ${PALETA.acento}`,
        boxShadow: BRILHO.verdeLeve, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 38,
        letterSpacing: '0.06em', color: PALETA.acento, opacity: t3, transform: `scale(${0.85 + 0.15 * t3})` }}>{p.marca?.handle ?? ''}</div>
      <Onda f={f} q0={4} x={W / 2} y={820} r1={620} />
    </AbsoluteFill>
  );
};

/* ---------------- despacho: o componente de toda cena ---------------- */
const TIPOS: Record<string, React.FC<{ s: CenaPart }>> = {
  fala: CenaFala,
  heroi: CenaHeroi,
  slam: CenaSlam,
  contraste: CenaContraste,
  dividido: CenaDividido,
  numero: CenaNumero,
  lista: CenaLista,
  citacao: CenaCitacao,
};
export const TIPOS_CENA = Object.keys(TIPOS);

export const CenaDaPartitura: React.FC = () => {
  const c = useCenaM();
  const { p, m } = usePart();
  const s = p.cenas[c.n - 1];
  // final: com "Comenta X", o final encenado (comentário digitado e o link chegando no direct)
  // final: a chamada (gatilho, comentário, seguir, quiz, aula, direct); sem tipo e sem palavra, o final antigo
  if (!s) return p.final.palavra || p.final.tipo ? <FinalComentario claro={m.estilo === 'folha' && m.fundo !== 'mesa'} /> : <Final />;
  const mapa = m.estilo === 'folha' ? TIPOS_FOLHA : m.estilo === 'moldura' ? TIPOS_MOLDURA : TIPOS;
  const Comp = mapa[s.tipo] ?? mapa.fala ?? CenaFala;
  return <Comp s={s} />;
};
