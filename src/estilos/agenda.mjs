/* =====================================================================================
   agenda.mjs: a TABELA DE BATIDAS dos estilos editorial e quadro, calculada uma vez só.

   Recebe o roteiro.json do vídeo (o que entra na tela e em qual palavra) e o tempos.json (cada
   palavra com início e fim) e devolve, em segundos, quando cada bloco entra e sai e quando cada
   som toca. Três lugares leem esta mesma conta, então imagem e som nunca se desencontram:
     - as composições (src/estilos/editorial e src/estilos/quadro), para desenhar;
     - scripts/batidas.mjs, para mostrar a tabela ao usuário antes do render;
     - scripts/trilha.mjs, para gerar trilha e efeitos presos aos mesmos instantes.
   JavaScript puro (sem React, sem TypeScript), para rodar também no Node sem compilar.

   Como apontar uma palavra ("em", "ate"):
     "Claude"            primeira vez que a palavra é dita (sem acento/pontuação/maiúscula)
     "Claude#2"          segunda vez
     "mais cinematográfico"  sequência de palavras (começa na primeira, termina na última)
     4.2                 número = segundos
   ===================================================================================== */

export const FPS = 30;

/** palavra sem acento, pontuação nem maiúscula ("Cinematográfico." → "cinematografico") */
export const limpa = (w) =>
  String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

/** Acha uma referência de palavra nos tempos. Devolve { i, j, s, e } (índices e segundos). */
export const achar = (palavras, ref) => {
  if (typeof ref === 'number') return { i: -1, j: -1, s: ref, e: ref };
  if (ref == null) throw new Error('agenda: referência de palavra vazia');
  const [texto, nStr] = String(ref).split('#');
  const alvo = texto.trim().split(/\s+/).map(limpa).filter(Boolean);
  let falta = nStr ? Number(nStr) : 1;
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((a, k) => limpa(palavras[i + k].t) === a) && --falta === 0) {
      const j = i + alvo.length - 1;
      return { i, j, s: palavras[i].s, e: palavras[j].e };
    }
  }
  throw new Error(`agenda: a palavra "${ref}" não está no tempos.json (confira a grafia ou use "palavra#2")`);
};

const r3 = (v) => Math.round(v * 1000) / 1000;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* ---------------------------------------------------------------- legenda (tarja) */
/** Agrupa as palavras em tarjas de até `max` palavras (quebra em pontuação, pausa ou tamanho). */
export const legendas = (palavras, { max = 3, maxLetras = 22, destaques = [], ocultar = [] } = {}) => {
  const dest = new Set(destaques.map(limpa));
  const blocos = [];
  let atual = null;
  palavras.forEach((p, k) => {
    const ant = palavras[k - 1];
    const letras = atual ? atual.palavras.reduce((a, w) => a + w.t.length + 1, 0) + p.t.length : 0;
    const quebra = !atual || atual.palavras.length >= max || /[.?!,:;…]$/.test(ant.t) || p.s - ant.e > 0.35 || letras > maxLetras;
    if (quebra) {
      atual = { t0: p.s, t1: 0, palavras: [] };
      blocos.push(atual);
    }
    atual.palavras.push({ t: p.t, s: p.s, e: p.e, destaque: dest.has(limpa(p.t)) });
  });
  blocos.forEach((b, k) => {
    const fim = b.palavras[b.palavras.length - 1].e;
    const prox = blocos[k + 1];
    b.t1 = r3(prox && prox.t0 - fim < 0.6 ? prox.t0 : fim + 0.3);
  });
  // janelas sem legenda (telas cheias que já mostram o texto)
  return blocos.filter((b) => !ocultar.some(([a, z]) => b.t0 >= a - 0.05 && b.t0 < z));
};

/** instante em que cada letra de `texto` aparece: palavra dita → letras dentro da palavra falada */
export const tempoLetras = (texto, palavras, desde, d0, d1) => {
  const ws = texto.split(' ');
  const out = [];
  let j = Math.max(0, desde);
  let tLinear = d0;
  const passo = (d1 - d0) / Math.max(1, texto.length);
  ws.forEach((w, wi) => {
    const k = palavras.findIndex((p, x) => x >= j && x < j + 8 && limpa(p.t) === limpa(w) && limpa(w) !== '');
    let a, z;
    if (k >= 0) { a = Math.max(palavras[k].s - 0.05, tLinear); z = Math.max(a + 0.05, palavras[k].e); j = k + 1; }
    else { a = tLinear; z = tLinear + passo * w.length; }
    for (let c = 0; c < w.length; c++) out.push(r3(a + ((z - a) * c) / w.length));
    tLinear = z;
    if (wi < ws.length - 1) out.push(r3(z));
  });
  return out;
};

/* ---------------------------------------------------------------- editorial */
// duração padrão (s) de cada tipo quando o roteiro não diz "ate"
const DUR_EDITORIAL = {
  'titulo-atras': 2.2, manchete: 1.6, cupom: 2.4, apps: 2.2, miniaturas: 2.0, celular: 2.0, 'roteiro-filme': 2.4,
  grade: 999, paleta: 2.2, whip: 0.36, comentario: 3.0, 'palavra-imagem': 1.4, pelicula: 2.2, 'minutos-depois': 1.6,
  teclas: 1.8, pilula: 1.2, circulo: 1.8, 'faixa-cta': 999, layout: 999, cartao: 2.5, 'cartao-cheio': 3.0,
};
// telas cheias: escondem o vídeo e a legenda
export const TELA_CHEIA = new Set(['roteiro-filme', 'minutos-depois', 'palavra-imagem', 'celular', 'cartao-cheio']);
const OCULTA_LEGENDA = new Set(['roteiro-filme', 'minutos-depois', 'palavra-imagem', 'manchete', 'pilula', 'cartao-cheio']);

// cartões que ocupam a área de motion (o que preenche o painel no layout dividido ou pequeno)
const NO_PAINEL = new Set(['manchete', 'cupom', 'apps', 'comentario', 'teclas', 'pilula', 'paleta', 'faixa-cta', 'celular',
  'roteiro-filme', 'palavra-imagem', 'minutos-depois', 'pelicula', 'cartao', 'cartao-cheio']);
export const VAZIO_MAX = 0.5;
const preencherPainel = (blocos, lays, sons, dur) => {
  const cartoes = blocos.filter((b) => NO_PAINEL.has(b.tipo) || (b.tipo === 'miniaturas' && b.modo === 'calendario'));
  for (const L of lays) {
    if (L.modo !== 'dividido' && L.modo !== 'pequeno') continue;
    const a = L.t0, z = Math.min(L.t1, dur);
    const dentro = () => cartoes.filter((c) => c.t1 > a && c.t0 < z).sort((x, y) => x.t0 - y.t0);
    // começo do layout sem cartão: o primeiro cartão do layout entra junto (e o som de entrada vai junto)
    const primeiro = dentro()[0];
    if (primeiro && primeiro.t0 - a > VAZIO_MAX && !cartoes.some((c) => c !== primeiro && c.t0 <= a && c.t1 > a)) {
      const antes = primeiro.t0;
      primeiro.t0 = r3(a);
      sons.forEach((x) => { if (x.bloco === primeiro.id && Math.abs(x.t - antes) < 0.001) x.t = primeiro.t0; });
    }
    // buracos no meio e no fim: segura o cartão que estava na tela até o próximo entrar (ou o layout acabar)
    let fim = a;
    let ultimo = null;
    for (const c of dentro()) {
      if (c.t0 - fim > VAZIO_MAX && ultimo) ultimo.t1 = r3(c.t0);
      if (c.t1 >= fim) { fim = c.t1; ultimo = c; }
    }
    if (ultimo && z - fim > VAZIO_MAX) ultimo.t1 = r3(z);
  }
};

export const agendaEditorial = (roteiro, tempos) => {
  const P = tempos.palavras;
  const fimFala = tempos.fim_fala_s ?? P[P.length - 1].e;
  const dur = r3(roteiro.duracao ?? fimFala + 0.8);
  const sons = [];
  let blocoAtual = -1;
  const som = (t, nome, ganho = 1, extra = {}) => sons.push({ t: r3(t), som: nome, ganho, bloco: blocoAtual, ...extra });
  const blocos = (roteiro.blocos ?? []).map((b, k) => {
    blocoAtual = k;
    const em = achar(P, b.em);
    // entra 2 quadros antes da palavra (a transcrição marca o início um pouco depois do som)
    const t0 = r3(Math.max(0, em.s - 2 / FPS));
    let t1;
    if (b.ate !== undefined) t1 = achar(P, b.ate).e + 0.12;
    else if (b.dur !== undefined) t1 = t0 + b.dur;
    else t1 = t0 + (DUR_EDITORIAL[b.tipo] ?? 2);
    t1 = r3(Math.min(t1, dur));
    // "palavra" do roteiro (a do faixa-cta) vira "palavraCta": o campo "palavra" aqui é o tempo da palavra do "em"
    const out = { ...b, id: k, t0, t1, palavra: { s: em.s, e: em.e }, ...(typeof b.palavra === 'string' ? { palavraCta: b.palavra } : {}) };
    switch (b.tipo) {
      case 'cupom': {
        const texto = b.texto ?? '';
        const d0 = t0 + 0.34;
        const d1 = b.digitar_ate !== undefined ? achar(P, b.digitar_ate).e : d0 + Math.min(1.2, 0.045 * texto.length);
        out.digita = { t0: r3(d0), t1: r3(Math.max(d1, d0 + 0.3)) };
        // cada palavra do cupom é digitada enquanto é dita (se estiver na fala); o resto, em ritmo linear
        out.letras = tempoLetras(texto, P, em.i, out.digita.t0, out.digita.t1);
        som(t0, 'ping', 0.9);
        som(t0 + 0.05, 'papel', 0.5);
        out.letras.forEach((tl, i) => { if (texto[i] && texto[i] !== ' ') som(tl, 'tecla', 0.35); });
        break;
      }
      case 'apps': {
        out.riscos = (b.riscar ?? []).map((r) => ({ app: r.app, t: r3(achar(P, r.em).s) }));
        out.fimEm = b.fim ? r3(achar(P, b.fim.em).s) : null;
        som(t0, 'pop', 0.7);
        out.riscos.forEach((r) => som(r.t, 'risco', 0.8));
        if (out.fimEm !== null) som(out.fimEm, 'pop', 0.5);
        break;
      }
      case 'comentario': {
        const texto = b.texto ?? 'EDITAR';
        const d0 = t0 + 0.45;
        out.digita = { t0: r3(d0), t1: r3(d0 + 0.11 * texto.length) };
        out.resposta = r3(out.digita.t1 + 0.55);
        for (let i = 0; i < texto.length; i++) som(d0 + 0.11 * i, 'tecla', 0.45);
        som(out.digita.t1 + 0.18, 'pop', 0.8);
        som(out.resposta, 'pop', 0.6);
        break;
      }
      case 'grade':
        som(t0 - 0.5, 'subida', 0.6);
        som(t0, 'impacto', 0.9);
        break;
      case 'whip':
        som(t0 - 0.06, 'whoosh', 1);
        break;
      case 'layout':
        // troca de layout (cheio, dividido, pequeno): o retângulo do vídeo anda com mola; whoosh baixo
        if (t0 > 0.3) som(t0 - 0.12, 'whoosh', 0.45);
        break;
      case 'titulo-atras':
      case 'palavra-imagem':
        som(t0, 'swell', 0.7);
        break;
      case 'miniaturas':
        for (let i = 0; i < 6; i++) som(t0 + 0.06 * i, 'pop', 0.35);
        break;
      case 'teclas':
        for (let i = 0; i < 6; i++) som(t0 + 0.09 * i, 'tecla', 0.6);
        break;
      case 'pelicula':
        som(t0, 'projetor', 0.6, { dur: t1 - t0 });
        break;
      case 'minutos-depois':
        som(t0, 'tique', 0.6);
        break;
      case 'circulo':
        som(t0 + 0.1, 'caneta', 0.7);
        break;
      default:
        som(t0, 'pop', 0.6);
    }
    return out;
  });
  // layout sem "ate" vale até o próximo layout (para a tabela de batidas mostrar o trecho certo)
  const lays = blocos.filter((b) => b.tipo === 'layout');
  lays.forEach((b, k) => {
    const prox = lays[k + 1];
    if (b.ate === undefined && b.dur === undefined && prox && prox.t0 < b.t1) b.t1 = prox.t0;
  });
  // painel de motion vazio (layout dividido ou pequeno) por mais de 0,5 s: segura o cartão anterior até o
  // próximo entrar; se o layout começa sem cartão, o próximo cartão entra junto com o layout
  if (roteiro.preencherPainel !== false) preencherPainel(blocos, lays, sons, dur);
  // a legenda some quando o texto já está grande na tela (telas cheias, manchete, pílula)
  const ocultar = blocos.filter((b) => OCULTA_LEGENDA.has(b.tipo)).map((b) => [b.t0, b.t1]);
  const leg = roteiro.legenda === false ? [] : legendas(P, { ...(roteiro.legenda ?? {}), ocultar });
  return { estilo: 'editorial', dur, blocos, legendas: leg, sons: sons.sort((a, b) => a.t - b.t) };
};

/* ---------------------------------------------------------------- quadro */
const W = 1080;
// área útil do quadro (vertical 1080x1920); horizontal ajusta pela largura
const posicoes = (layout, n, larg, alt) => {
  const cx = larg / 2;
  const meio = alt * 0.44;
  const tam = n <= 2 ? 250 : n === 3 ? 205 : 160;
  const espX = Math.min(larg - 180, 860);
  if (layout === 'coluna') {
    const passo = Math.min(330, (alt * 0.62) / Math.max(1, n));
    return Array.from({ length: n }, (_, i) => ({ x: cx, y: meio - ((n - 1) * passo) / 2 + i * passo, tam: Math.min(tam, 170) }));
  }
  if (layout === 'arvore' && n >= 2) {
    const filhos = n - 1;
    const xs = filhos === 1 ? [cx] : Array.from({ length: filhos }, (_, i) => cx - espX / 2 + (espX * i) / (filhos - 1));
    return [{ x: cx, y: meio - 240, tam: 200 }, ...xs.map((x) => ({ x, y: meio + 220, tam: filhos > 3 ? 140 : 170 }))];
  }
  if (n <= 3) {
    const xs = n === 1 ? [cx] : Array.from({ length: n }, (_, i) => cx - espX / 2 + 90 + ((espX - 180) * i) / (n - 1));
    return xs.map((x) => ({ x, y: meio, tam }));
  }
  // grade: 3 por linha
  const linhas = Math.ceil(n / 3);
  return Array.from({ length: n }, (_, i) => {
    const l = Math.floor(i / 3);
    const naLinha = Math.min(3, n - l * 3);
    const c = i % 3;
    const xs = naLinha === 1 ? [cx] : Array.from({ length: naLinha }, (_, k) => cx - espX / 2 + 70 + ((espX - 140) * k) / (naLinha - 1));
    return { x: xs[c], y: meio - ((linhas - 1) * 400) / 2 + l * 400, tam: 150 };
  });
};

const COMP_TRACO = 24 * 3.2; // comprimento aproximado de um ícone em unidades da grade (para o tempo de desenho)

export const agendaQuadro = (roteiro, tempos, { largura = W, altura = 1920 } = {}) => {
  const P = tempos.palavras;
  const fimFala = tempos.fim_fala_s ?? P[P.length - 1].e;
  const dur = r3(roteiro.duracao ?? fimFala + 0.8);
  const sons = [];
  const som = (t, nome, ganho = 1, extra = {}) => sons.push({ t: r3(t), som: nome, ganho, ...extra });
  const ant = 2 / FPS;

  const rosto = roteiro.rosto ? { ...roteiro.rosto, t1: r3(achar(P, roteiro.rosto.ate).s - ant) } : null;
  if (rosto) som(rosto.t1, 'virada', 0.8);

  const cenas = (roteiro.cenas ?? []).map((c) => ({ ...c, t0: r3(Math.max(rosto ? rosto.t1 : 0, achar(P, c.em).s - ant)) }));
  cenas.forEach((c, k) => {
    c.limpa = k + 1 < cenas.length ? r3(cenas[k + 1].t0 - 0.24) : null;
    if (c.limpa !== null) som(c.limpa, 'apagar', 0.7);
  });

  const saida = cenas.map((c) => {
    const ops = []; // tudo o que o lápis desenha, em ordem
    const topo = altura * 0.21;
    if (c.titulo) ops.push({ tipo: 'texto', txt: c.titulo, x: largura / 2, y: topo, tam: c.tamTitulo ?? 96, t0: c.t0, cor: c.corTitulo ?? 'tinta', alvo: c.t0 });
    if (c.subtitulo) ops.push({ tipo: 'texto', txt: c.subtitulo, x: largura / 2, y: topo + 84, tam: 50, t0: c.subtituloEm !== undefined ? achar(P, c.subtituloEm).s - ant : c.t0 + 0.4, cor: 'tinta' });

    const itens = c.itens ?? [];
    const comSlot = itens.filter((it) => !it.marca && !it.livre);
    const pos = posicoes(c.layout ?? (comSlot.length > 3 ? 'grade' : 'linha'), comSlot.length, largura, altura);
    const slots = [];
    let si = 0;
    itens.forEach((it) => {
      const t0 = r3(achar(P, it.em).s - ant);
      const cor = it.cor ?? 'tinta';
      if (it.marca) {
        const alvo = slots[it.sobre ?? slots.length - 1];
        if (!alvo) return;
        const r = alvo.tam * 0.42;
        if (it.marca === 'x') {
          // +0,02 s: na mesma palavra, o rótulo do ícone vem antes do X
          ops.push({ tipo: 'traco', d: `M${alvo.x - r} ${alvo.y - r}L${alvo.x + r} ${alvo.y + r}`, t0: t0 + 0.02, cor: 'vermelho', pesoTempo: 0.5 });
          ops.push({ tipo: 'traco', d: `M${alvo.x + r} ${alvo.y - r}L${alvo.x - r} ${alvo.y + r}`, t0: t0 + 0.021, cor: 'vermelho', pesoTempo: 0.5 });
          som(t0, 'risco', 0.8);
        } else if (it.marca === 'check') {
          const x = alvo.x + alvo.tam * 0.62, y = alvo.y + alvo.tam * 0.5;
          ops.push({ tipo: 'traco', d: `M${x - 34} ${y}L${x - 10} ${y + 24}L${x + 36} ${y - 30}`, t0: t0 + 0.02, cor: 'verde', pesoTempo: 0.6 });
          som(t0 + 0.2, 'ding', 0.7);
        } else if (it.marca === 'circulo') {
          const rr = alvo.tam * 0.7;
          ops.push({ tipo: 'traco', d: `M${alvo.x + rr} ${alvo.y - 8}A${rr} ${rr * 0.9} 0 1 1 ${alvo.x + rr - 4} ${alvo.y + 14}`, t0, cor: it.cor ?? 'vermelho', pesoTempo: 0.8 });
        } else if (it.marca === 'sublinha') {
          const y = alvo.y + alvo.tam / 2 + 108;
          ops.push({ tipo: 'traco', d: `M${alvo.x - 120} ${y}Q${alvo.x} ${y + 12} ${alvo.x + 130} ${y - 6}`, t0, cor: it.cor ?? 'verde', pesoTempo: 0.5 });
        }
        return;
      }
      if (it.livre) {
        ops.push({ tipo: 'texto', txt: it.texto, x: it.x, y: it.y, tam: it.tam ?? 48, t0, cor });
        return;
      }
      const p = { ...pos[si++] };
      if (it.x !== undefined) p.x = it.x;
      if (it.y !== undefined) p.y = it.y;
      if (it.tam !== undefined) p.tam = it.tam;
      const ant2 = slots[slots.length - 1];
      // seta ou linha ligando ao anterior (desenhada logo antes do item, no fim da palavra anterior)
      if (ant2 && (it.ligar ?? c.ligar)) {
        const lay = c.layout ?? 'linha';
        let d;
        if (lay === 'arvore') {
          const pai = slots[0];
          d = `M${pai.x} ${pai.y + pai.tam * 0.55}L${p.x} ${p.y - p.tam * 0.55}`;
        } else if (Math.abs(ant2.y - p.y) < 20) {
          const a = ant2.x + ant2.tam * 0.62, b = p.x - p.tam * 0.62;
          d = `M${a} ${p.y}L${b} ${p.y}M${b - 22} ${p.y - 18}L${b} ${p.y}L${b - 22} ${p.y + 18}`;
        } else {
          const a = [ant2.x, ant2.y + ant2.tam * 0.55 + 90], b = [p.x, p.y - p.tam * 0.6];
          const mx = (a[0] + b[0]) / 2 + (a[0] === b[0] ? 60 : 0);
          d = `M${a[0]} ${a[1]}Q${mx} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}`;
          const ang = Math.atan2(b[1] - (a[1] + b[1]) / 2, b[0] - mx);
          const ponta = (s) => [b[0] - 24 * Math.cos(ang + s), b[1] - 24 * Math.sin(ang + s)];
          const [p1, p2] = [ponta(0.5), ponta(-0.5)];
          d += `M${p1[0]} ${p1[1]}L${b[0]} ${b[1]}L${p2[0]} ${p2[1]}`;
        }
        ops.push({ tipo: 'traco', d, t0: t0 - 0.3, cor: 'tinta', pesoTempo: 0.45, seta: true });
      }
      if (it.icone) ops.push({ tipo: 'icone', nome: it.icone, x: p.x, y: p.y, tam: p.tam, t0, cor, alvo: t0 });
      else if (it.texto) ops.push({ tipo: 'texto', txt: it.texto, x: p.x, y: p.y + (it.tamTexto ?? 64) * 0.35, tam: it.tamTexto ?? 64, t0, cor });
      if (it.rotulo) {
        const tr = it.rotuloEm !== undefined ? r3(achar(P, it.rotuloEm).s - ant) : null;
        ops.push({ tipo: 'texto', txt: it.rotulo, x: p.x, y: p.y + p.tam / 2 + 80, tam: it.tamRotulo ?? 56, t0: tr ?? t0 + 0.001, cor, depois: tr === null });
      }
      if (it.nota) ops.push({ tipo: 'texto', txt: it.nota, x: p.x, y: p.y + p.tam / 2 + 136, tam: 40, t0: t0 + 0.002, cor: 'tinta', depois: true });
      slots.push(p);
    });

    // tempos de desenho: cada operação ganha uma fatia; nunca invade a seguinte; o rótulo vem logo
    // depois do ícone ("depois": encadeado)
    ops.sort((a, b) => a.t0 - b.t0);
    const fimCena = c.limpa ?? dur;
    ops.forEach((o, k) => {
      const base = o.tipo === 'icone' ? 0.75 : o.tipo === 'texto' ? clamp(0.045 * o.txt.length, 0.28, 0.8) : 0.32 * (o.pesoTempo ?? 1) + 0.1;
      o.dur = base;
    });
    // encadeia: quem começa antes do fim do anterior espera (o lápis é um só)
    let livre = -1;
    ops.forEach((o, k) => {
      if (o.depois && k > 0) o.t0 = Math.max(o.t0, ops[k - 1].t1 ?? o.t0);
      o.t0 = r3(Math.max(o.t0, livre));
      const prox = ops.slice(k + 1).find((q) => !q.depois);
      const limite = prox ? Math.max(prox.t0 - 0.03, o.t0 + 0.2) : fimCena - 0.1;
      o.t1 = r3(Math.max(o.t0 + 0.18, Math.min(o.t0 + o.dur, limite)));
      livre = o.t1;
    });
    // se a fila passou do fim da cena (muita coisa na mesma palavra), comprime de trás para a frente
    let limite = fimCena - 0.05;
    for (let k = ops.length - 1; k >= 0; k--) {
      const o = ops[k];
      if (o.t1 <= limite) break;
      o.t1 = r3(limite);
      o.t0 = r3(Math.min(o.t0, o.t1 - 0.12));
      limite = o.t0;
    }
    ops.forEach((o) => som(o.t0, 'lapis', o.tipo === 'texto' ? 0.55 : 0.7, { dur: r3(o.t1 - o.t0) }));
    return { titulo: c.titulo ?? '', t0: c.t0, limpa: c.limpa, ops };
  });
  return { estilo: 'quadro', dur, rosto, cenas: saida, sons: sons.sort((a, b) => a.t - b.t) };
};

/** Tabela de batidas legível (para mostrar ao usuário antes do render). */
export const tabelaDeBatidas = (agenda) => {
  const linhas = ['| tempo | imagem | som |', '|---|---|---|'];
  const fmt = (t) => t.toFixed(2).padStart(5, ' ') + ' s';
  if (agenda.estilo === 'editorial') {
    agenda.blocos.forEach((b) => {
      const desc = [b.tipo, b.texto ?? b.linhas?.join(' / ') ?? b.modo ?? ''].filter(Boolean).join(': ');
      const sons = [...new Set(agenda.sons.filter((x) => x.bloco === b.id).map((x) => x.som))].join(', ');
      linhas.push(`| ${fmt(b.t0)} a ${fmt(b.t1)} | ${desc} (em "${b.em}") | ${sons || '-'} |`);
    });
  } else {
    if (agenda.rosto) linhas.push(`| ${fmt(0)} a ${fmt(agenda.rosto.t1)} | rosto (vídeo) | - |`);
    agenda.cenas.forEach((c, k) => {
      linhas.push(`| ${fmt(c.t0)} | **cena ${k + 1}** ${c.titulo} (quadro limpo) | ${k ? 'apagar' : 'virada'} |`);
      c.ops.forEach((o) => {
        const nome = o.tipo === 'icone' ? `ícone ${o.nome}` : o.tipo === 'texto' ? `"${o.txt}"` : o.seta ? 'seta' : 'traço';
        linhas.push(`| ${fmt(o.t0)} a ${fmt(o.t1)} | ${nome}${o.cor !== 'tinta' ? ` (${o.cor})` : ''} | lápis |`);
      });
    });
  }
  linhas.push(`| ${fmt(agenda.dur)} | fim | - |`);
  return linhas.join('\n');
};
