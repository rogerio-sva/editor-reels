/* =====================================================================================
   biblioteca/moldura.tsx: modelo "Moldura Pop" .
   A pessoa numa moldura arredondada com borda brilhante e a CABEÇA SAINDO PELA BORDA DE CIMA (o recorte da
   pessoa, Vision do Mac, por cima da moldura, mostrado só acima da borda). Em volta, o que a fala pede:
     fala        só a moldura + legenda karaokê embaixo
     heroi/slam  letreiro gigante ATRÁS da cabeça (a cabeça passa na frente das letras)
     chips/lista pílulas que entram nas laterais, uma por item, quando é dito
     numero      selo redondo no canto da moldura com o número contando
     documento   cartão de papel que sobe sobre a parte de baixo da moldura
   Precisa de `p.recorte` (webm com transparência) e do vídeo vertical 1080x1920 (scripts/reel/preparar.mjs prepara).
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { useCenaM } from '../cena';
import { clamp01, FONTEM, janelaM, mola, PALETA, RGB, TIPOM } from '../tema';
import { FundoM, Poeira } from '../visual';
import { emBlocos, faixa, formata, limpa, textoGrande, usePart, valorDe } from './cenas';
import { Carimbo, CORES_ESCURO, FOLHA, LegendaKaraoke, SERIFA } from './efeitos';
import type { CenaPart } from './tipos';

/* geometria da moldura (tela 1080x1920) */
const MX = 90, MY = 620, MW = 900, MH = 820, RAIO = 56;

/** Escala e posição do vídeo vertical inteiro (1080x1920) para o ROSTO MEDIDO (props.rosto) ter ~300 px
    de altura com a testa cruzando a borda de cima (o "pop"). Sem medida, supõe rosto em 36% da altura e 14% de tamanho. */
const useEnquadre = () => {
  const { p } = usePart();
  const r = p.rosto ?? { x: 0.5, y: 0.36, h: 0.14 };
  // nunca menor que a largura da moldura (sobrava preto dos lados num rosto de webcam bem perto)
  const K = Math.max((MW + 40) / 1080, Math.min(1.6, 300 / (r.h * 1920)));
  const hf = r.h * 1920 * K;
  const cy = MY - 120 + 0.35 * hf + hf / 2;
  return { K, VX: MX + MW / 2 - r.x * 1080 * K, VY: cy - r.y * 1920 * K };
};

const Pessoa: React.FC<{ camada: 'fundo' | 'cabeca' }> = ({ camada }) => {
  const c = useCenaM();
  const { p } = usePart();
  const { K, VX, VY } = useEnquadre();
  const respira = 1 + 0.015 * Math.sin(c.global / 40);
  const estilo: React.CSSProperties = { position: 'absolute', left: VX, top: VY, width: 1080 * K, height: 1920 * K, transform: `scale(${respira})`, transformOrigin: '50% 30%' };
  if (camada === 'fundo') {
    return (
      <div style={{ position: 'absolute', left: MX, top: MY, width: MW, height: MH, borderRadius: RAIO, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -MX, top: -MY, width: 1080, height: 1920 }}>
          {/* a própria gravação desfocada por trás: nunca sobra preto se o enquadre não cobrir a moldura */}
          <OffthreadVideo src={staticFile(p.video)} muted startFrom={c.seqInicio}
            style={{ position: 'absolute', left: 0, top: MY - 200, width: 1080, height: 1920, objectFit: 'cover', filter: 'blur(30px) brightness(.6)', transform: 'scale(1.2)' }} />
          <OffthreadVideo src={staticFile(p.video)} muted startFrom={c.seqInicio} style={estilo} />
        </div>
      </div>
    );
  }
  if (!p.recorte) return null;
  // a cabeça: só a parte do recorte que fica ACIMA da borda de cima (com 40 px de folga para dentro) e na largura da moldura
  return (
    <div style={{ position: 'absolute', left: MX - 40, top: 0, width: MW + 80, height: MY + 40, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -(MX - 40), top: 0, width: 1080, height: 1920 }}>
        <OffthreadVideo src={staticFile(p.recorte)} muted transparent startFrom={c.seqInicio} style={estilo} />
      </div>
    </div>
  );
};

const Borda: React.FC = () => {
  const c = useCenaM();
  const giro = (c.global * 2) % 360;
  return (
    <>
      <div style={{ position: 'absolute', left: MX - 6, top: MY - 6, width: MW + 12, height: MH + 12, borderRadius: RAIO + 6,
        background: `conic-gradient(from ${giro}deg, ${PALETA.acento}, ${PALETA.acentoClaro}, #fff, ${PALETA.acento}, ${PALETA.acentoClaro}, ${PALETA.acento})`,
        boxShadow: `0 0 50px rgba(${RGB.acento},.45), 0 30px 80px rgba(0,0,0,.6)` }} />
      <div style={{ position: 'absolute', left: MX, top: MY, width: MW, height: MH, borderRadius: RAIO, background: '#000' }} />
    </>
  );
};

const Legenda: React.FC<{ s: CenaPart; de?: number; ate?: number }> = ({ s, de, ate }) => {
  const { p } = usePart();
  return <LegendaKaraoke blocos={emBlocos(faixa(p, de ?? s.de, ate ?? s.ate), 5, 22)} y={1475} estilo={{ ...TIPOM.frase, tamanho: 76 }} cores={CORES_ESCURO}
    destaques={s.destaques} circulo={s.circulo} />;
};

/** Monta a cena: fundo → o que fica ATRÁS da cabeça → moldura com o vídeo → cabeça → o que fica NA FRENTE. */
const Palco: React.FC<{ atras?: React.ReactNode; frente?: React.ReactNode; s: CenaPart; legenda?: React.ReactNode }> = ({ atras, frente, s, legenda }) => {
  const c = useCenaM();
  const { p } = usePart();
  const ent = mola(c.frame, 'assenta', c.corteLocal);
  return (
    <AbsoluteFill>
      <FundoM brilho={[50, 40]} grade={0.5} />
      <Poeira semente={`moldura-${c.n}`} />
      {atras}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - ent) * 40}px) scale(${0.97 + 0.03 * ent})`, transformOrigin: '50% 60%' }}>
        <Borda />
        <Pessoa camada="fundo" />
        <Pessoa camada="cabeca" />
      </div>
      {frente}
      {legenda ?? <Legenda s={s} />}
      {s.carimbo && p.palavras[s.carimbo.em] ? <Carimbo texto={s.carimbo.texto} x={560} y={1330} q0={c.local(p.palavras[s.carimbo.em].s)} cor={PALETA.acento} tamanho={70} /> : null}
    </AbsoluteFill>
  );
};

const MolduraFala: React.FC<{ s: CenaPart }> = ({ s }) => <Palco s={s} />;

/** Letreiro gigante atrás da cabeça. */
const MolduraLetreiro: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const { width: W } = useVideoConfig();
  const hi = s.palavra ?? s.grande ?? s.ate;
  const g = faixa(p, hi, hi);
  const txt = textoGrande(g[0], s.texto);
  const q = c.local(g[0].s);
  const m = mola(c.frame, 'estalo', q);
  const tam = Math.round(Math.min(250, 1000 / (Math.max(1, txt.length) * 0.78)));
  const atras = c.frame >= q - 2 ? (
    <div style={{ position: 'absolute', left: 0, width: W, top: 330 - tam * 0.2, textAlign: 'center', fontFamily: SERIFA, fontStyle: 'italic', fontWeight: 700,
      fontSize: tam, lineHeight: 1, letterSpacing: '-0.02em', color: PALETA.acento, textShadow: `0 0 40px rgba(${RGB.acento},.5)`,
      opacity: clamp01((c.frame - q + 2) / 3), transform: `scale(${1 + 0.4 * (1 - m)})` }}>{txt}</div>
  ) : null;
  return <Palco s={s} atras={atras} />;
};

/** Pílulas que entram nas laterais, uma por item, quando o item é dito. */
const MolduraChips: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const itens = (s.itens ?? []).slice(0, 4);
  const lugares = [[40, 380, -4], [600, 450, 3], [40, 1210, 2], [560, 1290, -3]];
  const frente = (
    <>
      {itens.map(([a, b], k) => {
        const ws = faixa(p, a, b);
        const q = c.local(ws[0].s) - 2;
        if (c.frame < q) return null;
        const e = mola(c.frame, 'estalo', q);
        const [x, y, g] = lugares[k];
        const texto = ws.map((w) => w.t).join(' ').replace(/[.,;:]$/, '');
        return (
          <div key={k} style={{ position: 'absolute', left: x, top: y, maxWidth: 480, padding: '18px 30px', borderRadius: 40, background: '#fff',
            boxShadow: `0 12px 30px rgba(0,0,0,.4), 0 0 0 4px ${PALETA.acento}`, transform: `rotate(${g}deg) scale(${e})`, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 30, color: PALETA.acento }}>{String(k + 1).padStart(2, '0')}</span>
            <span style={{ fontFamily: FONTEM.titulo, fontWeight: 800, fontSize: texto.length > 26 ? 34 : 42, lineHeight: 1.1, color: FOLHA.tinta }}>{texto}</span>
          </div>
        );
      })}
    </>
  );
  return <Palco s={s} frente={frente} />;
};

/** Selo redondo no canto da moldura com o número contando. */
const MolduraNumero: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const a = s.b ?? s.a ?? { i: s.de, texto: limpa(p.palavras[s.de].t) };
  const qa = c.local(p.palavras[a.i].s);
  const alvo = valorDe(a.texto);
  const pr = janelaM(c.frame, qa - 16, qa, 'sai');
  const mostra = alvo !== null && c.frame < qa ? formata(alvo * pr, a.texto) : a.texto;
  const uni = s.unidade != null ? limpa(p.palavras[s.unidade].t).toUpperCase() : '';
  const e = mola(c.frame, 'estalo', qa - 16);
  const frente = c.frame >= qa - 16 ? (
    <div style={{ position: 'absolute', left: 700, top: 1140, width: 320, height: 320, borderRadius: 160, background: PALETA.acento,
      boxShadow: `0 0 0 10px rgba(255,255,255,.9), 0 20px 50px rgba(0,0,0,.5)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: `rotate(-8deg) scale(${e})` }}>
      <div style={{ fontFamily: TIPOM.gigante.familia, fontWeight: 900, fontSize: mostra.length > 4 ? 84 : 120, lineHeight: 1, color: FOLHA.tinta, fontVariantNumeric: 'tabular-nums' }}>{mostra}</div>
      {uni ? <div style={{ fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 32, letterSpacing: '0.1em', color: FOLHA.tinta }}>{uni}</div> : null}
    </div>
  ) : null;
  return <Palco s={s} frente={frente} />;
};

/** Cartão de papel que sobe sobre a parte de baixo da moldura com o texto falado. */
const MolduraDocumento: React.FC<{ s: CenaPart }> = ({ s }) => {
  const c = useCenaM();
  const { p } = usePart();
  const e = mola(c.frame, 'assenta', c.corteLocal + 6);
  const frente = (
    <div style={{ position: 'absolute', left: 120, top: 1010, width: 840, height: 520, background: FOLHA.papelDoc, borderRadius: 18, transform: `translateY(${(1 - e) * 400}px) rotate(-1.5deg)`,
      boxShadow: '0 -10px 40px rgba(0,0,0,.45)', padding: '30px 40px', boxSizing: 'border-box' }}>
      <div style={{ fontFamily: FONTEM.mono, fontWeight: 700, fontSize: 28, letterSpacing: '0.08em', color: FOLHA.tinta, borderBottom: `3px solid ${FOLHA.tinta}`, paddingBottom: 10 }}>
        {(s.rotulo || 'ANOTAÇÃO').toUpperCase()}</div>
    </div>
  );
  const legenda = (
    <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - e) * 400}px) rotate(-1.5deg)` }}>
      <LegendaKaraoke blocos={[faixa(p, s.de, s.ate).slice(0, 30)]} y={1110} x={170} alinhar="esquerda" largura={740}
        estilo={{ ...TIPOM.frase, familia: SERIFA, peso: 400, tamanho: 48, tracking: -0.005, entrelinha: 1.25 }}
        cores={{ dita: FOLHA.tinta, proxima: FOLHA.apagada, chave: FOLHA.caneta }} destaques={s.destaques} realce="marca" />
    </div>
  );
  return <Palco s={s} frente={frente} legenda={legenda} />;
};

export const TIPOS_MOLDURA: Record<string, React.FC<{ s: CenaPart }>> = {
  fala: MolduraFala,
  dividido: MolduraFala,
  citacao: MolduraDocumento,
  documento: MolduraDocumento,
  heroi: MolduraLetreiro,
  slam: MolduraLetreiro,
  contraste: MolduraLetreiro,
  chips: MolduraChips,
  lista: MolduraChips,
  passos: MolduraChips,
  numero: MolduraNumero,
  duelo: MolduraNumero,
};
