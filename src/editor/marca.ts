export type Marca = {
  nome: string;
  cores: {fundo: string; texto: string; destaque: string; suave: string};
  fontes: {titulo: string; corpo: string};
  logo?: string;
  handle?: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

const luminancia = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

/** Razão de contraste WCAG entre duas cores #RRGGBB (1 a 21). */
export const contraste = (a: string, b: string): number => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

export const validarMarca = (m: unknown): {ok: boolean; erros: string[]} => {
  const erros: string[] = [];
  const x = m as Partial<Marca>;
  if (!x || typeof x !== 'object') return {ok: false, erros: ['marca.json vazio ou inválido']};
  if (!x.nome) erros.push('falta o nome da marca');
  for (const k of ['fundo', 'texto', 'destaque', 'suave'] as const) {
    const v = x.cores?.[k];
    if (!v || !HEX.test(v)) erros.push(`cor ${k} precisa ser #RRGGBB (veio "${v ?? ''}")`);
  }
  for (const k of ['titulo', 'corpo'] as const) {
    if (!x.fontes?.[k]) erros.push(`fonte de ${k} vazia`);
  }
  const c = x.cores;
  if (c && HEX.test(c.texto ?? '') && HEX.test(c.fundo ?? '') && contraste(c.texto!, c.fundo!) < 4.5) {
    erros.push(`contraste entre texto e fundo é ${contraste(c.texto!, c.fundo!).toFixed(1)}:1, o mínimo é 4,5:1`);
  }
  return {ok: erros.length === 0, erros};
};
