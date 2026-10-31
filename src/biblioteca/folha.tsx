/* =====================================================================================
   biblioteca/folha.tsx: cenas "de papel". Usadas pelos modelos de estilo "folha":
     capitulos       papel creme pontilhado, tinta azul-marinho, caneta vermelha, marca-texto amarelo, capítulos
     documentos      documentos claros sobre a mesa escura do tema (carimbos, círculos)
   Tudo segue a mesma regra: aparece apagado e acende quando é dito.

     fala / dividido   a gravação numa foto presa com fita + legenda karaokê embaixo
     heroi             foto + UMA palavra grande com marca-texto
     slam / citacao    sem gravação: apoio em cima, palavra grande sublinhada à mão, resto embaixo
     contraste         trecho riscado à caneta, virada grande com marca-texto
     documento         folha de documento (cabeçalho = rotulo) com o texto falado, marca-texto, círculo e carimbo
     chips / lista     itens aparecem apagados e acendem um a um na palavra
     passos            passos 01..N ligados por uma linha que se preenche; carimbo no fim
     duelo             duas barras com os números ditos; a maior ganha o carimbo
     numero            contador grande com marca-texto
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { Filmagem } from '../base/Filmagem';
import { useCenaM } from '../cena';
import { clamp01, FONTEM, janelaM, lerp, mola, PALETA, TIPOM, type EstiloM } from '../tema';
import { FundoM } from '../visual';
import { emBlocos, faixa, formata, limpa, textoGrande, usePart, valorDe, type PalavraG } from './cenas';
import { Carimbo, CirculoMao, LogoMarca, CORES_ESCURO, CORES_PAPEL, escrita, FOLHA, FundoPapel, LegendaKaraoke, MarcaTexto, SERIFA } from './efeitos';
import type { CenaPart } from './tipos';

/* ---------------- contexto visual do modelo ---------------- */
const useFolha = () => {
  const { m } = usePart();
  const claro = m.fundo !== 'mesa';
  return {
    claro,
    tinta: claro ? FOLHA.tinta : '#FFFFFF',
    cores: claro ? CORES_PAPEL : CORES_ESCURO,
    acento: claro ? FOLHA.caneta : PALETA.acento,
  };
};

const Fundo: React.FC = () => {
  const { claro } = useFolha();
  return claro ? <FundoPapel /> : <FundoM brilho={[50, 40]} grade={0.6} />;
};

const frase = (claro: boolean): EstiloM => ({ ...TIPOM.frase, tamanho: 80, peso: 800, entrelinha: 1.12 });
const grande = (texto: string, max = 200): EstiloM => ({ ...TIPOM.gigante, familia: SERIFA, peso: 700, tracking: -0.02,
  // Georgia itálico em caixa alta ocupa ~0,8 em por letra (0,62 estourava a tela em FALSIFICAR)
  tamanho: Math.round(Math.min(max, 860 / (Math.max(1, texto.length) * 0.92))) });

/** A gravação numa foto com borda branca, levemente torta, com dois pedaços de fita. */
const Foto: React.FC<{ y?: number; h?: number; zoom?: [number, number] }> = ({ y = 250, h = 800, zoom = [1.04, 1.14] }) => {
  const c = useCenaM();
  const { p } = usePart();
  const { width: W } = useVideoConfig();
  const ent = mola(c.frame, 'assenta', c.corteLocal);
  const giro = c.n % 2 ? -1.6 : 1.4;
  const x = 80, w = W - 160;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${giro}deg) translateY(${(1 - ent) * 60}px) scale(${0.95 + 0.05 * ent})`,
      opacity: ent, background: '#fff', padding: 16, boxShadow: '0 24px 50px rgba(0,0,0,.28)' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <Filmagem src={p.video} modo="card" planos={p.planos} orig={{ w: p.larguraOrig, h: p.alturaOrig }} zoom={zoom}
          caixa={{ x: 0, y: 0, w: w - 32, h: h - 32 }} focoY={0.4} />
      </div>
      {[[-20, -26, -8], [w - 150, h - 30, 6]].map(([fx, fy, g], k) => (
        <div key={k} style={{ position: 'absolute', left: fx, top: fy, width: 170, height: 52, background: 'rgba(255,236,170,.78)',
          transform: `rotate(${g}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,.12)' }} />
      ))}
    </div>
  );
};

/** nos modelos com `pessoaSempre`, as cenas de
    papel sem gravação ganham a pessoa num círculo no canto de cima, ainda falando. */
const Bolha: React.FC = () => {
  const c = useCenaM();
  const { p, m } = usePart();
  const { width: W } = useVideoConfig();
  if (!m.pessoaSempre) return null;
  const d = 250;
  const ent = mola(c.frame, 'estalo', c.corteLocal + 3);
  return (
    <div style={{ position: 'absolute', left: W - d - 50, top: 200, width: d, height: d, borderRadius: '50%', overflow: 'hidden', border: '8px solid #fff',
      boxShadow: '0 14px 34px rgba(0,0,0,.3)', transform: `scale(${ent})`, background: '#000' }}>
      <Filmagem src={p.video} modo="card" planos={p.planos} orig={{ w: p.larguraOrig, h: p.alturaOrig }} zoom={[1.5, 1.6]}
        caixa={{ x: -8, y: -8, w: d, h: d }} focoY={0.38} />
    </div>
  );
};

/** Onde fica a frase de apoio no alto: com a bolha, mais estreita e puxada para a esquerda. */
const useApoio = () => {
  const { m } = usePart();
  const { width: W } = useVideoConfig();
  return m.pessoaSempre ? { x: (W - 320) / 2 + 10, largura: W - 420 } : { x: undefined as number | undefined, largura: 940 };
};

/** Barrinha da marca no rodapé (o @ em toda cena de papel). */
const Assinatura: React.FC = () => {
  const { tinta } = useFolha();
  const { p } = usePart();
  return <div style={{ position: 'absolute', left: 60, top: 1640, fontFamily: FONTEM.mono, fontSize: 28, letterSpacing: '0.1em', color: tinta, opacity: 0.55 }}>
    {(p.marca?.handle ?? '').toUpperCase()}</div>;
};

const paginas = (ws: PalavraG[], n: number): PalavraG[][] => {
  const out: PalavraG[][] = [];
  for (let i = 0; i < ws.length; i += n) out.push(ws.slice(i, i + n));
  return out.filter((b) => b.length);
};

/* =============================== as cenas =============================== */

const FolhaFala: React.FC<{ s: CenaPart }> = ({ s }) => {
  const { p } = usePart();
  const { cores } = useFolha();
  const fx = useFolha();
  return (
    <AbsoluteFill>
      <Fundo />
      <Foto />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, s.ate), 5, 24)} y={1140} estilo={frase(fx.claro)} cores={cores}
        destaques={s.destaques} realce={fx.claro ? 'marca' : 'moldura'} circulo={s.circulo} />
      <CarimboDaCena s={s} x={760} y={1000} />
      <Assinatura />
    </AbsoluteFill>
  );
};

const FolhaHeroi: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const { width: W } = useVideoConfig();
  const hi = s.palavra ?? s.ate;
  const g = faixa(p, hi, hi);
  const txt = textoGrande(g[0], s.texto);
  const qG = c.local(g[0].s);
  const est = grande(txt, 170);
  const larg = Math.min(940, txt.length * est.tamanho * 0.78);
  return (
    <AbsoluteFill>
      <Fundo />
      <Foto h={720} />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, hi - 1), 5, 24)} y={1100} estilo={frase(fx.claro)} cores={fx.cores} destaques={s.destaques} saiEm={qG - 8} />
      {c.frame >= qG - 2 ? (
        <>
          <MarcaTexto x={W / 2 - larg / 2} y={1060} w={larg} h={est.tamanho * 1.1} q0={qG + 2} cor={fx.claro ? FOLHA.marca : PALETA.acento} />
          <div style={{ position: 'absolute', left: 0, width: W, top: 1060, textAlign: 'center', fontFamily: est.familia, fontWeight: est.peso, fontStyle: 'italic',
            fontSize: est.tamanho, lineHeight: 1.1, color: fx.tinta, transform: `scale(${1 + 0.5 * (1 - mola(c.frame, 'estalo', qG))})` }}>{txt}</div>
        </>
      ) : null}
      <LegendaKaraoke blocos={emBlocos(faixa(p, hi + 1, s.ate), 5, 24)} y={1320} estilo={{ ...frase(fx.claro), tamanho: 64 }} cores={fx.cores} destaques={s.destaques} />
      <CarimboDaCena s={s} x={780} y={900} />
      <Assinatura />
    </AbsoluteFill>
  );
};

const FolhaSlam: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const hi = s.palavra ?? s.ate;
  const g = faixa(p, hi, hi);
  const txt = textoGrande(g[0], s.texto);
  const qG = c.local(g[0].s);
  const est = grande(txt);
  const larg = Math.min(980, txt.length * est.tamanho * 0.6);
  const sub = escrita(c.frame, qG + 3, 12);
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, hi - 1), 7, 32)} y={430} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 70 }} cores={fx.cores} destaques={s.destaques} moldura={false} />
      {c.frame >= qG - 2 ? (
        <>
          <div style={{ position: 'absolute', left: 0, width: W, top: 760, textAlign: 'center', fontFamily: est.familia, fontWeight: est.peso, fontStyle: 'italic',
            fontSize: est.tamanho, lineHeight: 1.05, color: fx.tinta, opacity: clamp01((c.frame - qG + 2) / 3),
            transform: `scale(${1 + 0.45 * (1 - mola(c.frame, 'estalo', qG))}) rotate(${-1.5 * mola(c.frame, 'estalo', qG)}deg)` }}>{txt}</div>
          {/* sublinhado à mão, duas passadas */}
          <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width="100%" height="100%">
            {[0, 1].map((k) => {
              const y = 760 + est.tamanho * 1.08 + k * 18;
              const x0 = W / 2 - larg / 2, x1 = W / 2 + larg / 2;
              const comp = larg * 1.05;
              return <path key={k} d={`M${x0} ${y + 6} Q ${W / 2} ${y - 10 + k * 8} ${x1} ${y}`} fill="none" stroke={fx.acento} strokeWidth={9 - k * 3}
                strokeLinecap="round" strokeDasharray={comp} strokeDashoffset={comp * (1 - clamp01(sub * 1.4 - k * 0.4))} />;
            })}
          </svg>
        </>
      ) : null}
      <LegendaKaraoke blocos={emBlocos(faixa(p, hi + 1, s.ate), 5, 24)} y={1180} estilo={frase(fx.claro)} cores={fx.cores} destaques={s.destaques}
        realce={fx.claro ? 'marca' : 'moldura'} circulo={s.circulo} />
      <CarimboDaCena s={s} x={W / 2} y={1460} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

const FolhaContraste: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const [r0, r1] = s.riscado ?? [s.de, Math.min(s.ate, s.de + 2)];
  const riscado = faixa(p, r0, r1);
  const qR = c.local((p.palavras[r1 + 1] ?? p.palavras[r1]).s);
  const risco = escrita(c.frame, qR, 8);
  const gi = s.grande ?? null;
  const gW = gi !== null ? faixa(p, gi, gi) : [];
  const txt = gW.length ? textoGrande(gW[0], s.texto) : '';
  const qG = gW.length ? c.local(gW[0].s) : 0;
  const estR: EstiloM = { ...frase(fx.claro), tamanho: 96 };
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, r0 - 1), 7, 32)} y={380} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 64 }} cores={fx.cores} moldura={false} />
      <LegendaKaraoke blocos={[riscado]} y={560} estilo={estR} cores={fx.cores} moldura={false} />
      <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width="100%" height="100%">
        {risco > 0.02 ? <path d={`M120 640 L ${120 + (W - 240) * risco} ${612 + 10 * risco}`} stroke={FOLHA.caneta} strokeWidth={12} strokeLinecap="round" /> : null}
      </svg>
      {gW.length && c.frame >= qG - 2 ? (
        <>
          <MarcaTexto x={W / 2 - Math.min(940, txt.length * 70) / 2} y={860} w={Math.min(940, txt.length * 70)} h={170} q0={qG + 2} cor={fx.claro ? FOLHA.marca : PALETA.acento} />
          <div style={{ position: 'absolute', left: 0, width: W, top: 850, textAlign: 'center', fontFamily: SERIFA, fontStyle: 'italic', fontWeight: 700,
            fontSize: grande(txt, 170).tamanho, color: fx.tinta, transform: `scale(${1 + 0.5 * (1 - mola(c.frame, 'estalo', qG))})` }}>{txt}</div>
        </>
      ) : null}
      <LegendaKaraoke blocos={emBlocos(faixa(p, gi !== null ? gi + 1 : r1 + 1, s.ate), 5, 24)} y={1180} estilo={frase(fx.claro)} cores={fx.cores} destaques={s.destaques} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

/** Folha de documento: cabeçalho (rotulo), linhas pautadas, o texto falado em blocos, marca-texto, círculo e carimbo. */
const FolhaDocumento: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const ent = mola(c.frame, 'assenta', c.corteLocal);
  const x = 70, y = 250, w = W - 140, h = 1180;
  return (
    <AbsoluteFill>
      <Fundo />
      {/* folha de trás, para dar pilha de autos */}
      <div style={{ position: 'absolute', left: x + 20, top: y + 18, width: w, height: h, background: '#EDE7DA', transform: 'rotate(2deg)', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }} />
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: FOLHA.papelDoc, transform: `rotate(-1deg) translateY(${(1 - ent) * 80}px)`,
        opacity: ent, boxShadow: '0 24px 50px rgba(0,0,0,.3)',
        backgroundImage: 'repeating-linear-gradient(transparent 0 79px, rgba(47,128,237,.13) 79px 81px)', backgroundPosition: '0 200px' }}>
        <div style={{ position: 'absolute', left: 50, top: 46, right: 50, borderBottom: `3px solid ${FOLHA.tinta}`, paddingBottom: 18,
          fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 34, letterSpacing: '0.08em', color: FOLHA.tinta }}>
          {(s.rotulo || 'DOCUMENTO').toUpperCase()}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(-1deg) translateY(${(1 - ent) * 80}px)` }}>
        {/* o documento mostra o parágrafo inteiro, apagado, e acende conforme a fala (em páginas de 40 palavras) */}
        <LegendaKaraoke blocos={paginas(faixa(p, s.de, s.ate), 40)} y={470} x={130} alinhar="esquerda" largura={820}
          estilo={{ ...TIPOM.frase, familia: SERIFA, peso: 400, tamanho: 64, tracking: -0.005, entrelinha: 1.25 }} cores={CORES_PAPEL}
          destaques={s.destaques} realce="marca" circulo={s.circulo} />
      </div>
      <Bolha />
      <CarimboDaCena s={s} x={720} y={1250} />
    </AbsoluteFill>
  );
};

/** Itens que aparecem apagados desde o começo e acendem um a um na palavra. */
const FolhaChips: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const itens = (s.itens ?? []).slice(0, 6);
  const passo = itens.length > 4 ? 150 : 180;
  const y0 = 600;
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, (itens[0]?.[0] ?? s.ate + 1) - 1), 7, 32)} y={340} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 70 }}
        cores={fx.cores} destaques={s.destaques} moldura={false} />
      {itens.map(([a, b], k) => {
        const ws = faixa(p, a, b);
        const q = c.local(ws[0].s) - 2;
        const surge = mola(c.frame, 'assenta', c.corteLocal + 4 + k * 3);
        const aceso = c.frame >= q;
        const acende = mola(c.frame, 'estalo', q);
        const texto = ws.map((w) => w.t).join(' ').replace(/[.,;:]$/, '');
        return (
          <div key={k} style={{ position: 'absolute', left: 70, width: W - 140, top: y0 + k * passo, height: passo - 34, borderRadius: 26,
            display: 'flex', alignItems: 'center', gap: 26, padding: '0 34px', boxSizing: 'border-box', opacity: surge,
            transform: `translateX(${(1 - surge) * -60}px) scale(${aceso ? 1 + 0.04 * (1 - acende) : 1})`,
            background: aceso ? (fx.claro ? FOLHA.marca : PALETA.acento) : 'transparent',
            border: aceso ? `3px solid ${fx.claro ? FOLHA.tinta : PALETA.acento}` : `3px dashed ${fx.claro ? 'rgba(19,33,58,.3)' : 'rgba(255,255,255,.3)'}`,
            boxShadow: aceso ? '0 10px 0 rgba(19,33,58,.9)' : 'none' }}>
            <div style={{ width: 54, height: 54, borderRadius: 27, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 28, background: aceso ? FOLHA.tinta : 'transparent',
              color: aceso ? '#fff' : fx.claro ? 'rgba(19,33,58,.35)' : 'rgba(255,255,255,.4)', border: aceso ? 'none' : '2px solid currentColor' }}>
              {aceso ? '✓' : String(k + 1).padStart(2, '0')}</div>
            <div style={{ fontFamily: FONTEM.titulo, fontWeight: 800, fontSize: texto.length > 34 ? 44 : 54, lineHeight: 1.08, letterSpacing: '-0.02em',
              color: aceso ? FOLHA.tinta : fx.claro ? FOLHA.apagada : 'rgba(255,255,255,.35)' }}>{texto}</div>
          </div>
        );
      })}
      <CarimboDaCena s={s} x={W / 2} y={y0 + itens.length * passo + 60} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

/** Passos 01..N ligados por uma linha que se preenche até o passo da vez. */
const FolhaPassos: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const itens = (s.itens ?? []).slice(0, 5);
  const passo = Math.min(230, 900 / Math.max(1, itens.length));
  const y0 = 560, xc = 150;
  const qs = itens.map(([a]) => c.local(p.palavras[a].s) - 2);
  const ativos = qs.filter((q) => c.frame >= q).length;
  // a linha anda do passo anterior até o passo da vez
  const yLinha = ativos > 0 ? y0 + lerp(Math.max(0, ativos - 2), ativos - 1, clamp01((c.frame - qs[ativos - 1]) / 10)) * passo : y0;
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, (itens[0]?.[0] ?? s.ate + 1) - 1), 7, 32)} y={330} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 70 }}
        cores={fx.cores} destaques={s.destaques} moldura={false} />
      <div style={{ position: 'absolute', left: xc - 4, top: y0, width: 8, height: Math.max(0, (itens.length - 1) * passo), background: fx.claro ? 'rgba(19,33,58,.15)' : 'rgba(255,255,255,.15)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: xc - 4, top: y0, width: 8, height: Math.max(0, yLinha - y0), background: fx.acento, borderRadius: 4 }} />
      {itens.map(([a, b], k) => {
        const ws = faixa(p, a, b);
        const aceso = c.frame >= qs[k];
        const m = mola(c.frame, 'estalo', qs[k]);
        const texto = ws.map((w) => w.t).join(' ').replace(/[.,;:]$/, '');
        const y = y0 + k * passo;
        return (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: xc - 46, top: y - 46, width: 92, height: 92, borderRadius: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 36, background: aceso ? fx.acento : fx.claro ? FOLHA.papel : '#0A1628',
              color: aceso ? '#fff' : fx.claro ? 'rgba(19,33,58,.4)' : 'rgba(255,255,255,.4)', border: `4px solid ${aceso ? fx.acento : fx.claro ? 'rgba(19,33,58,.25)' : 'rgba(255,255,255,.25)'}`,
              transform: `scale(${aceso ? 1 + 0.25 * (1 - m) : 1})` }}>{String(k + 1).padStart(2, '0')}</div>
            <div style={{ position: 'absolute', left: xc + 80, width: W - xc - 140, top: y - 40, fontFamily: FONTEM.titulo, fontWeight: 800,
              fontSize: texto.length > 40 ? 44 : 54, lineHeight: 1.1, letterSpacing: '-0.02em',
              color: aceso ? fx.tinta : fx.claro ? FOLHA.apagada : 'rgba(255,255,255,.35)', transform: `translateX(${aceso ? (1 - m) * 20 : 0}px)` }}>{texto}</div>
          </React.Fragment>
        );
      })}
      <CarimboDaCena s={s} x={W / 2 + 120} y={y0 + itens.length * passo + 20} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

/** Duas barras com os números ditos; a maior ganha o carimbo da cena (se houver). */
const FolhaDuelo: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const a = s.a ?? { i: s.de, texto: limpa(p.palavras[s.de].t) };
  const b = s.b ?? a;
  const va = valorDe(a.texto) ?? 1, vb = valorDe(b.texto) ?? 1;
  const max = Math.max(va, vb, 1e-9);
  const rot = (r: [number, number] | null | undefined, padrao: [number, number]) => {
    const [x0, x1] = r ?? padrao;
    return faixa(p, x0, x1).map((w) => w.t).join(' ').replace(/[.,;:]$/, '');
  };
  const la = rot(s.la, [Math.max(s.de, a.i - 3), a.i - 1]);
  const lb = rot(s.lb, [Math.max(a.i + 1, b.i - 3), b.i - 1]);
  const barras = [
    { rot: la, v: va, txt: a.texto, q: c.local(p.palavras[a.i].s), y: 640 },
    { rot: lb, v: vb, txt: b.texto, q: c.local(p.palavras[b.i].s), y: 960 },
  ];
  const ganha = vb >= va ? 1 : 0;
  const ult = Math.max(...barras.map((x) => x.q));
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, Math.min(a.i, ...(s.la ? [s.la[0]] : [])) - 1), 7, 32)} y={330} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 66 }}
        cores={fx.cores} destaques={s.destaques} moldura={false} />
      {barras.map((x, k) => {
        const g = escrita(c.frame, x.q, 16);
        const larg = (W - 200) * (x.v / max) * g;
        const venc = k === ganha && c.frame > ult + 10;
        return (
          <React.Fragment key={k}>
            <div style={{ position: 'absolute', left: 100, top: x.y - 80, fontFamily: FONTEM.titulo, fontWeight: 700, fontSize: 42, color: fx.tinta, opacity: 0.85 }}>{x.rot}</div>
            <div style={{ position: 'absolute', left: 100, top: x.y, width: W - 200, height: 120, borderRadius: 16, background: fx.claro ? 'rgba(19,33,58,.08)' : 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'absolute', left: 100, top: x.y, width: larg, height: 120, borderRadius: 16,
              background: venc ? fx.acento : fx.claro ? FOLHA.tinta : 'rgba(255,255,255,.75)' }} />
            <div style={{ position: 'absolute', left: 130, top: x.y + 14, fontFamily: FONTEM.titulo, fontWeight: 900, fontSize: 80, lineHeight: 1,
              color: '#fff', opacity: clamp01((c.frame - x.q) / 4), fontVariantNumeric: 'tabular-nums' }}>
              {c.frame < x.q + 16 && valorDe(x.txt) !== null ? formata((valorDe(x.txt) ?? 0) * g, x.txt) : x.txt}</div>
          </React.Fragment>
        );
      })}
      <LegendaKaraoke blocos={emBlocos(faixa(p, Math.max(a.i, b.i) + 1, s.ate), 5, 24)} y={1200} estilo={frase(fx.claro)} cores={fx.cores} destaques={s.destaques} />
      <CarimboDaCena s={s} x={W - 260} y={ganha ? 1040 : 720} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

/** Contador grande com marca-texto (um número dito). */
const FolhaNumero: React.FC<{ s: CenaPart }> = ({ s }) => {
  if (s.b) return <FolhaDuelo s={s} />;
  return <FolhaContador s={s} />;
};

const FolhaContador: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const fx = useFolha();
  const ap = useApoio();
  const { width: W } = useVideoConfig();
  const a = s.a ?? { i: s.de, texto: limpa(p.palavras[s.de].t) };
  const qa = c.local(p.palavras[a.i].s);
  const alvo = valorDe(a.texto);
  const pr = janelaM(c.frame, qa - 16, qa, 'sai');
  const mostra = alvo !== null && c.frame < qa ? formata(alvo * pr, a.texto) : a.texto;
  const est = grande(a.texto, 280);
  const larg = Math.min(960, a.texto.length * est.tamanho * 0.6);
  const ultimo = Math.max(a.i, s.unidade ?? -1);
  const uni = s.unidade != null ? limpa(p.palavras[s.unidade].t).toUpperCase() : '';
  return (
    <AbsoluteFill>
      <Fundo />
      <LegendaKaraoke blocos={emBlocos(faixa(p, s.de, a.i - 1), 7, 32)} y={360} x={ap.x} largura={ap.largura} alinhar="centro" estilo={{ ...frase(fx.claro), tamanho: 70 }} cores={fx.cores} destaques={s.destaques} moldura={false} />
      <MarcaTexto x={W / 2 - larg / 2} y={640} w={larg} h={est.tamanho} q0={qa + 1} cor={fx.claro ? FOLHA.marca : PALETA.acento} dur={10} />
      <div style={{ position: 'absolute', left: 0, width: W, top: 620, textAlign: 'center', fontFamily: est.familia, fontWeight: 700, fontSize: est.tamanho, lineHeight: 1,
        color: fx.tinta, opacity: clamp01((c.frame - qa + 16) / 3), fontVariantNumeric: 'tabular-nums',
        transform: `scale(${c.frame >= qa ? 1 + 0.12 * (1 - mola(c.frame, 'estalo', qa)) : 1})` }}>{mostra}</div>
      {uni ? <div style={{ position: 'absolute', left: 0, width: W, top: 640 + est.tamanho, textAlign: 'center', fontFamily: FONTEM.mono, fontWeight: 700,
        fontSize: 54, letterSpacing: '0.12em', color: fx.acento, opacity: clamp01((c.frame - c.local(p.palavras[s.unidade!].s)) / 3) }}>{uni}</div> : null}
      <LegendaKaraoke blocos={emBlocos(faixa(p, ultimo + 1, s.ate), 5, 24)} y={1180} estilo={frase(fx.claro)} cores={fx.cores} destaques={s.destaques} realce={fx.claro ? 'marca' : 'moldura'} />
      <CarimboDaCena s={s} x={W / 2} y={1450} />
      <Bolha />
      <Assinatura />
    </AbsoluteFill>
  );
};

/** O carimbo da cena, se a partitura pediu (bate na palavra `em`). */
const CarimboDaCena: React.FC<{ s: CenaPart; x: number; y: number }> = ({ s, x, y }) => {
  const c = useCenaM();
  const { p } = usePart();
  if (!s.carimbo || !p.palavras[s.carimbo.em]) return null;
  return <Carimbo texto={s.carimbo.texto} x={x} y={y} q0={c.local(p.palavras[s.carimbo.em].s)} />;
};

/* ---------------- final: a chamada (4,8 s) ----------------
   tipo (vem de marca/marca.json ou da partitura):
     gatilho     "Comenta X": o comentário é digitado e a mensagem chega no direct (só quando há uma automação real respondendo)
     comentario  pergunta + "Deixe seu comentário" com a caixa de comentário e o cursor piscando
     seguir      "Siga para mais dicas": perfil com o botão Seguir virando "Seguindo ✓"
     quiz / aula / direct   título + subtítulo + selo "LINK NA BIO" ou "CHAMA NO DIRECT" */
export const FinalComentario: React.FC<{ claro: boolean }> = ({ claro }) => {
  const c = useCenaM();
  const { p } = usePart();
  const { width: W } = useVideoConfig();
  const f = c.frame - c.corteLocal;
  const tipo = p.final.tipo ?? (p.final.palavra ? 'gatilho' : 'comentario');
  const ent = mola(f, 'assenta', 0);
  const conta = p.marca?.handle ?? '';
  const tinta = claro ? FOLHA.tinta : '#fff';
  const acento = claro ? FOLHA.caneta : PALETA.acento;
  const titulo = (txt: string, y: number, atraso = 0) => {
    const e = mola(f, 'estalo', atraso);
    return <div style={{ position: 'absolute', left: 60, width: W - 120, top: y, textAlign: 'center', fontFamily: SERIFA, fontStyle: 'italic', fontWeight: 700,
      fontSize: txt.length > 26 ? 70 : 86, lineHeight: 1.1, color: tinta, opacity: clamp01(e * 1.2), transform: `translateY(${(1 - e) * 40}px)`, textWrap: 'balance' }}>{txt}</div>;
  };
  const sub = (txt: string, y: number, atraso = 10) => {
    const e = mola(f, 'assenta', atraso);
    return <div style={{ position: 'absolute', left: 80, width: W - 160, top: y, textAlign: 'center', fontFamily: FONTEM.titulo, fontWeight: 700, fontSize: 52,
      lineHeight: 1.2, color: acento, opacity: e, transform: `translateY(${(1 - e) * 30}px)`, textWrap: 'balance' }}>{txt}</div>;
  };
  const selo = (txt: string, y: number, atraso = 22) => {
    const e = mola(f, 'estalo', atraso);
    const pulsa = 1 + 0.04 * Math.sin(Math.max(0, f - atraso) / 5);
    return <div style={{ position: 'absolute', left: W / 2 - 300, width: 600, top: y, height: 110, borderRadius: 55, background: acento,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 40, letterSpacing: '0.08em',
      color: claro ? '#fff' : FOLHA.tinta, boxShadow: '0 16px 40px rgba(0,0,0,.35)', transform: `scale(${e * pulsa})` }}>{txt}</div>;
  };
  const caixaComentario = (texto: string, digitadas: number, publicou: boolean, y: number) => (
    <div style={{ position: 'absolute', left: 70, width: W - 140, top: y, height: 130, borderRadius: 66, background: '#fff', boxShadow: '0 16px 40px rgba(0,0,0,.25)',
      display: 'flex', alignItems: 'center', padding: '0 36px', gap: 24, opacity: ent, transform: `translateY(${(1 - ent) * 40}px)` }}>
      <div style={{ width: 74, height: 74, borderRadius: 37, background: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)' }} />
      <div style={{ flex: 1, fontFamily: FONTEM.titulo, fontWeight: 700, fontSize: 46, color: digitadas ? '#111' : '#999' }}>
        {digitadas ? texto.slice(0, digitadas) : 'Adicione um comentário...'}
        {!publicou && Math.floor(f / 8) % 2 === 0 ? <span style={{ color: '#2F80ED' }}>|</span> : null}</div>
      <div style={{ fontFamily: FONTEM.titulo, fontWeight: 800, fontSize: 38, color: publicou ? '#999' : '#2F80ED' }}>Publicar</div>
    </div>
  );
  let miolo: React.ReactNode = null;
  if (tipo === 'gatilho') {
    const palavra = (p.final.palavra || 'QUERO').toUpperCase();
    const digitadas = Math.min(palavra.length, Math.max(0, Math.floor((f - 14) / 3)));
    const publicou = f >= 14 + palavra.length * 3 + 8;
    const qDm = 14 + palavra.length * 3 + 26;
    const dm = mola(f, 'estalo', qDm);
    miolo = (
      <>
        {titulo(`Comenta “${palavra}”`, 520)}
        {caixaComentario(palavra, digitadas, publicou, 720)}
        {f >= qDm ? (
          <div style={{ position: 'absolute', left: 70, width: W - 140, top: 920, borderRadius: 34, background: claro ? FOLHA.tinta : '#fff',
            padding: '30px 36px', boxShadow: '0 20px 50px rgba(0,0,0,.35)', transform: `translateY(${(1 - dm) * -60}px) scale(${0.9 + 0.1 * dm})`, opacity: dm }}>
            <div style={{ fontFamily: FONTEM.mono, fontSize: 28, letterSpacing: '0.08em', color: claro ? FOLHA.marca : PALETA.acento }}>{`DIRECT · ${conta}`}</div>
            <div style={{ fontFamily: FONTEM.titulo, fontWeight: 700, fontSize: 46, lineHeight: 1.2, marginTop: 10, color: claro ? '#fff' : '#111' }}>
              {p.final.sub || 'Te mandei o link aqui no direct!'}</div>
          </div>
        ) : null}
      </>
    );
  } else if (tipo === 'comentario') {
    // a seta aponta para a caixa vazia: o convite é para a pessoa escrever
    const seta = mola(f, 'estalo', 24);
    miolo = (
      <>
        {titulo(p.final.titulo || 'Você concorda?', 500)}
        {sub(p.final.sub || 'Deixe seu comentário', 700)}
        {caixaComentario('', 0, false, 880)}
        <div style={{ position: 'absolute', left: W / 2 - 40, top: 1040 + 12 * Math.sin(f / 6), fontSize: 80, color: acento, opacity: seta, transform: `scale(${seta}) rotate(180deg)` }}>▼</div>
      </>
    );
  } else if (tipo === 'seguir') {
    const clicou = f >= 60;
    const clique = mola(f, 'estalo', 60);
    miolo = (
      <>
        {titulo(p.final.titulo || 'Siga para mais dicas', 500)}
        <div style={{ position: 'absolute', left: 70, width: W - 140, top: 780, height: 170, borderRadius: 30, background: '#fff', boxShadow: '0 16px 40px rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', padding: '0 34px', gap: 26, opacity: ent, transform: `translateY(${(1 - ent) * 40}px)` }}>
          <div style={{ width: 110, height: 110, borderRadius: 55, background: FOLHA.tinta, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {p.marca?.logo ? <Img src={staticFile(p.marca.logo)} style={{ width: 96 }} /> : <span style={{ color: '#fff', fontWeight: 900, fontSize: 52, fontFamily: FONTEM.titulo }}>{(p.marca?.nome ?? '?').slice(0, 1)}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTEM.titulo, fontWeight: 800, fontSize: 40, color: '#111' }}>{conta.replace('@', '')}</div>
            <div style={{ fontFamily: FONTEM.titulo, fontWeight: 500, fontSize: 30, color: '#777' }}>{p.marca?.nome ?? ''}</div>
          </div>
          <div style={{ padding: '18px 34px', borderRadius: 16, fontFamily: FONTEM.titulo, fontWeight: 800, fontSize: 36,
            background: clicou ? '#EFEFEF' : '#0095F6', color: clicou ? '#111' : '#fff', transform: `scale(${clicou ? 1 + 0.12 * (1 - clique) : 1})` }}>
            {clicou ? 'Seguindo ✓' : 'Seguir'}</div>
        </div>
        {sub(p.final.sub || 'Toda semana tem conteúdo novo', 1020, 70)}
      </>
    );
  } else {
    const rotulo = tipo === 'direct' ? 'CHAMA NO DIRECT' : 'LINK NA BIO';
    miolo = (
      <>
        {titulo(p.final.titulo || 'Quer saber mais?', 520)}
        {sub(p.final.sub || '', 760)}
        {selo(rotulo, 960)}
      </>
    );
  }
  return (
    <AbsoluteFill>
      {claro ? <FundoPapel /> : <FundoM brilho={[50, 45]} />}
      <LogoMarca marca={p.marca} x={W / 2} y={300} largura={480} cor={tinta} opacidade={ent} />
      {miolo}
    </AbsoluteFill>
  );
};

/* ---------------- despacho ---------------- */
export const TIPOS_FOLHA: Record<string, React.FC<{ s: CenaPart }>> = {
  fala: FolhaFala,
  dividido: FolhaFala,
  heroi: FolhaHeroi,
  slam: FolhaSlam,
  citacao: FolhaDocumento,
  contraste: FolhaContraste,
  documento: FolhaDocumento,
  chips: FolhaChips,
  lista: FolhaChips,
  passos: FolhaPassos,
  duelo: FolhaDuelo,
  numero: FolhaNumero,
};
