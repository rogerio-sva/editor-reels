import {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';
import {getAvailableFonts} from '@remotion/google-fonts';
import type {Marca} from './marca';

/** Carrega do Google Fonts as fontes da marca e segura o render até chegarem. */
export const usarFontes = (marca: Marca, extras: string[] = []) => {
  const [h] = useState(() => delayRender('fontes da marca'));
  useEffect(() => {
    const nomes = [...new Set([marca.fontes.titulo, marca.fontes.corpo, ...extras])];
    Promise.all(nomes.map(async (n) => {
      const f = getAvailableFonts().find((x) => x.fontFamily === n);
      if (!f) throw new Error(`a fonte "${n}" não existe no Google Fonts; troque em marca/marca.json`);
      const fonte = await f.load();
      await fonte.loadFont('normal', {subsets: ['latin', 'latin-ext'].filter((s) => fonte.getInfo().subsets.includes(s))}).waitUntilDone();
    })).then(() => continueRender(h)).catch((e) => cancelRender(e));
  }, [h, marca.fontes.titulo, marca.fontes.corpo, extras.join('|')]);
};
