/* Paleta e medidas do estilo editorial (referência: @justyn.ai). Troque a paleta pelo roteiro.json
   ("paleta": { "verde": "#...", ... }) sem mexer aqui. */
export const PALETA_EDITORIAL = {
  verde: '#1E3A2A', // tarja, telas cheias, pílula
  verdeEscuro: '#14281D',
  creme: '#F2EAD8', // título, texto sobre verde
  ouro: '#D9B862', // itálico de destaque
  papel: '#F5F0E4', // cupom, cartões
  tinta: '#2A2824', // texto sobre papel
  cinza: '#8A8478', // texto secundário sobre papel
  vermelho: '#C8372D', // anotação à mão, risco
};
export type Paleta = typeof PALETA_EDITORIAL;

export const MEDIDAS = {
  tituloAtras: 300, // px, serif, caixa alta (encolhe sozinho para caber em tituloAtrasLargura)
  tituloAtrasLargura: 880, // px: com o zoom da câmera (até ~1,1x) sobra margem de cada lado
  manchete: 150,
  legenda: 60, // tarja
  legendaY: 1290, // altura do peito em 1080x1920
  cartaoTopo: 200, // y onde os cartões de cima começam
  sombra: '0 18px 34px rgba(0,0,0,.36)',
};
