/* Validador da partitura: conserta o que dá (tempos, índices) e rebaixa para "fala" o que não dá.
   O texto de tela é sempre a fala: palavra grande só pode ser a palavra dita (em caixa alta) ou o número dela. */
export const TIPOS = ['fala', 'heroi', 'slam', 'contraste', 'dividido', 'numero', 'lista', 'citacao', 'documento', 'chips', 'passos', 'duelo'];
export const TRANSICOES = ['glitchRGB', 'pontoAbre', 'flash', 'corteBatida', 'chicoteLuz', 'foco', 'fusao', 'fita'];
export const CARIMBOS = ['APROVADO', 'REPROVADO', 'VERDADE', 'MITO', 'ATENÇÃO', 'IMPORTANTE', 'URGENTE', 'CONCLUÍDO', 'NOVO', 'CUIDADO'];
const MIN_CENA = 1.2;
const NUMEROS = new Set('um uma dois duas tres quatro cinco seis sete oito nove dez onze doze vinte trinta quarenta cinquenta sessenta setenta oitenta noventa cem cento mil milhao milhoes reais real'.split(' '));

export const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const so = (t) => String(t).replace(/\D/g, '');
export const textoOk = (texto, palavra) => {
  if (!texto) return false;
  const [a, b] = [norm(texto), norm(palavra)];
  return a === b || Boolean(so(texto) && (so(palavra) === so(texto) || NUMEROS.has(b)));
};

export const validarCenas = (cenas, words) => {
  const n = words.length;
  const avisos = [];
  let cs = (cenas ?? []).filter((c) => c && Number.isInteger(c.de)).sort((a, b) => a.de - b.de);
  if (!cs.length) throw new Error('partitura sem cenas');
  cs[0].de = 0;
  cs.forEach((c, i) => {
    if (i) c.de = cs[i - 1].ate + 1;
    const prox = i + 1 < cs.length ? cs[i + 1].de : n;
    c.ate = Math.max(c.de, Math.min(Number(c.ate ?? prox - 1), prox - 1, n - 1));
  });
  cs = cs.filter((c) => c.de < n && c.de <= c.ate);
  cs[cs.length - 1].ate = n - 1;
  const ini = (c) => words[c.de].s;
  const fim = (i) => (i + 1 < cs.length ? ini(cs[i + 1]) : words[n - 1].e);
  for (let i = 1; i < cs.length;) {
    if (fim(i) - ini(cs[i]) < MIN_CENA) {
      avisos.push(`cena ${i + 1} curta, juntei na anterior`);
      cs[i - 1].ate = cs[i].ate;
      cs.splice(i, 1);
    } else i++;
  }
  cs.forEach((c, k) => {
    const dentro = (x) => Number.isInteger(x) && x >= c.de && x <= c.ate;
    if (!TIPOS.includes(c.tipo)) c.tipo = 'fala';
    const t = c.tipo;
    c.destaques = (c.destaques ?? []).filter(dentro).slice(0, 3);
    if (!TRANSICOES.includes(c.transicao)) c.transicao = null;
    let ok = true;
    if (t === 'heroi' || t === 'slam') {
      ok = dentro(c.palavra);
      if (ok && c.texto && !textoOk(c.texto, words[c.palavra].t)) { avisos.push(`cena ${k + 1}: texto "${c.texto}" não é a palavra dita`); c.texto = null; }
    } else if (t === 'contraste') {
      const r = c.riscado;
      ok = Array.isArray(r) && dentro(r[0]) && dentro(r[1]) && r[0] <= r[1] && r[1] < c.ate;
      if (ok && c.grande != null && !(dentro(c.grande) && c.grande > r[1])) c.grande = null;
      if (ok && c.grande != null && c.texto && !textoOk(c.texto, words[c.grande].t)) c.texto = null;
    } else if (t === 'numero' || t === 'duelo') {
      const num = (x) => x && dentro(x.i) && /\d/.test(String(x.texto ?? '')) && textoOk(String(x.texto), words[x.i].t);
      ok = num(c.a) && (t === 'numero' || (num(c.b) && c.a.i !== c.b.i));
      if (ok && t === 'numero' && c.b && !num(c.b)) c.b = null;
      if (c.unidade != null && !dentro(c.unidade)) c.unidade = null;
      for (const r of ['la', 'lb']) if (!(Array.isArray(c[r]) && dentro(c[r][0]) && dentro(c[r][1]))) c[r] = null;
    } else if (t === 'lista' || t === 'chips' || t === 'passos') {
      const its = c.itens ?? [];
      ok = its.length >= 2 && its.length <= (t === 'passos' ? 5 : 6) && its.every((x) => Array.isArray(x) && dentro(x[0]) && dentro(x[1]) && x[0] <= x[1])
        && its.every((x, j) => j === 0 || its[j - 1][1] < x[0]);
    }
    if (c.circulo != null && !dentro(c.circulo)) c.circulo = null;
    if (c.carimbo != null) {
      const txt = String(c.carimbo.texto ?? '').toUpperCase();
      if (CARIMBOS.includes(txt) && dentro(c.carimbo.em)) c.carimbo.texto = txt;
      else { avisos.push(`cena ${k + 1}: carimbo inválido, saiu`); c.carimbo = null; }
    }
    if (!ok) { avisos.push(`cena ${k + 1}: ${t} sem parâmetros válidos, virou fala`); c.tipo = 'fala'; }
  });
  return { cenas: cs, avisos };
};

export const validarCapitulos = (caps, words) => {
  const avisos = [];
  const falados = new Set(words.map((w) => norm(w.t)));
  const bons = [];
  for (const c of [...(caps ?? [])].filter((x) => Number.isInteger(x?.em) && x.em >= 0 && x.em < words.length).sort((a, b) => a.em - b.em)) {
    const titulo = String(c.titulo ?? '').split(/\s+/).slice(0, 3).join(' ').slice(0, 26);
    const estranhas = titulo.split(/\s+/).map(norm).filter((w) => w.length >= 4 && !falados.has(w));
    if (!titulo || estranhas.length) { avisos.push(`capítulo "${titulo}" tem palavra que não foi dita, saiu`); continue; }
    if (bons.length && words[c.em].s - words[bons[bons.length - 1].em].s < 6) continue;
    bons.push({ em: c.em, titulo });
  }
  if (bons.length) bons[0].em = 0;
  return bons.length < 2 ? { capitulos: [], avisos } : { capitulos: bons.slice(0, 5), avisos };
};
