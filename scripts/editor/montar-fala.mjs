#!/usr/bin/env node
/* Monta um criativo falado juntando peças gravadas separado: gancho, corpo e chamada.
 * Cada peça tem o silêncio cortado; as palavras vão para a linha do tempo final; na passagem
 * da primeira peça (o gancho) para a segunda entra o clarão de transição.
 *
 *   node scripts/editor/montar-fala.mjs --nome F1 --estilo selfie \
 *        --pecas entrada/gancho.mov,entrada/corpo.mov,entrada/chamada.mov \
 *        [--palavras saida/gancho.palavras.json,...]   (sem isso, transcreve cada peça)
 *
 * Estilos: selfie, caixinha, dividida, call. Provas, closes em P&B, título e oferta o agente
 * escreve depois no roteiro (roteiros/<nome>.json), e a pessoa aprova.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepararVideo} from './preparar-video.mjs';
import {cortarSilencio} from './cortar-silencio.mjs';
import {transcrever} from './transcrever.mjs';
import {clipesNaLinha, palavrasDoClipe} from '../../src/editor/fala.ts';

const ESTILOS = ['selfie', 'caixinha', 'dividida', 'call'];

export const montarFala = async ({nome, estilo = 'selfie', pecas, palavrasJson = []}) => {
  if (!nome) throw new Error('falta --nome');
  if (!ESTILOS.includes(estilo)) throw new Error(`estilo desconhecido: ${estilo} (use ${ESTILOS.join(', ')})`);
  if (!pecas?.length) throw new Error('falta --pecas');
  const clipes = [];
  const fontes = [];
  const limites = [];
  for (const [i, peca] of pecas.entries()) {
    const publico = prepararVideo(peca, `${nome}/peca-${i + 1}.mp4`);
    const {trechos} = cortarSilencio(peca);
    const fonte = palavrasJson[i]
      ? JSON.parse(fs.readFileSync(palavrasJson[i], 'utf8')).palavras
      : (await transcrever(peca)).palavras;
    // Apara as pontas pela fala: o silêncio antes da primeira e depois da última palavra vira
    // "pessoa parada" no corte entre peças (medido: 1,4 s no primeiro lote, em 24/09/2026).
    const primeira = fonte[0]?.start ?? 0, ultima = fonte.at(-1)?.end ?? Infinity;
    for (const t of trechos) {
      const de = Math.max(t.inicio, primeira - 0.08), ate = Math.min(t.fim, ultima + 0.12);
      if (ate - de > 0.08) { clipes.push({video: publico, de: +de.toFixed(3), ate: +ate.toFixed(3)}); fontes.push(fonte); }
    }
    limites.push(clipes.length);
  }
  const linha = clipesNaLinha(clipes);
  const palavras = linha.flatMap((c, i) => palavrasDoClipe(fontes[i], c, c.inicio));
  const fimGancho = linha[limites[0] - 1]?.fim;
  const roteiro = {formato: 'fala', estilo, clipes, palavras, provas: [], pb: [],
    flashes: pecas.length > 1 && fimGancho ? [+fimGancho.toFixed(3)] : []};
  fs.mkdirSync('roteiros', {recursive: true});
  const destino = `roteiros/${nome}.json`;
  fs.writeFileSync(destino, JSON.stringify(roteiro, null, 2));
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (n) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  console.log(await montarFala({nome: opt('nome'), estilo: opt('estilo'), pecas: opt('pecas')?.split(','),
    palavrasJson: opt('palavras')?.split(',') ?? []}));
}
