/* =====================================================================================
   biblioteca/Partitura.tsx: a composição genérica dos Reels "fala + motion" .
   Recebe a partitura por props (--props=arquivo.json) e monta: cenas da biblioteca, transição de
   entrada de cada uma (só as que funcionam na vertical), áudio do corte, efeitos sonoros e o Final.

   Render (o script chama assim):
     REMOTION_TEMA=<tema do modelo> npx remotion render src/index.ts Partitura saida.mp4 --props=partitura.json
   ===================================================================================== */
import React, { useMemo } from 'react';
import { Audio, Composition, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fita } from '../transicoes/fita';
import { Capitulos } from './efeitos';
import { montarRoteiro, VideoMontado } from '../montagem';
import type { EntradaM } from '../cena';
import { quadroDe } from '../tema';
import type { CenaFala } from '../tempos';
import { entrada, type NomeTransicao } from '../transicoes/catalogo';
import { CenaDaPartitura, modeloDe, PartituraCtx } from './cenas';
import type { Partitura } from './tipos';

const W = 1080;
const H = 1920;
const FPS = 30;
/** o Final começa 0,25 s depois da última palavra e dura 4,8 s */
const PAUSA_FINAL = 0.25;
const DUR_FINAL = 4.8;  // tempo para ler a chamada

/** Transições que funcionam na tela vertical, com a geometria da tela vertical. */
export const TRANSICOES_VERTICAIS: Record<string, () => EntradaM> = {
  glitchRGB: () => entrada('glitchRGB'),
  pontoAbre: () => entrada('pontoAbre', { origem: [W / 2, Math.round(H * 0.42)] }),
  flash: () => entrada('flash'),
  corteBatida: () => entrada('corteBatida'),
  chicoteLuz: () => entrada('chicoteLuz', { yLuz: Math.round(H * 0.5) }),
  foco: () => entrada('foco'),
  fusao: () => entrada('fusao' as NomeTransicao),
  // fita diagonal (troca de capítulo)
  fita: () => ({ nome: 'fita', T: 14, k: 7, plano: 'fita diagonal amarela e azul atravessa a tela', criar: () => fita({ T: 14, k: 7 }) }),
};


export const duracaoDe = (p: Partitura) => quadroDe(p.fim_s + PAUSA_FINAL + DUR_FINAL);

const roteiroDe = (p: Partitura) => {
  const m = modeloDe(p.modelo);
  const n = p.cenas.length;
  const ini = (i: number) => (i === 0 ? 0 : p.palavras[p.cenas[i].de].s);
  const cenasFala: CenaFala[] = p.cenas.map((_, i) => {
    const a = ini(i);
    const b = i + 1 < n ? ini(i + 1) : p.fim_s + PAUSA_FINAL;
    return { cena: i + 1, inicio_s: a, fim_s: b, inicio_f: quadroDe(a), dur_f: quadroDe(b) - quadroDe(a) };
  });
  const iniF = p.fim_s + PAUSA_FINAL;
  cenasFala.push({ cena: n + 1, inicio_s: iniF, fim_s: iniF + DUR_FINAL, inicio_f: quadroDe(iniF), dur_f: quadroDe(DUR_FINAL) });
  // transição de entrada: a da partitura, se for vertical; senão a próxima da lista do modelo
  const entradas: (EntradaM | null)[] = cenasFala.map((_, i) => {
    if (i === 0) return null;
    if (i === n) return TRANSICOES_VERTICAIS.flash();
    const nome = p.cenas[i].transicao ?? '';
    const lista = m.transicoes.filter((t) => t in TRANSICOES_VERTICAIS);
    const escolhida = nome in TRANSICOES_VERTICAIS ? nome : lista[(i - 1) % Math.max(1, lista.length)] ?? 'flash';
    return TRANSICOES_VERTICAIS[escolhida]();
  });
  // cena curta demais para as duas janelas de transição: entra em corte seco
  for (let i = 1; i < cenasFala.length; i++) {
    const anterior = cenasFala[i - 1];
    const tIn = entradas[i - 1]?.T ?? 0;
    const tOut = entradas[i]?.T ?? 0;
    if (anterior.dur_f < tIn + tOut + 4) entradas[i] = null;
  }
  const duracao = duracaoDe(p);
  return montarRoteiro({ cenasFala, entradas, nomes: [...p.cenas.map((c) => c.tipo), 'final'], duracao });
};

const Sons: React.FC<{ p: Partitura; cortes: number[] }> = ({ p, cortes }) => {
  const m = modeloDe(p.modelo);
  if (p.sfx === false) return null;
  const v = (base: number) => Math.min(1, base * Math.max(0.5, m.fx));
  const eventos: { q: number; som: string; vol: number }[] = [];
  cortes.forEach((q, i) => {
    if (i > 0 && i < cortes.length - 1) eventos.push({ q: q - 4, som: 'whoosh', vol: v(0.3) });
  });
  p.cenas.forEach((c) => {
    const idx = c.tipo === 'heroi' || c.tipo === 'slam' ? c.palavra ?? null : c.tipo === 'contraste' ? c.grande ?? null : c.tipo === 'numero' ? c.b?.i ?? c.a?.i ?? null : null;
    if (idx != null && p.palavras[idx]) eventos.push({ q: quadroDe(p.palavras[idx].s), som: 'impacto', vol: v(0.45) });
    if (c.tipo === 'lista' || c.tipo === 'chips' || c.tipo === 'passos')
      (c.itens ?? []).forEach(([a]) => p.palavras[a] && eventos.push({ q: quadroDe(p.palavras[a].s) - 2, som: 'pop', vol: v(0.3) }));
    if (c.carimbo && p.palavras[c.carimbo.em]) eventos.push({ q: quadroDe(p.palavras[c.carimbo.em].s), som: 'impacto', vol: v(0.55) });
    if (c.tipo === 'duelo') [c.a?.i, c.b?.i].forEach((i) => i != null && p.palavras[i] && eventos.push({ q: quadroDe(p.palavras[i].s), som: 'riser', vol: v(0.18) }));
  });
  const qFinal = cortes[cortes.length - 1];
  eventos.push({ q: qFinal - 36, som: 'riser', vol: v(0.3) });
  return (
    <>
      {eventos.filter((e) => e.q >= 0).map((e, k) => (
        <Sequence key={k} from={e.q} durationInFrames={75} layout="none">
          <Audio src={staticFile(`sfx/${e.som}.wav`)} volume={e.vol} />
        </Sequence>
      ))}
    </>
  );
};

/** Capítulos por cima do vídeo inteiro (somem no final). */
const CapitulosNoVideo: React.FC<{ p: Partitura; claro: boolean }> = ({ p, claro }) => {
  const f = useCurrentFrame();
  const caps = (p.capitulos ?? []).filter((c) => p.palavras[c.em]);
  const quadros = caps.map((c) => quadroDe(p.palavras[c.em].s));
  const fim = quadroDe(p.fim_s);
  if (f > fim + 4) return null;
  return <Capitulos caps={caps} quadros={quadros} fim={fim} global={f} claro={claro} />;
};

export const PartituraVideo: React.FC<Partitura> = (p) => {
  const m = modeloDe(p.modelo);
  const cenas = useMemo(() => roteiroDe(p), [p]);
  const componentes = useMemo(() => cenas.map(() => CenaDaPartitura), [cenas]);
  return (
    <PartituraCtx.Provider value={{ p, m }}>
      <VideoMontado cenas={cenas} componentes={componentes} audio={p.audio} />
      <Sons p={p} cortes={cenas.map((c) => c.corte)} />
      {m.capitulos && p.capitulos?.length ? <CapitulosNoVideo p={p} claro={m.estilo === 'folha' && m.fundo !== 'mesa'} /> : null}
    </PartituraCtx.Provider>
  );
};

/** Exemplo vazio para a composição abrir no Studio; o vídeo real vem por --props. */
const EXEMPLO: Partitura = { video: '', audio: '', ultimo: '', larguraOrig: 1080, alturaOrig: 1920, planos: [], palavras: [{ t: 'Exemplo', s: 0, e: 1 }], fim_s: 1,
  modelo: 'podcast', cenas: [{ tipo: 'slam', de: 0, ate: 0, palavra: 0 }], final: { titulo: 'Exemplo', tipo: 'seguir' } };

const metadados: CalculateMetadataFunction<Partitura> = ({ props }) => ({ durationInFrames: duracaoDe(props) });

export const ComposicaoPartitura: React.FC = () => (
  <Composition
    id="Partitura"
    component={PartituraVideo}
    defaultProps={EXEMPLO}
    calculateMetadata={metadados}
    durationInFrames={duracaoDe(EXEMPLO)}
    fps={FPS}
    width={W}
    height={H}
  />
);
