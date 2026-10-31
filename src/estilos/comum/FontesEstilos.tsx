/* Fontes dos estilos editorial e quadro (todas OFL, em public/fonts, licenças na mesma pasta).
   Envolva a composição em <FontesEstilos> para nada ser medido ou desenhado antes de a fonte chegar. */
import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

export const FE = {
  serif: 'Instrument Serif', // títulos e tarja do editorial
  mono: 'Courier Prime', // cupom (máquina de escrever)
  sans: 'Inter', // interface (comentário, pílula)
  mao: 'Caveat', // anotação à mão (vermelho do editorial)
  quadro: 'Saira Condensed', // letra do quadro (inclinada no componente)
};

const LISTA: [string, string, FontFaceDescriptors][] = [
  [FE.serif, 'InstrumentSerif-Regular.ttf', { style: 'normal' }],
  [FE.serif, 'InstrumentSerif-Italic.ttf', { style: 'italic' }],
  [FE.mono, 'CourierPrime-Regular.ttf', { weight: '400' }],
  [FE.mono, 'CourierPrime-Bold.ttf', { weight: '700' }],
  [FE.sans, 'Inter-Variable.ttf', { weight: '100 900' }],
  [FE.mao, 'Caveat.ttf', { weight: '400 700' }],
  [FE.quadro, 'SairaCondensed-Light.ttf', { weight: '300' }],
  [FE.quadro, 'SairaCondensed-Regular.ttf', { weight: '400' }],
];

let promessa: Promise<void> | null = null;
let prontas = false;
const carregar = () => {
  if (!promessa) {
    promessa = Promise.all(
      LISTA.map(([fam, arq, d]) =>
        new FontFace(fam, `url(${staticFile('fonts/' + arq)}) format('truetype')`, d).load().then((ok) => {
          (document.fonts as unknown as { add: (f: FontFace) => void }).add(ok);
        }),
      ),
    ).then(() => {
      prontas = true;
    });
  }
  return promessa;
};

export const FontesEstilos: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [pronto, setPronto] = useState(prontas);
  const [handle] = useState(() => (prontas ? null : delayRender('fontes dos estilos')));
  useEffect(() => {
    if (pronto) return;
    carregar()
      .then(() => setPronto(true))
      .catch((e) => cancelRender(new Error('FontesEstilos: ' + String(e))));
  }, [pronto]);
  useEffect(() => {
    if (pronto && handle !== null) continueRender(handle);
  }, [pronto, handle]);
  return pronto ? <>{children}</> : null;
};

/** Largura de um texto já com a fonte carregada (px). */
export const medirTexto = (txt: string, fonte: string) => {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = fonte;
  return c.measureText(txt).width;
};
