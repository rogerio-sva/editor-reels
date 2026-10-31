/* Curvas e helpers dos estilos (sem dependência). */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** suave nas duas pontas */
export const eio = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
/** sai rápido e assenta */
export const eout = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
/** passa do ponto e volta (mola curta, sem física) */
export const volta = (t: number, k = 1.7) => { t = clamp(t); return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
/** progresso de uma janela [t0, t0+d] */
export const janela = (t: number, t0: number, d: number) => clamp((t - t0) / d);
/** aleatório com semente: o mesmo quadro sai igual em todo render */
export const rng = (semente: number) => {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** "texto com *itálico*" → partes [{txt, it}] */
export const partes = (s: string) =>
  s.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => (p.startsWith('*') ? { txt: p.slice(1, -1), it: true } : { txt: p, it: false }));
