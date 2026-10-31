export type RoteiroCarrossel = {
  formato: 'carrossel'; take: string; inicioTake: number; velocidade: number;
  slides: string[]; introSeg: number; porSlide: number;
};
export type Trecho = {inicio: number; fim: number};

export const duracaoCarrossel = (r: RoteiroCarrossel) => r.introSeg + r.porSlide * r.slides.length;
export const inicioSlides = (r: RoteiroCarrossel) => r.slides.map((_, i) => r.introSeg + r.porSlide * i);

export const duracaoTrechos = (t: Trecho[]) => t.reduce((s, c) => s + (c.fim - c.inicio), 0);

/** A legenda foi marcada no tempo do vídeo original; a timeline final pulou os silêncios. */
export const paraTempoOriginal = (trechos: Trecho[], tFinal: number): number => {
  let acumulado = 0;
  for (const t of trechos) {
    const d = t.fim - t.inicio;
    if (tFinal < acumulado + d) return t.inicio + (tFinal - acumulado);
    acumulado += d;
  }
  return trechos.length ? trechos[trechos.length - 1].fim : 0;
};
