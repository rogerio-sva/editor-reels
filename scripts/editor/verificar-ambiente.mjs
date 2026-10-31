#!/usr/bin/env node
/* Confere se tudo que a Edição precisa está no lugar e diz como resolver o que faltar.
 * A chave e a voz da ElevenLabs são opcionais: só o vídeo do zero (narração) exige; sem a chave,
 * a transcrição usa o Whisper local e o áudio do take é tratado só com o filtro do ffmpeg.
 *   node scripts/editor/verificar-ambiente.mjs
 */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {lerEnv} from './lib/env.mjs';
import {validarMarca} from '../../src/editor/marca.ts';
import {gerarSfx} from './sfx.mjs';

const versaoOk = (v, [ma, mi]) => {
  const [a, b] = v.replace(/^v/, '').split('.').map(Number);
  return a > ma || (a === ma && b >= mi);
};

export const verificarAmbiente = ({env, node, temFfmpeg, temModulos = true, marca = null, temSfx = true}) => {
  const itens = [
    {nome: 'Node 22.18 ou mais novo', ok: versaoOk(node, [22, 18]),
      como: `você tem o Node ${node}; instale a versão LTS em nodejs.org ou rode "brew install node"`},
    {nome: 'ffmpeg', ok: temFfmpeg, como: 'Mac: "brew install ffmpeg"; Windows: "winget install Gyan.FFmpeg"'},
    {nome: 'dependências (npm install)', ok: temModulos, como: 'rode "npm install" nesta pasta'},
    {nome: 'chave da ElevenLabs', ok: Boolean(env.ELEVENLABS_API_KEY), opcional: true,
      como: 'só para o vídeo do zero (narração) e para limpar o áudio do take; copie .env.exemplo para .env e cole a chave em ELEVENLABS_API_KEY'},
    {nome: 'voz da narração', ok: Boolean(env.ELEVENLABS_VOICE_ID), opcional: true,
      como: 'só para o vídeo do zero: escolha uma voz (references/edicao/instalar.md, passo 4) e grave o id em ELEVENLABS_VOICE_ID no .env'},
  ];
  if (marca) {
    const v = validarMarca(marca);
    itens.push({nome: 'marca/marca.json', ok: v.ok, como: v.erros.join('; ')});
  }
  itens.push({nome: 'efeito sonoro de troca', ok: temSfx, como: 'rode "node scripts/editor/sfx.mjs"'});
  return {ok: itens.every((i) => i.ok || i.opcional), itens};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let temFfmpeg = true;
  try { execFileSync('ffmpeg', ['-version'], {stdio: 'ignore'}); } catch { temFfmpeg = false; }
  if (temFfmpeg && !fs.existsSync('assets/sfx/troca.wav')) gerarSfx();
  let marca = {};
  try { marca = JSON.parse(fs.readFileSync('marca/marca.json', 'utf8')); } catch { /* validarMarca acusa */ }
  const r = verificarAmbiente({env: lerEnv(), node: process.version, temFfmpeg,
    temModulos: fs.existsSync('node_modules/remotion'), marca, temSfx: fs.existsSync('assets/sfx/troca.wav')});
  for (const i of r.itens) console.log(`${i.ok ? 'ok      ' : i.opcional ? 'opcional' : 'FALTA   '}  ${i.nome}${i.ok ? '' : `: ${i.como}`}`);
  console.log(r.ok ? '\nTudo pronto.' : '\nResolva os itens marcados com FALTA e rode de novo.');
  process.exit(r.ok ? 0 : 1);
}
