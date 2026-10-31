/* =====================================================================================
   Blocos do estilo editorial. Cada um é um cartão preso a uma palavra (b.t0 = a palavra, b.t1 =
   a saída) e recebe o tempo atual em segundos. Nenhum usa número de quadro fixo.
   Lista e parâmetros: skill/references/estilos/editorial/ESTILO.md (seção "Blocos").
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from 'remotion';
import { evolvePath } from '@remotion/paths';
import type { BlocoAgenda } from '../agenda.mjs';
import { FE, medirTexto } from '../comum/FontesEstilos';
import { clamp, eio, eout, janela, lerp, partes, rng, volta } from '../comum/util';
import { ICONES } from '../quadro/icones';
import { MEDIDAS, type Paleta } from './tema';

export type Ctx = { t: number; pal: Paleta; video: string; filtro: string; miniaturas: string[]; recorte: boolean; palavras: { t: string; s: number; e: number }[] };
type P = { b: BlocoAgenda; c: Ctx };

const s = (b: BlocoAgenda, k: string, padrao: string) => (typeof b[k] === 'string' ? (b[k] as string) : padrao);
/** texto de campo que não aceita *itálico*: os asteriscos não aparecem */
const sa = (b: BlocoAgenda, k: string, padrao: string) => s(b, k, padrao).replace(/\*/g, '');
const n = (b: BlocoAgenda, k: string, padrao: number) => (typeof b[k] === 'number' ? (b[k] as number) : padrao);
const lista = <T,>(b: BlocoAgenda, k: string, padrao: T[]) => (Array.isArray(b[k]) ? (b[k] as T[]) : padrao);

/** entrada (0→1) e saída (0→1) padrão de um bloco */
const fases = (b: BlocoAgenda, t: number, ent = 0.35, sai = 0.3) => ({
  e: eout((t - b.t0) / ent),
  s: eio((t - (b.t1 - sai)) / sai),
  vivo: t >= b.t0 && t < b.t1,
});

/** texto com *itálico* em ouro */
const Rico: React.FC<{ txt: string; ouro: string; italicoMaior?: number }> = ({ txt, ouro, italicoMaior = 1 }) => (
  <>
    {partes(txt).map((p, i) =>
      p.it ? (
        <span key={i} style={{ fontStyle: 'italic', color: ouro, fontSize: `${italicoMaior}em`, letterSpacing: 0 }}>{p.txt}</span>
      ) : (
        <span key={i}>{p.txt}</span>
      ),
    )}
  </>
);

const tc = (seg: number) => {
  const m = Math.floor(seg / 60), ss = seg - m * 60;
  return `${String(m).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`;
};

/* ------------------------------------------------------------------ 1. título atrás da pessoa */
export const TituloAtras: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  if (t < b.t0 || t >= b.t1) return null;
  const linhas = lista<string>(b, 'linhas', ['TÍTULO']);
  const y0 = n(b, 'y', 360);
  const base = n(b, 'tam', MEDIDAS.tituloAtras);
  return (
    <>
      {linhas.map((l, i) => {
        // mede cada parte na fonte em que ela sai: o itálico é mais largo e sai sem o tracking negativo (ver Rico).
        // A largura alvo já desconta o zoom da câmera (até ~1,1x), para nunca encostar na borda.
        const larg = partes(l).reduce((a, p) => a + medirTexto(p.txt, `${p.it ? 'italic ' : ''}${base}px "${FE.serif}"`) - (p.it ? 0 : base * 0.02 * p.txt.length), 0);
        const tam = Math.min(base, (base * MEDIDAS.tituloAtrasLargura) / Math.max(1, larg));
        const alt = tam * 1.02;
        const y = y0 + i * base * 0.94;
        const ent = eout((t - b.t0 - 0.08 * i) / 0.5);
        const sai = eio((t - (b.t1 - 0.4) - 0.05 * i) / 0.38);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y - tam * 0.28, height: alt * 1.08 + tam * 0.28, paddingTop: tam * 0.28, overflow: 'hidden' }}>
            <div style={{
              textAlign: 'center', fontFamily: FE.serif, fontSize: tam, lineHeight: `${alt}px`, color: pal.creme,
              letterSpacing: -tam * 0.02, whiteSpace: 'nowrap', transform: `translateY(${(1 - ent) * alt * 1.05 - sai * alt * 1.05}px)`,
            }}>
              <Rico txt={l} ouro={pal.ouro} />
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ 2. manchete (título na frente, no alto) */
export const Manchete: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t);
  if (!f.vivo) return null;
  const texto = s(b, 'texto', 'Manchete');
  const tam = n(b, 'tam', MEDIDAS.manchete);
  const pal_ = texto.split(' ');
  // cada palavra da manchete entra quando é dita (se ela estiver na fala a partir do bloco); senão, em cascata
  const norm = (w: string) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  let busca = c.palavras.findIndex((p) => p.s >= b.palavra.s - 0.01);
  const quando = pal_.map((w, i) => {
    const k = busca < 0 ? -1 : c.palavras.findIndex((p, j) => j >= busca && j < busca + 6 && norm(p.t) === norm(w));
    if (k >= 0) { busca = k + 1; return c.palavras[k].s - 0.07; }
    return b.t0 + i * 0.09;
  });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: n(b, 'y', 170), textAlign: 'center', fontFamily: FE.serif, fontSize: tam,
      lineHeight: 1.0, color: pal.creme, textShadow: '0 6px 30px rgba(0,0,0,.45)', opacity: 1 - f.s, transform: `translateY(${-f.s * 40}px)` }}>
      {pal_.map((w, i) => {
        const k = eout((t - quando[i]) / 0.3);
        const it = w.startsWith('*');
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: tam * 0.22, opacity: k, filter: `blur(${(1 - k) * 10}px)`,
            transform: `translateY(${(1 - k) * 36}px)`, fontStyle: it ? 'italic' : 'normal', color: it ? pal.ouro : pal.creme }}>
            {w.replace(/\*/g, '')}
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ 3. cupom de instrução */
const serrilha = (w: number, h: number, dente = 16, alt = 8) => {
  const pts: string[] = [];
  for (let x = 0; x <= w; x += dente) pts.push(`${x}px ${(x / dente) % 2 ? alt : 0}px`);
  for (let x = w; x >= 0; x -= dente) pts.push(`${x}px ${h - ((x / dente) % 2 ? alt : 0)}px`);
  return `polygon(${pts.join(',')})`;
};
export const Cupom: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  if (t < b.t0 || t >= b.t1) return null;
  const W = 620;
  const texto = sa(b, 'texto', 'DEIXA MAIS CINEMATOGRÁFICO.').toUpperCase();
  const linhasTxt = Math.ceil(texto.length / 22);
  const H = 300 + 54 * Math.min(3, linhasTxt);
  const ent = volta((t - b.t0) / 0.42, 1.2);
  const sai = eio((t - (b.t1 - 0.35)) / 0.35);
  const dg = b.digita ?? { t0: b.t0 + 0.3, t1: b.t0 + 1 };
  const nLetras = b.letras ? b.letras.filter((x) => x <= t).length : Math.floor(clamp((t - dg.t0) / (dg.t1 - dg.t0)) * texto.length);
  const cursor = Math.floor(t * 4) % 2 === 0 && t < dg.t1 + 0.4;
  const total = eout((t - dg.t1 - 0.1) / 0.25);
  const mono = { fontFamily: FE.mono, color: pal.tinta } as const;
  const y = n(b, 'y', MEDIDAS.cartaoTopo);
  const prog = clamp((t - b.t0) / (b.t1 - b.t0));
  return (
    <div style={{ position: 'absolute', left: 540 - W / 2 + 10, top: y, width: W,
      transform: `translateY(${(1 - ent) * -700 - sai * 760}px) rotate(${-2 + (1 - clamp(ent)) * 5}deg)`, filter: `drop-shadow(${MEDIDAS.sombra})` }}>
      <div style={{ width: W, height: H, background: pal.papel, clipPath: serrilha(W, H), padding: '38px 40px', boxSizing: 'border-box' }}>
        <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
          <span>{s(b, 'rotulo', 'INSTRUÇÃO')}</span><span>{String(n(b, 'numero', 1)).padStart(2, '0')}</span>
        </div>
        <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: pal.cinza, marginTop: 4, letterSpacing: 1 }}>
          <span>{tc(b.palavra.s)}</span><span>{s(b, 'para', 'PARA O CLAUDE')}</span>
        </div>
        <div style={{ borderTop: `3px dotted ${pal.cinza}`, margin: '16px 0 18px' }} />
        <div style={{ ...mono, fontSize: 46, lineHeight: '54px', fontWeight: 700, letterSpacing: 1, minHeight: 54 * Math.min(3, linhasTxt) }}>
          {texto.slice(0, nLetras)}
          <span style={{ opacity: cursor ? 1 : 0 }}>▌</span>
        </div>
        <div style={{ borderTop: `3px dotted ${pal.cinza}`, margin: '18px 0 12px' }} />
        <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, letterSpacing: 3, opacity: total }}>
          <span>TOTAL</span><span>{s(b, 'total', '1 FRASE')}</span>
        </div>
      </div>
      {/* régua de tempo verde sob o cupom, como na referência */}
      <div style={{ margin: '-4px auto 0', width: W - 30, height: 34, borderRadius: 17, background: pal.verde, position: 'relative',
        boxShadow: '0 8px 18px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        {Array.from({ length: 34 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: 20 + i * 16.5, top: 9, width: 2, height: i % 4 ? 8 : 14, background: pal.creme, opacity: 0.55 }} />
        ))}
        <div style={{ position: 'absolute', left: 16, top: 24, height: 3, width: (W - 70) * prog, background: pal.ouro, borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 12 + (W - 70) * prog, top: 19, width: 12, height: 12, borderRadius: 6, background: pal.ouro }} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ 4. apps riscados */
type App = { nome: string; icone?: string; cor?: string };
const APPS_PADRAO: App[] = [
  { nome: 'Notas', icone: 'documento', cor: '#E9B949' },
  { nome: 'CapCut', icone: 'tesoura', cor: '#1B1B1B' },
  { nome: 'Edits', icone: 'claquete', cor: '#5B4BDB' },
  { nome: 'Arquivos', icone: 'pasta', cor: '#3D7BE0' },
];
const Glifo: React.FC<{ nome: string; tam: number; cor?: string; peso?: number }> = ({ nome, tam, cor = '#fff', peso = 2 }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={peso} strokeLinecap="round" strokeLinejoin="round">
    {(ICONES[nome] ?? ICONES.janela).map((d, i) => <path key={i} d={d} />)}
  </svg>
);
export const Apps: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.4);
  if (!f.vivo) return null;
  const apps = lista<App>(b, 'apps', APPS_PADRAO);
  const riscos = b.riscos ?? [];
  const fim = b.fimEm ?? null;
  const textoFim = (b.fim as { texto?: string } | undefined)?.texto ?? 'nada.';
  const W = 720, H = 250, TILE = 124;
  const vivos = apps.map((a) => {
    const r = riscos.find((x) => x.app === a.nome);
    return r ? 1 - eio((t - r.t - 0.28) / 0.3) : 1;
  });
  const somaVivos = vivos.reduce((a, v) => a + v, 0);
  const kFim = fim !== null ? eout((t - fim) / 0.35) : 0;
  let x = (W - (somaVivos * (TILE + 36) - 36)) / 2;
  return (
    <div style={{ position: 'absolute', left: 540 - W / 2, top: n(b, 'y', MEDIDAS.cartaoTopo + 20), width: W, height: H, background: pal.papel,
      borderRadius: 30, boxShadow: MEDIDAS.sombra, transform: `translateY(${(1 - f.e) * -500 - f.s * 600}px) scale(${0.9 + 0.1 * f.e})`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 30, right: 30, top: 18, display: 'flex', justifyContent: 'space-between', fontFamily: FE.mono,
        fontSize: 22, letterSpacing: 2, color: pal.cinza }}>
        <span>{sa(b, 'titulo', 'TELA DE INÍCIO')}</span><span>{Math.round(somaVivos)} APPS</span>
      </div>
      <div style={{ opacity: 1 - kFim }}>
        {apps.map((a, i) => {
          const v = vivos[i];
          const r = riscos.find((q) => q.app === a.nome);
          const risco = r ? eout((t - r.t) / 0.22) : 0;
          const treme = r && t > r.t && t < r.t + 0.28 ? Math.sin(t * 90) * 5 : 0;
          const left = x;
          x += v * (TILE + 36);
          if (v <= 0.01) return null;
          return (
            <div key={a.nome} style={{ position: 'absolute', left: left + treme, top: 62, width: TILE, textAlign: 'center',
              transform: `scale(${v})`, transformOrigin: '50% 40%', opacity: v }}>
              <div style={{ width: TILE, height: TILE, borderRadius: 30, background: a.cor ?? '#333', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.18)' }}>
                <Glifo nome={a.icone ?? 'janela'} tam={66} />
              </div>
              <div style={{ fontFamily: FE.sans, fontSize: 24, fontWeight: 600, color: pal.tinta, marginTop: 6 }}>{a.nome}</div>
              {risco > 0 ? (
                <svg width={TILE + 40} height={TILE + 40} style={{ position: 'absolute', left: -20, top: -20 }}>
                  <path d={`M10 10 L${TILE + 30} ${TILE + 30}`} stroke={pal.vermelho} strokeWidth={10} strokeLinecap="round"
                    strokeDasharray={evolvePath(risco, `M10 10 L${TILE + 30} ${TILE + 30}`).strokeDasharray}
                    strokeDashoffset={evolvePath(risco, `M10 10 L${TILE + 30} ${TILE + 30}`).strokeDashoffset} />
                </svg>
              ) : null}
            </div>
          );
        })}
      </div>
      {kFim > 0 ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FE.serif,
          fontStyle: 'italic', fontSize: 104, color: pal.tinta, opacity: kFim, transform: `translateY(${(1 - kFim) * 20}px)` }}>
          {textoFim.replace(/\*/g, '')}
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ 5. miniaturas (grade atrás ou calendário) */
const Mini: React.FC<{ src: string; w: number; h: number; semente: number; filtro?: string }> = ({ src, w, h, semente, filtro }) => {
  const r = rng(semente);
  const zoom = 1.1 + r() * 0.5;
  const ox = (r() - 0.5) * 30, oy = (r() - 0.5) * 20;
  return (
    <div style={{ width: w, height: h, overflow: 'hidden', borderRadius: 14, background: '#111', boxShadow: '0 8px 18px rgba(0,0,0,.35)' }}>
      <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: 'cover', transform: `scale(${zoom}) translate(${ox}%, ${oy}%)`,
        filter: filtro ?? `brightness(${1.15 + r() * 0.25}) saturate(${0.8 + r() * 0.5}) hue-rotate(${(r() - 0.5) * 40}deg)` }} />
    </div>
  );
};
export const Miniaturas: React.FC<P> = ({ b, c }) => {
  const { t, pal, miniaturas } = c;
  const f = fases(b, t, 0.3);
  if (!f.vivo || miniaturas.length === 0) return null;
  const modo = s(b, 'modo', 'atras');
  if (modo === 'calendario') {
    const cols = 4, w = 210, h = 290, gap = 20;
    const dias = 16;
    const titulo = sa(b, 'titulo', 'DESSE AQUI');
    return (
      <AbsoluteFill style={{ background: pal.verde, opacity: 1 - f.s }}>
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontFamily: FE.serif, fontSize: 120, color: pal.creme,
          letterSpacing: -2 }}>{titulo}</div>
        {Array.from({ length: dias }, (_, i) => {
          const cx = 540 - (cols * w + (cols - 1) * gap) / 2 + (i % cols) * (w + gap);
          const cy = 380 + Math.floor(i / cols) * (h + gap);
          const k = eout((t - b.t0 - 0.05 * i) / 0.25);
          const tem = i < Math.min(dias - 3, Math.floor((t - b.t0) / 0.06));
          return (
            <div key={i} style={{ position: 'absolute', left: cx, top: cy, width: w, height: h, borderRadius: 14, border: `2px solid ${pal.creme}22` }}>
              <div style={{ position: 'absolute', right: 12, bottom: 8, fontFamily: FE.mono, fontSize: 28, color: `${pal.creme}66` }}>{String(i + 1).padStart(2, '0')}</div>
              {tem ? <div style={{ transform: `scale(${0.6 + 0.4 * k})`, opacity: k }}><Mini src={miniaturas[i % miniaturas.length]} w={w} h={h} semente={i * 7 + 1} /></div> : null}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  // atrás da pessoa: duas linhas de 4 caindo em cascata
  const w = 230, h = 330, gap = 22;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const col = i % 4, lin = Math.floor(i / 4);
        const k = eout((t - b.t0 - 0.06 * i) / 0.4);
        const x = 540 - (4 * w + 3 * gap) / 2 + col * (w + gap);
        const y = n(b, 'y', 170) + lin * (h + gap);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `translateY(${(1 - k) * -260 - f.s * 900}px) rotate(${(1 - k) * (col - 1.5) * 6}deg)`,
            opacity: clamp(k * 1.5) }}>
            <Mini src={miniaturas[i % miniaturas.length]} w={w} h={h} semente={i * 13 + 5} />
          </div>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ 6. mockup de celular */
export const Celular: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.45);
  if (!f.vivo) return null;
  const W = 600, H = 1240;
  const k = volta((t - b.t0) / 0.5, 1.1);
  return (
    <AbsoluteFill style={{ background: pal.verde, opacity: 1 - f.s }}>
      <div style={{ position: 'absolute', left: 540 - W / 2, top: 960 - H / 2 - 40, width: W, height: H, borderRadius: 86, background: pal.papel,
        padding: 18, boxSizing: 'border-box', boxShadow: '0 40px 80px rgba(0,0,0,.45)', transform: `scale(${0.75 + 0.25 * k}) rotate(${(1 - clamp(k)) * -6}deg)` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 70, overflow: 'hidden', position: 'relative', background: '#000' }}>
          {c.video ? <OffthreadVideo src={staticFile(c.video)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: c.filtro }} /> : null}
          <div style={{ position: 'absolute', top: 22, left: '50%', marginLeft: -70, width: 140, height: 38, borderRadius: 19, background: '#000' }} />
          <div style={{ position: 'absolute', bottom: 26, left: 40, right: 40, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.35)' }}>
            <div style={{ width: `${clamp((t - b.t0) / (b.t1 - b.t0)) * 100}%`, height: 6, borderRadius: 3, background: '#fff' }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 7. tela de roteiro de filme */
const Moldura: React.FC<{ cor: string; x: number; y: number; w: number; h: number; k: number }> = ({ cor, x, y, w, h, k }) => {
  const d1 = `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  const d2 = `M${x + 16} ${y + 16}H${x + w - 16}V${y + h - 16}H${x + 16}Z`;
  const e1 = evolvePath(k, d1), e2 = evolvePath(clamp(k * 1.1 - 0.1), d2);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      <path d={d1} fill="none" stroke={cor} strokeWidth={2} strokeDasharray={e1.strokeDasharray} strokeDashoffset={e1.strokeDashoffset} />
      <path d={d2} fill="none" stroke={cor} strokeWidth={1.4} strokeDasharray={e2.strokeDasharray} strokeDashoffset={e2.strokeDashoffset} />
      {[[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y], [x + w / 2, y + h]].map(([a, bb], i) => (
        <rect key={i} x={a - 7} y={bb - 7} width={14} height={14} transform={`rotate(45 ${a} ${bb})`} fill={cor} opacity={k} />
      ))}
    </svg>
  );
};
export const RoteiroFilme: React.FC<P & { palavras: { t: string; s: number; e: number }[] }> = ({ b, c, palavras }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.3, 0.25);
  if (!f.vivo) return null;
  const ditas = palavras.filter((p) => p.s >= b.palavra.s - 0.01 && p.s < b.t1 - 0.05);
  const italicas = new Set(lista<string>(b, 'italico', []).map((w) => w.toLowerCase()));
  const ultimaItal = italicas.size === 0 ? ditas.length - 1 : -1;
  return (
    <AbsoluteFill style={{ background: pal.verde, opacity: 1 - f.s }}>
      <Moldura cor={pal.creme} x={110} y={330} w={860} h={1180} k={eout((t - b.t0) / 0.7)} />
      <div style={{ position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center', fontFamily: FE.mono, fontSize: 28, letterSpacing: 4,
        color: pal.ouro, opacity: eout((t - b.t0 - 0.2) / 0.3) }}>{sa(b, 'cabecalho', 'CENA 01 · INT. ESCRITÓRIO · NOITE')}</div>
      <div style={{ position: 'absolute', top: 640, left: 190, right: 190, textAlign: 'center', fontFamily: FE.serif, fontSize: 84, lineHeight: 1.12, color: pal.creme }}>
        {ditas.map((p, i) => {
          const k = eout((t - p.s + 0.06) / 0.25);
          const it = i === ultimaItal || italicas.has(p.t.toLowerCase().replace(/[.,!?]/g, ''));
          return (
            <span key={i} style={{ display: it ? 'block' : 'inline-block', marginRight: 20, opacity: k, transform: `translateY(${(1 - k) * 16}px)`,
              fontStyle: it ? 'italic' : 'normal', color: it ? pal.ouro : pal.creme, fontSize: it ? 130 : 84, marginTop: it ? 18 : 0 }}>
              {p.t}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 8. painel de paleta */
export const PALETAS_GRADE: Record<string, [string, string][]> = {
  sombrio: [['SOMBRA', '#0E1712'], ['MUSGO', '#22332A'], ['OLIVA', '#4A5A48'], ['PEDRA', '#8C8F7A'], ['LATÃO', '#C9B98F']],
  cinema: [['NOITE', '#0B1A22'], ['PETRÓLEO', '#1F4650'], ['PELE', '#C98B62'], ['ÂMBAR', '#E8A54B'], ['CREME', '#F2E3C6']],
  quente: [['CAFÉ', '#2B1A12'], ['TIJOLO', '#8A3B22'], ['MEL', '#D98C3A'], ['AREIA', '#E9C99A'], ['LUZ', '#FFF1D6']],
};
export const PaletaCores: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.4);
  if (!f.vivo) return null;
  const cores = lista<[string, string]>(b, 'cores', PALETAS_GRADE[s(b, 'modo', 'sombrio')] ?? PALETAS_GRADE.sombrio);
  return (
    <div style={{ position: 'absolute', left: n(b, 'x', 60), top: n(b, 'y', 330), width: 330, padding: '24px 22px', background: pal.papel, borderRadius: 22,
      boxShadow: MEDIDAS.sombra, transform: `translateX(${(1 - f.e) * -420 - f.s * 460}px) rotate(-1.5deg)` }}>
      <div style={{ fontFamily: FE.mono, fontSize: 24, letterSpacing: 3, color: pal.cinza, marginBottom: 14 }}>{sa(b, 'titulo', 'PALETA')}</div>
      {cores.map(([nome, hex], i) => {
        const k = eout((t - b.t0 - 0.12 - i * 0.08) / 0.25);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
            <div style={{ width: 70, height: 56, borderRadius: 10, background: hex, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.08)' }} />
            <div>
              <div style={{ fontFamily: FE.mono, fontWeight: 700, fontSize: 24, color: pal.tinta }}>{nome}</div>
              <div style={{ fontFamily: FE.mono, fontSize: 22, color: pal.cinza }}>{hex}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ 9. campo de comentário (CTA) */
export const Comentario: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.35);
  if (!f.vivo) return null;
  const texto = sa(b, 'texto', 'EDITAR');
  const dg = b.digita ?? { t0: b.t0 + 0.4, t1: b.t0 + 1 };
  const nL = Math.floor(clamp((t - dg.t0) / (dg.t1 - dg.t0)) * texto.length + 0.001);
  const postado = t >= dg.t1 + 0.18;
  const kPost = eout((t - dg.t1 - 0.18) / 0.3);
  const kResp = b.resposta !== undefined ? eout((t - b.resposta) / 0.35) : 0;
  const y = n(b, 'y', 330);
  const Av: React.FC<{ letra: string; cor: string }> = ({ letra, cor }) => (
    <div style={{ width: 64, height: 64, borderRadius: 32, background: cor, color: '#fff', fontFamily: FE.sans, fontWeight: 700, fontSize: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{letra}</div>
  );
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: y, transform: `translateY(${(1 - f.e) * 60 - f.s * 80}px)`, opacity: f.e * (1 - f.s) }}>
      {!postado ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#fff', borderRadius: 48, padding: '16px 18px 16px 18px', boxShadow: MEDIDAS.sombra }}>
          <Av letra="V" cor="#7A6A58" />
          <div style={{ flex: 1, fontFamily: FE.sans, fontSize: 40, fontWeight: 600, color: '#111' }}>
            {texto.slice(0, nL) || <span style={{ color: '#9A9A9A', fontWeight: 400 }}>Adicione um comentário…</span>}
            <span style={{ opacity: Math.floor(t * 4) % 2 ? 0 : 1, fontWeight: 300 }}>|</span>
          </div>
          <div style={{ padding: '14px 28px', borderRadius: 30, background: nL >= texto.length ? pal.verde : '#D9D9D9', color: '#fff', fontFamily: FE.sans,
            fontWeight: 700, fontSize: 30 }}>{s(b, 'botao', 'Publicar')}</div>
        </div>
      ) : (
        <div style={{ transform: `scale(${0.96 + 0.04 * kPost})` }}>
          <div style={{ display: 'flex', gap: 18, background: '#fff', borderRadius: 30, padding: '20px 24px', boxShadow: MEDIDAS.sombra, alignItems: 'center' }}>
            <Av letra="V" cor="#7A6A58" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FE.sans, fontSize: 28, color: '#666' }}>você · agora</div>
              <div style={{ fontFamily: FE.sans, fontSize: 44, fontWeight: 800, color: '#111' }}>{texto}</div>
            </div>
            <Glifo nome="coracao" tam={44} cor={pal.vermelho} />
          </div>
          {kResp > 0 ? (
            <div style={{ display: 'flex', gap: 18, background: '#fff', borderRadius: 30, padding: '18px 24px', margin: '16px 0 0 70px', boxShadow: MEDIDAS.sombra,
              alignItems: 'center', opacity: kResp, transform: `translateY(${(1 - kResp) * 24}px)` }}>
              <Av letra={s(b, 'inicial', 'A')} cor={pal.verde} />
              <div>
                <div style={{ fontFamily: FE.sans, fontSize: 28, color: '#666' }}>{s(b, 'perfil', '@seuperfil')}</div>
                <div style={{ fontFamily: FE.sans, fontSize: 38, fontWeight: 600, color: '#111' }}>{sa(b, 'resposta', 'Te mandei no direct.')}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ 10. palavra gigante com imagem dentro */
export const PalavraImagem: React.FC<P> = ({ b, c }) => {
  const { t, pal, miniaturas } = c;
  const f = fases(b, t, 0.25, 0.2);
  if (!f.vivo) return null;
  const linhas = lista<string>(b, 'linhas', [s(b, 'texto', 'ENORME')]);
  const img = s(b, 'imagem', miniaturas[0] ?? '');
  const tam = n(b, 'tam', linhas.length > 1 ? 560 : 400);
  const zoom = 1.05 + 0.15 * clamp((t - b.t0) / (b.t1 - b.t0));
  return (
    <AbsoluteFill style={{ background: pal.creme, alignItems: 'center', justifyContent: 'center', opacity: 1 - f.s }}>
      {linhas.map((l, i) => {
        const k = volta((t - b.t0 - i * 0.08) / 0.35, 1.3);
        return (
          <div key={i} style={{ fontFamily: FE.serif, fontSize: tam, lineHeight: 0.86, letterSpacing: -tam * 0.03, color: 'transparent',
            backgroundImage: img ? `url(${staticFile(img)})` : undefined, backgroundColor: pal.tinta, backgroundSize: `${zoom * 100}% auto`,
            backgroundPosition: `50% ${30 + i * 40}%`, WebkitBackgroundClip: 'text', backgroundClip: 'text', transform: `scale(${0.85 + 0.15 * k})`,
            opacity: clamp(k), filter: `brightness(${n(b, 'brilho', 1.6)}) contrast(1.1)` }}>
            {l.replace(/\*/g, '')}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 11. contato de película com anotação à mão */
export const Pelicula: React.FC<P> = ({ b, c }) => {
  const { t, pal, miniaturas } = c;
  const f = fases(b, t, 0.4);
  if (!f.vivo || miniaturas.length === 0) return null;
  const W = 960, cw = 168, ch = 230;
  const notas = lista<{ quadro: number; texto: string; marca?: 'circulo' | 'x' }>(b, 'anotacoes', [
    { quadro: 2, texto: 'silêncio', marca: 'circulo' },
    { quadro: 4, texto: 'corta', marca: 'x' },
    { quadro: 7, texto: 'take ruim', marca: 'x' },
  ]);
  const Faixa: React.FC<{ y: number; desloc: number }> = ({ y, desloc }) => (
    <div style={{ position: 'absolute', left: 20, top: y, width: W - 40, height: ch + 64, background: '#1A1714', borderRadius: 6, overflow: 'hidden' }}>
      {Array.from({ length: 26 }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', left: 8 + i * 36, top: 9, width: 18, height: 14, borderRadius: 3, background: pal.papel }} />
          <div style={{ position: 'absolute', left: 8 + i * 36, bottom: 9, width: 18, height: 14, borderRadius: 3, background: pal.papel }} />
        </React.Fragment>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: 14 + i * (cw + 10), top: 32 }}>
          <Mini src={miniaturas[(i + desloc) % miniaturas.length]} w={cw} h={ch} semente={i * 31 + desloc} filtro="brightness(1.25) saturate(.85)" />
          <div style={{ position: 'absolute', left: 4, bottom: -26, fontFamily: FE.mono, fontSize: 18, color: '#E8B04B' }}>{`${12 + i + desloc}A`}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 60, top: n(b, 'y', 170), width: W, height: 2 * (ch + 64) + 100, background: pal.papel, borderRadius: 10,
      boxShadow: MEDIDAS.sombra, transform: `translateY(${(1 - f.e) * -700 - f.s * 800}px) rotate(1deg)` }}>
      <Faixa y={30} desloc={0} />
      <Faixa y={ch + 124} desloc={5} />
      <svg width={W} height={2 * (ch + 64) + 100} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {notas.map((nt, i) => {
          const k = eout((t - b.t0 - 0.45 - i * 0.3) / 0.35);
          if (k <= 0) return null;
          const lin = nt.quadro >= 5 ? 1 : 0, col = nt.quadro % 5;
          const cx = 34 + col * (cw + 10) + cw / 2, cy = 30 + lin * (ch + 94) + 32 + ch / 2;
          const d = nt.marca === 'circulo'
            ? `M${cx + 92} ${cy - 10}C${cx + 96} ${cy - 150} ${cx - 104} ${cy - 150} ${cx - 98} ${cy}C${cx - 92} ${cy + 140} ${cx + 92} ${cy + 140} ${cx + 96} ${cy - 30}`
            : `M${cx - 70} ${cy - 90}L${cx + 70} ${cy + 90}M${cx + 70} ${cy - 90}L${cx - 70} ${cy + 90}`;
          const ev = evolvePath(k, d);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={pal.vermelho} strokeWidth={7} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              <text x={cx} y={lin ? cy + 172 : cy - 132} textAnchor="middle" fontFamily={FE.mao} fontWeight={700} fontSize={54} fill={pal.vermelho} opacity={k}>{nt.texto}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ 12. "uns minutos depois" */
export const MinutosDepois: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.2, 0.2);
  if (!f.vivo) return null;
  const p = clamp((t - b.t0) / (b.t1 - b.t0));
  const seg = 4 * 60 + 12 + p * 190;
  const tcod = `00:${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(Math.floor(seg % 60)).padStart(2, '0')}:${String(Math.floor((seg * 24) % 24)).padStart(2, '0')}`;
  const linhas = lista<string>(b, 'linhas', ['UNS MINUTOS', 'DEPOIS']);
  return (
    <AbsoluteFill style={{ background: pal.verdeEscuro, alignItems: 'center', justifyContent: 'center', opacity: 1 - f.s }}>
      <div style={{ fontFamily: FE.mono, fontSize: 34, letterSpacing: 6, color: pal.ouro, marginBottom: 30 }}>{tcod}</div>
      {linhas.map((l, i) => (
        <div key={i} style={{ fontFamily: FE.serif, fontSize: 140, lineHeight: 1.0, color: pal.creme, letterSpacing: lerp(40, 8, eout((t - b.t0) / 1.2)),
          opacity: eout((t - b.t0 - 0.1 * i) / 0.4) }}>{l}</div>
      ))}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 13. teclas 3D flutuando */
export const Teclas: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.3);
  if (!f.vivo) return null;
  const teclas = lista<string>(b, 'teclas', ['⌘', 'K', 'espaço', 'J', '⌥', 'Z', 'B', '⇧']);
  const r = rng(77);
  const pos = teclas.map((_, i) => ({ x: 120 + ((i * 263) % 840) + r() * 40, y: n(b, 'y', 240) + Math.floor(i / 4) * 190 + r() * 60, rot: (r() - 0.5) * 30 }));
  return (
    <>
      {teclas.map((k, i) => {
        const e = volta((t - b.t0 - i * 0.07) / 0.35, 1.6);
        const w = k.length > 2 ? 220 : 120;
        const bob = Math.sin(t * 2.4 + i) * 10;
        return (
          <div key={i} style={{ position: 'absolute', left: pos[i].x, top: pos[i].y + bob, width: w, height: 120,
            transform: `scale(${clamp(e, 0, 1.3) * (1 - f.s)}) rotate(${pos[i].rot}deg)`, filter: 'drop-shadow(0 16px 18px rgba(0,0,0,.4))' }}>
            <div style={{ position: 'absolute', inset: 0, top: 14, borderRadius: 26, background: '#BDB3A0' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 106, borderRadius: 26, background: pal.papel,
              boxShadow: 'inset 0 -8px 0 rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FE.sans,
              fontWeight: 600, fontSize: k.length > 2 ? 36 : 52, color: pal.tinta }}>{k}</div>
          </div>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ 14. pílula grande ("uma *frase.*") */
export const Pilula: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.3, 0.25);
  if (!f.vivo) return null;
  const k = volta((t - b.t0) / 0.38, 1.5);
  const ps = partes(s(b, 'texto', 'uma *frase.*'));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: n(b, 'y', 1240), display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26,
      transform: `scale(${clamp(k, 0, 1.2)})`, opacity: 1 - f.s }}>
      {ps.map((p, i) =>
        p.it ? (
          <span key={i} style={{ fontFamily: FE.serif, fontStyle: 'italic', fontSize: 170, color: pal.ouro, textShadow: '0 10px 30px rgba(0,0,0,.5)' }}>{p.txt.trim()}</span>
        ) : (
          <span key={i} style={{ background: pal.verde, borderRadius: 90, padding: '6px 64px 16px', fontFamily: FE.sans, fontWeight: 800, fontSize: 130,
            color: '#fff', letterSpacing: -4, boxShadow: MEDIDAS.sombra }}>{p.txt.trim()}</span>
        ),
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ 15. círculo à mão + "eu" */
export const Circulo: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.3, 0.25);
  if (!f.vivo) return null;
  const x = n(b, 'x', 560), y = n(b, 'y', 860), r = n(b, 'r', 190);
  const d = `M${x + r * 0.95} ${y - r * 0.2}C${x + r * 1.05} ${y - r * 1.25} ${x - r * 1.1} ${y - r * 1.2} ${x - r} ${y + r * 0.05}C${x - r * 0.9} ${y + r * 1.25} ${x + r * 1.05} ${y + r * 1.1} ${x + r * 0.98} ${y - r * 0.35}`;
  const k = eio((t - b.t0) / 0.5);
  const ev = evolvePath(k, d);
  const lx = x - r - 210, ly = y - r - 40;
  const seta = `M${lx + 130} ${ly + 10}Q${lx + 230} ${ly - 30} ${x - r * 0.75} ${y - r * 0.72}`;
  const ks = eout((t - b.t0 - 0.45) / 0.35);
  const es = evolvePath(ks, seta);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 1 - f.s }}>
      <path d={d} fill="none" stroke={pal.vermelho} strokeWidth={8} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
      <path d={seta} fill="none" stroke={pal.vermelho} strokeWidth={6} strokeLinecap="round" strokeDasharray={es.strokeDasharray} strokeDashoffset={es.strokeDashoffset} />
      <text x={lx + 40} y={ly + 30} fontFamily={FE.mao} fontWeight={700} fontSize={110} fill={pal.vermelho} opacity={ks}>{sa(b, 'texto', 'eu')}</text>
    </svg>
  );
};

/* ------------------------------------------------------------------ 16. faixa de CTA no alto */
export const FaixaCta: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  const f = fases(b, t, 0.4);
  if (!f.vivo) return null;
  const k = volta((t - b.t0) / 0.45, 1.2);
  return (
    <div style={{ position: 'absolute', left: 110, right: 110, top: n(b, 'y', 140), background: pal.verde, borderRadius: 28, padding: '22px 30px 26px',
      textAlign: 'center', boxShadow: MEDIDAS.sombra, transform: `translateY(${(1 - clamp(k)) * -260}px) scale(${0.92 + 0.08 * clamp(k)})` }}>
      <div style={{ fontFamily: FE.sans, fontWeight: 800, fontSize: 60, color: '#fff', letterSpacing: -1.5 }}>
        {sa(b, 'texto', 'Comenta')} <span style={{ fontFamily: FE.serif, fontStyle: 'italic', fontWeight: 400, color: pal.ouro, fontSize: 72 }}>“{sa(b, 'palavraCta', 'EDITAR')}”</span>
      </div>
      <div style={{ fontFamily: FE.sans, fontSize: 32, color: pal.creme, marginTop: 4 }}>{sa(b, 'sub', 'e eu te mando o passo a passo')}</div>
    </div>
  );
};


/* ------------------------------------------------------------------ 19. cartão de texto
   Cartão de frase grande para a área de motion (layout dividido) ou tela cheia (cartao-cheio). Não esconde a
   legenda (o cartao-cheio esconde: agenda OCULTA_LEGENDA). Parâmetros: linhas (com *itálico* em ouro), tam, y,
   rotulo (pílula pequena acima), sub (linha menor abaixo), botao (pílula dourada grande, só no cheio). */
const LinhasCartao: React.FC<{ b: BlocoAgenda; c: Ctx; y: number; tam: number; largura: number; entrada: number; saida: number }> = ({ b, c, y, tam, largura, entrada, saida }) => {
  const { t, pal } = c;
  const linhas = lista<string>(b, 'linhas', ['Cartão']);
  const rotulo = s(b, 'rotulo', '');
  const sub = s(b, 'sub', '');
  const botao = s(b, 'botao', '');
  const alt = tam * 1.06;
  let yy = y;
  const blocos: React.ReactNode[] = [];
  const ent = (i: number) => eout((t - b.t0 - 0.07 * i) / entrada);
  const sai = (i: number) => eio((t - (b.t1 - saida) - 0.04 * i) / saida);
  if (rotulo) {
    const k = ent(0);
    blocos.push(
      <div key="r" style={{ position: 'absolute', left: 0, right: 0, top: yy, textAlign: 'center', opacity: k * (1 - sai(0)), transform: `translateY(${(1 - k) * 30}px)` }}>
        <span style={{ display: 'inline-block', fontFamily: FE.sans, fontWeight: 800, fontSize: tam * 0.36, letterSpacing: tam * 0.02, color: pal.ouro,
          border: `3px solid ${pal.ouro}`, borderRadius: 999, padding: `${tam * 0.08}px ${tam * 0.3}px ${tam * 0.1}px` }}>{rotulo.toUpperCase()}</span>
      </div>,
    );
    yy += tam * 0.36 * 1.5 + tam * 0.45;
  }
  linhas.forEach((l, i) => {
    const larg = partes(l).reduce((a, p) => a + medirTexto(p.txt, `${p.it ? 'italic ' : ''}${tam}px "${FE.serif}"`), 0);
    const tm = Math.min(tam, (tam * largura) / Math.max(1, larg));
    const k = ent(i + 1);
    blocos.push(
      <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: yy - tm * 0.25, height: alt + tm * 0.25, paddingTop: tm * 0.25, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', fontFamily: FE.serif, fontSize: tm, lineHeight: `${alt}px`, color: pal.creme, whiteSpace: 'nowrap',
          letterSpacing: -tm * 0.01, transform: `translateY(${(1 - k) * alt * 1.1 - sai(i + 1) * alt * 1.1}px)` }}>
          <Rico txt={l} ouro={pal.ouro} />
        </div>
      </div>,
    );
    yy += alt;
  });
  if (sub) {
    const k = ent(linhas.length + 1);
    blocos.push(
      <div key="s" style={{ position: 'absolute', left: 80, right: 80, top: yy + tam * 0.18, textAlign: 'center', fontFamily: FE.sans, fontWeight: 600, fontSize: tam * 0.42,
        color: pal.creme, opacity: 0.9 * k * (1 - sai(linhas.length + 1)), transform: `translateY(${(1 - k) * 24}px)` }}>{sub}</div>,
    );
    yy += tam * 0.42 * 1.4 + tam * 0.18;
  }
  if (botao) {
    const k = volta((t - b.t0 - 0.07 * (linhas.length + 2)) / 0.5, 1.4);
    const pulso = 1 + 0.015 * Math.sin((t - b.t0) * 4);
    blocos.push(
      <div key="b" style={{ position: 'absolute', left: 0, right: 0, top: yy + tam * 0.45, textAlign: 'center', opacity: clamp(k) * (1 - sai(linhas.length + 2)),
        transform: `scale(${Math.max(0, k) * pulso})` }}>
        <span style={{ display: 'inline-block', fontFamily: FE.sans, fontWeight: 900, fontSize: tam * 0.5, letterSpacing: tam * 0.01, color: '#1A1408',
          background: `linear-gradient(180deg, ${pal.ouro} 0%, #B8902F 100%)`, borderRadius: 999, padding: `${tam * 0.22}px ${tam * 0.6}px ${tam * 0.26}px`,
          boxShadow: `0 16px 40px rgba(0,0,0,.45), 0 0 40px ${pal.ouro}55` }}>{botao.toUpperCase()}</span>
      </div>,
    );
  }
  return <>{blocos}</>;
};

export const Cartao: React.FC<P> = ({ b, c }) => {
  const { t } = c;
  if (t < b.t0 || t >= b.t1) return null;
  return <LinhasCartao b={b} c={c} y={n(b, 'y', 340)} tam={n(b, 'tam', 104)} largura={940} entrada={0.45} saida={0.3} />;
};

export const CartaoCheio: React.FC<P> = ({ b, c }) => {
  const { t, pal } = c;
  if (t < b.t0 || t >= b.t1) return null;
  const gx = 50 + Math.sin(t * 0.35) * 16;
  const falada = b.fala === true;
  const y = n(b, 'y', 560);
  const tam = n(b, 'tam', 120);
  const destaques = new Set(lista<string>(b, 'destaques', []).map((w) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')));
  const norm = (w: string) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  // modo "fala": as palavras ditas entre t0 e t1 aparecem quando são ditas (o cartão substitui o vídeo)
  const ditas = falada ? c.palavras.filter((p) => p.s >= b.t0 - 0.05 && p.s < b.t1 - 0.05) : [];
  const rotulo = s(b, 'rotulo', '');
  // fundo opaco do início ao fim (nada do vídeo aparece por baixo); só o conteúdo anima
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 55% at ${gx}% 35%, ${pal.verde} 0%, ${pal.verdeEscuro} 60%, #020409 100%)` }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <defs>
          <pattern id="grade-cartao" width={60} height={60} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${(t * 14) % 60})`}>
            <path d="M60 0H0V60" fill="none" stroke={pal.creme} strokeOpacity={0.07} strokeWidth={1.2} />
          </pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#grade-cartao)" />
      </svg>
      {falada ? (
        <>
          {/* frase dita: todas as palavras já ocupam o lugar final (layout estável) e acendem quando são ditas;
              o bloco (rótulo + frase) fica centrado em y */}
          <div style={{ position: 'absolute', left: 80, right: 80, top: y, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {rotulo ? (
              <span style={{ display: 'inline-block', fontFamily: FE.sans, fontWeight: 800, fontSize: Math.max(30, tam * 0.32), letterSpacing: tam * 0.02, color: pal.ouro,
                border: `3px solid ${pal.ouro}`, borderRadius: 999, padding: `${tam * 0.08}px ${tam * 0.3}px ${tam * 0.1}px`, marginBottom: tam * 0.45,
                opacity: eout((t - b.t0) / 0.4), transform: `translateY(${(1 - eout((t - b.t0) / 0.4)) * 20}px)` }}>{rotulo.toUpperCase()}</span>
            ) : null}
            <div style={{ textAlign: 'center', fontFamily: FE.serif, fontSize: tam, lineHeight: 1.1, color: pal.creme }}>
              {ditas.map((p, i) => {
                const k = clamp(eout((t - p.s + 0.07) / 0.22));
                const it = destaques.has(norm(p.t));
                return (
                  <span key={i} style={{ display: 'inline-block', marginRight: tam * 0.22, opacity: k, transform: `translateY(${(1 - k) * 18}px)`,
                    fontStyle: it ? 'italic' : 'normal', color: it ? pal.ouro : pal.creme }}>{p.t}</span>
                );
              })}
            </div>
          </div>
          {s(b, 'avatar', '') ? (() => {
            // quem fala: foto redonda + nome + barras de voz (o vídeo dele não aparece neste trecho)
            const ay = n(b, 'avatarY', 1500);
            const ka = eout((t - b.t0 - 0.15) / 0.45);
            const fala = c.palavras.some((p) => t >= p.s - 0.05 && t <= p.e + 0.05);
            return (
              <div style={{ position: 'absolute', left: 0, right: 0, top: ay, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
                opacity: ka, transform: `translateY(${(1 - ka) * 24}px)` }}>
                <div style={{ width: 128, height: 128, borderRadius: 999, overflow: 'hidden', border: `4px solid ${pal.ouro}`, boxShadow: `0 0 0 ${6 + 4 * Math.abs(Math.sin(t * 5))}px ${pal.ouro}22` }}>
                  <Img src={staticFile(s(b, 'avatar', ''))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontFamily: FE.sans, fontWeight: 800, fontSize: 36, color: pal.creme }}>{s(b, 'nome', '')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34 }}>
                    {Array.from({ length: 9 }, (_, i) => {
                      const h = fala ? 8 + 24 * Math.abs(Math.sin(t * 9 + i * 1.7) * Math.cos(t * 4.3 + i)) : 6;
                      return <div key={i} style={{ width: 7, height: h, borderRadius: 4, background: pal.ouro }} />;
                    })}
                    <span style={{ fontFamily: FE.sans, fontWeight: 600, fontSize: 30, color: `${pal.creme}B3`, marginLeft: 10 }}>{s(b, 'cargo', '')}</span>
                  </div>
                </div>
              </div>
            );
          })() : null}
        </>
      ) : (
        <LinhasCartao b={b} c={c} y={y} tam={tam} largura={940} entrada={0.5} saida={0.3} />
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ legenda em tarja */
export const Tarja: React.FC<{ t: number; pal: Paleta; leg: { t0: number; t1: number; palavras: { t: string; s: number; e: number; destaque: boolean }[] }[]; y?: number; tam?: number }> = ({
  t, pal, leg, y = MEDIDAS.legendaY, tam = MEDIDAS.legenda,
}) => {
  const l = leg.find((x) => t >= x.t0 - 0.07 && t < x.t1);
  if (!l) return null;
  const k = eout((t - l.t0 + 0.07) / 0.16);
  const fonte = (it: boolean) => `${it ? 'italic ' : ''}${tam}px "${FE.serif}"`;
  const esp = medirTexto(' ', fonte(false));
  // a tarja cresce junto com as palavras ditas
  let larg = 0;
  l.palavras.forEach((p, i) => {
    const kk = eout((t - p.s + 0.07) / 0.08);
    larg += kk * (medirTexto(p.t, fonte(p.destaque)) + (i ? esp : 0));
  });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: pal.verde, borderRadius: 10, height: tam * 1.22, width: larg + 46, overflow: 'hidden', position: 'relative',
        boxShadow: '0 10px 28px rgba(0,0,0,.3)', opacity: k, transform: `translateY(${(1 - k) * 12}px) scale(${0.95 + 0.05 * k})` }}>
        <div style={{ position: 'absolute', left: 23, top: tam * 0.02, whiteSpace: 'nowrap', fontFamily: FE.serif, fontSize: tam, color: '#FBF7EE' }}>
          {l.palavras.map((p, i) => {
            const kk = eout((t - p.s + 0.07) / 0.12);
            return (
              <span key={i} style={{ opacity: kk, fontStyle: p.destaque ? 'italic' : 'normal', color: p.destaque ? pal.ouro : '#FBF7EE' }}>
                {(i ? ' ' : '') + p.t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const BLOCOS_FRENTE: Record<string, React.FC<P>> = {
  manchete: Manchete, cupom: Cupom, apps: Apps, celular: Celular, paleta: PaletaCores, comentario: Comentario, 'palavra-imagem': PalavraImagem,
  pelicula: Pelicula, 'minutos-depois': MinutosDepois, teclas: Teclas, pilula: Pilula, circulo: Circulo, 'faixa-cta': FaixaCta, cartao: Cartao, 'cartao-cheio': CartaoCheio,
};
