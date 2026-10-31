export type Palavra = {text: string; start: number; end: number};
export type Frase = {texto: string; de: number; ate: number};

const limpo = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');

/** Segundo em que a frase começa a ser falada; -1 se não for dita. */
export const quando = (palavras: Palavra[], frase: string): number => {
  const alvo = limpo(frase).split(' ').filter(Boolean);
  if (!alvo.length) return -1;
  for (let i = 0; i <= palavras.length - alvo.length; i++) {
    if (alvo.every((a, j) => limpo(palavras[i + j].text) === a)) return palavras[i].start;
  }
  return -1;
};

/** Frases separadas pelo ponto final ou por pausa da própria fala. */
export const frases = (palavras: Palavra[], pausa = 0.34): Frase[] => {
  const saida: Frase[] = [];
  let atual: Palavra[] = [];
  const fechar = () => {
    if (!atual.length) return;
    saida.push({texto: atual.map((p) => p.text).join(' '), de: atual[0].start, ate: atual[atual.length - 1].end});
    atual = [];
  };
  palavras.forEach((p, i) => {
    atual.push(p);
    const prox = palavras[i + 1];
    if (!prox || /[.!?]$/.test(p.text) || prox.start - p.end >= pausa) fechar();
  });
  fechar();
  return saida;
};

/** Cada cena começa na âncora dela e termina na âncora da seguinte; a primeira começa no zero. */
export const montarCenas = <T extends {ancora: string}>(
  palavras: Palavra[], cenas: T[], duracao: number,
): (T & {de: number; ate: number})[] =>
  cenas.map((c, i) => {
    const dita = quando(palavras, c.ancora);
    if (dita < 0) throw new Error(`a âncora "${c.ancora}" não aparece na fala`);
    const de = i === 0 ? 0 : dita; // a primeira cena já está na tela no quadro zero
    const prox = cenas[i + 1];
    const ate = prox ? quando(palavras, prox.ancora) : duracao;
    if (ate < 0) throw new Error(`a âncora "${prox!.ancora}" não aparece na fala`);
    return {...c, de, ate};
  });

/** Grupos de até `max` palavras que nunca atravessam o fim de uma frase nem uma pausa da fala. */
export const grupos = (palavras: Palavra[], pausa = 0.34, max = 3): number[][] => {
  const out: number[][] = [];
  let atual: number[] = [];
  palavras.forEach((p, i) => {
    atual.push(i);
    const prox = palavras[i + 1];
    if (!prox || atual.length === max || /[.!?]$/.test(p.text) || prox.start - p.end >= pausa) {
      out.push(atual);
      atual = [];
    }
  });
  return out;
};
