/* Decide o que fica de um take bruto, pela transcrição palavra a palavra. Puro (sem ffmpeg), testável.
 *
 * O que sai:
 *   - frase interrompida: a transcrição marca com "--" a palavra cortada no meio ("da--", "edita--");
 *   - frase refeita: a mesma frase dita de novo logo depois (fica sempre a ÚLTIMA tomada);
 *   - frase só de hesitação ("hum", "ahn", "é...");
 *   - silêncio: entre duas palavras com mais de `pausa` segundos de intervalo, o vídeo pula o vazio.
 * Quem confere é o agente: a lista de frases (fica/sai, motivo) é mostrada antes de cortar, e ele
 * pode virar `fica` de qualquer frase ou tirar palavras soltas (`tirarPalavras`) no cortes.json. */

export const FPS = 30;

/** palavra sem acento, pontuação nem maiúscula */
export const limpa = (w) => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

const HESITACAO = new Set(['ah', 'ahn', 'an', 'aham', 'eh', 'ehh', 'hum', 'hm', 'hmm', 'uh', 'ã', 'hã', 'e', 'é', 'ee', 'éé']);
const semAspas = (t) => String(t).replace(/["“”'’]+$/g, '').replace(/^["“”'‘]+/g, '');
const interrompida = (t) => /(--|—|-)$/.test(semAspas(t).trim());
const fimDeFrase = (t) => /[.?!…]$/.test(semAspas(t).trim());
/** "ca-seu": tropeço dentro da palavra (o agente decide; aqui só se aponta) */
export const tropeco = (t) => /^[\p{L}]{1,3}-[\p{L}]{2,}/u.test(semAspas(t)) && !/-(se|me|te|lhe|lo|la|los|las|nos|vos)$/i.test(t);

/** Junta as palavras em frases: quebra no ponto final, na palavra interrompida ou numa pausa longa. */
export const frasesDoTake = (palavras, {pausaFrase = 0.7} = {}) => {
  const frases = [];
  let atual = [];
  palavras.forEach((p, i) => {
    atual.push(i);
    const prox = palavras[i + 1];
    if (!prox || fimDeFrase(p.text) || interrompida(p.text) || prox.start - p.end >= pausaFrase) {
      frases.push(atual);
      atual = [];
    }
  });
  return frases.map((idx, n) => ({
    n: n + 1,
    de: palavras[idx[0]].start,
    ate: palavras[idx[idx.length - 1]].end,
    palavras: [idx[0], idx[idx.length - 1]],
    texto: idx.map((i) => palavras[i].text).join(' '),
  }));
};

const conteudo = (ws) => new Set(ws.map(limpa).filter((w) => w.length >= 4));

/** Marca cada frase com fica/sai e o motivo. */
export const proporCortes = (palavras, {pausaFrase = 0.7, janela = 30, alcance = 4, semelhanca = 0.75} = {}) => {
  const frases = frasesDoTake(palavras, {pausaFrase});
  const ws = (f) => palavras.slice(f.palavras[0], f.palavras[1] + 1).map((p) => p.text);
  frases.forEach((f, k) => {
    const lista = ws(f);
    f.fica = true;
    f.motivo = '';
    if (lista.every((w) => HESITACAO.has(limpa(w)) || limpa(w) === '')) { f.fica = false; f.motivo = 'hesitação'; return; }
    if (interrompida(lista[lista.length - 1])) { f.fica = false; f.motivo = 'interrompida'; return; }
    // refeita: alguma das próximas frases (até `alcance` frases e `janela` s depois) começa igual e repete o conteúdo
    const c = conteudo(lista);
    if (c.size < 2) return;
    for (let j = k + 1; j < Math.min(frases.length, k + 1 + alcance); j++) {
      const g = frases[j];
      if (g.de - f.ate > janela) break;
      if (limpa(ws(g)[0]) !== limpa(lista[0])) continue;
      // a retomada pode vir quebrada em mais de uma frase: olha as palavras dali em diante
      const adiante = palavras.slice(g.palavras[0], g.palavras[0] + lista.length + 6).map((p) => p.text);
      const cg = conteudo(adiante);
      const comum = [...c].filter((w) => cg.has(w)).length;
      if (comum / c.size >= semelhanca) { f.fica = false; f.motivo = `refeita na frase ${g.n}`; return; }
    }
  });
  return frases;
};

const quadro = (s, arred) => arred(s * FPS) / FPS;
const r4 = (v) => Math.round(v * 10000) / 10000;

/** Trechos do vídeo bruto que ficam, a partir das frases marcadas e das palavras tiradas à mão. */
export const trechosDasFrases = (palavras, frases, {pausa = 0.22, folga = 0.05, folgaFim = 0.07, tirarPalavras = []} = {}) => {
  const tira = new Set(tirarPalavras);
  for (const f of frases) if (!f.fica) for (let i = f.palavras[0]; i <= f.palavras[1]; i++) tira.add(i);
  const trechos = [];
  let atual = null;
  palavras.forEach((p, i) => {
    if (tira.has(i)) { atual = null; return; }
    const ant = palavras[i - 1];
    if (!atual || p.start - ant.end > pausa) {
      // o trecho começa um pouco antes da palavra, sem pegar a palavra anterior
      const inicio = Math.max(p.start - folga, ant ? ant.end : 0, 0);
      atual = {inicio: quadro(inicio, Math.round), fim: 0, idx: []};
      trechos.push(atual);
    }
    const prox = palavras[i + 1];
    atual.fim = quadro(Math.min(p.end + folgaFim, prox ? Math.max(prox.start, p.end) : p.end + folgaFim), Math.ceil);
    atual.idx.push(i);
  });
  // nunca dois trechos sobrepostos (o arredondamento para quadro pode encostar um no outro)
  for (let k = 1; k < trechos.length; k++) trechos[k].inicio = Math.max(trechos[k].inicio, trechos[k - 1].fim);
  return trechos.filter((t) => t.fim - t.inicio > 0.05).map((t) => ({
    inicio: r4(t.inicio), fim: r4(t.fim), texto: t.idx.map((i) => palavras[i].text).join(' '), palavras: t.idx,
  }));
};

export const duracaoDosTrechos = (trechos) => trechos.reduce((s, t) => s + (t.fim - t.inicio), 0);

/** Palavras que ficaram, no tempo do vídeo já cortado (formato tempos.json da skill: t, s, e). */
export const palavrasNoCorte = (palavras, trechos) => {
  const out = [];
  let cursor = 0;
  for (const t of trechos) {
    for (const i of t.palavras) {
      const p = palavras[i];
      const s = Math.max(0, p.start - t.inicio) + cursor;
      const e = Math.min(p.end, t.fim) - t.inicio + cursor;
      out.push({t: p.text, s: Math.round(s * 100) / 100, e: Math.round(Math.max(e, s + 0.02) * 100) / 100});
    }
    cursor += t.fim - t.inicio;
  }
  return out;
};

/** tempos.json da skill (palavras + uma cena por frase), igual ao que scripts/transcrever.mjs grava. */
export const temposDoCorte = (palavrasCorte) => {
  const cenas = [];
  let inicio = 0;
  palavrasCorte.forEach((p, i) => {
    if (/[.?!…]["”]?$/.test(p.t) || i === palavrasCorte.length - 1) {
      const prox = palavrasCorte[i + 1];
      const fim = prox ? prox.s : p.e;
      cenas.push({cena: cenas.length + 1, inicio_s: Math.round(inicio * 100) / 100, fim_s: Math.round(fim * 100) / 100,
        inicio_f: Math.round(inicio * FPS), dur_f: Math.round(fim * FPS) - Math.round(inicio * FPS)});
      inicio = fim;
    }
  });
  return {fps: FPS, fim_fala_s: palavrasCorte.length ? palavrasCorte[palavrasCorte.length - 1].e : 0, cenas, palavras: palavrasCorte};
};
