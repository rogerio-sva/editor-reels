#!/usr/bin/env node
/* Transcreve a fala com o tempo de cada palavra.
 * 1º ElevenLabs (mesma chave da narração). 2º Whisper local, sem chave, se a API falhar.
 * O áudio é normalizado antes: vídeo de celular a -45 dB faz o Whisper alucinar repetição.
 *   node scripts/editor/transcrever.mjs entrada/video.mov
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh} from './lib/sh.mjs';
import {lerEnv} from './lib/env.mjs';

export const palavrasDoScribe = (json) =>
  (json.words ?? []).filter((w) => w.type === 'word')
    .map((w) => ({text: w.text.trim(), start: w.start, end: w.end}));

export const transcreverElevenLabs = async (arquivo, {chave, fetchImpl = fetch}) => {
  const form = new FormData();
  form.set('file', new Blob([fs.readFileSync(arquivo)]), path.basename(arquivo));
  form.set('model_id', 'scribe_v1');
  form.set('timestamps_granularity', 'word');
  form.set('language_code', 'por');
  const r = await fetchImpl('https://api.elevenlabs.io/v1/speech-to-text',
    {method: 'POST', headers: {'xi-api-key': chave}, body: form});
  if (!r.ok) throw new Error(`ElevenLabs recusou a transcrição (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return palavrasDoScribe(await r.json());
};

const audioNormalizado = (entrada) => {
  fs.mkdirSync('saida', {recursive: true});
  const wav = `saida/${path.basename(entrada).replace(/\.\w+$/, '')}.16k.wav`;
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', entrada, '-vn', '-ac', '1', '-ar', '16000',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', wav]);
  return wav;
};

const WHISPER_VERSAO = '1.5.5';

const transcreverWhisperLocal = async (wav) => {
  const {installWhisperCpp, downloadWhisperModel, transcribe, toCaptions} = await import('@remotion/install-whisper-cpp');
  const pasta = path.resolve('.whisper');
  await installWhisperCpp({to: pasta, version: WHISPER_VERSAO});
  await downloadWhisperModel({model: 'small', folder: pasta});
  const saida = await transcribe({inputPath: path.resolve(wav), whisperPath: pasta, whisperCppVersion: WHISPER_VERSAO,
    model: 'small', tokenLevelTimestamps: true, language: 'pt'});
  return juntarTokens(toCaptions({whisperCppOutput: saida}).captions);
};

/** O Whisper devolve pedaços de palavra (" méd", "icos", ","): pedaço com espaço na frente abre palavra nova; o resto cola na anterior. */
export const juntarTokens = (legendas) => {
  const palavras = [];
  for (const c of legendas) {
    const bruto = String(c.text ?? '');
    const texto = bruto.trim();
    if (!texto || /^\[.*\]$/.test(texto)) continue;
    const fim = c.endMs / 1000;
    if (/^\s/.test(bruto) || !palavras.length) palavras.push({text: texto, start: c.startMs / 1000, end: fim});
    else {
      const u = palavras[palavras.length - 1];
      u.text += texto;
      u.end = fim;
    }
  }
  return palavras;
};

/** Transcreve um vídeo: ElevenLabs se houver chave, senão Whisper local. */
export const transcrever = async (entrada, {log = console.log} = {}) => {
  const wav = audioNormalizado(entrada);
  const chave = lerEnv().ELEVENLABS_API_KEY;
  let fonte = 'elevenlabs', palavras;
  try {
    if (!chave) throw new Error('sem chave da ElevenLabs no .env');
    palavras = await transcreverElevenLabs(wav, {chave});
  } catch (e) {
    log(`ElevenLabs indisponível (${e.message}). Usando o Whisper local, que é mais lento.`);
    fonte = 'whisper';
    palavras = await transcreverWhisperLocal(wav);
  }
  fs.rmSync(wav, {force: true});
  return {fonte, palavras};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const entrada = process.argv[2];
  if (!entrada) { console.error('uso: node scripts/editor/transcrever.mjs <video>'); process.exit(1); }
  const {fonte, palavras} = await transcrever(entrada);
  const destino = `saida/${path.basename(entrada).replace(/\.\w+$/, '')}.palavras.json`;
  fs.writeFileSync(destino, JSON.stringify({fonte, palavras}, null, 2));
  console.log(`${palavras.length} palavras (${fonte}): ${destino}`);
}
