#!/usr/bin/env node
/* Gera a narração do roteiro, bloco a bloco, pela ElevenLabs. SÓ roda depois do roteiro aprovado:
 * é o passo que gasta crédito.
 *   node scripts/editor/narrar.mjs roteiros/meu-video.json
 *
 * Por que bloco a bloco: a ElevenLabs varia ~15% de ritmo de um take para outro. Cada bloco é
 * gerado separado (e guardado em cache), então refazer um bloco não muda os outros.
 * Por que sem pausa: silêncio inserido entre blocos soa "frase por frase" e foi reprovado.
 * A cauda de cada bloco é cortada no fim da última palavra + 0,18 s, com fade, e os blocos se emendam.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {sh, duracao} from './lib/sh.mjs';
import {lerEnv} from './lib/env.mjs';

const COLA = 0.18;
const FADE_MIN = 0.06;

export const limitarVelocidade = (v) => Math.min(1.08, Math.max(1.0, v));

export const palavrasDoAlinhamento = (al, deslocamento) => {
  const out = [];
  let buf = '', t0 = 0, fim = 0;
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (buf) out.push({text: buf, start: t0, end: fim});
      buf = '';
      return;
    }
    if (!buf) t0 = al.character_start_times_seconds[i];
    buf += c;
    fim = al.character_end_times_seconds[i];
  });
  if (buf) out.push({text: buf, start: t0, end: fim});
  const r = (x) => Number((x + deslocamento).toFixed(3));
  return out.map((p) => ({text: p.text, start: r(p.start), end: r(p.end)}));
};

const ttsElevenLabs = (chave) => async (texto, {voz, velocidade}) => {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps`, {
    method: 'POST',
    headers: {'xi-api-key': chave, 'Content-Type': 'application/json'},
    body: JSON.stringify({text: texto, model_id: 'eleven_multilingual_v2',
      voice_settings: {stability: 0.48, similarity_boost: 0.67, style: 0.41, use_speaker_boost: true, speed: velocidade}}),
  });
  if (!r.ok) throw new Error(`ElevenLabs recusou a narração (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return {audio: Buffer.from(j.audio_base64, 'base64'), alinhamento: j.alignment};
};

const inicioDoSilencioFinal = (arquivo, total) => {
  const log = sh('bash', ['-c', `ffmpeg -hide_banner -i ${JSON.stringify(arquivo)} -af silencedetect=noise=-35dB:d=0.10 -f null - 2>&1`]);
  let ini = null, ultimo = null;
  for (const l of log.split('\n')) {
    const a = l.match(/silence_start:\s*([\d.]+)/);
    const b = l.match(/silence_end:\s*([\d.]+)/);
    if (a) ini = Number(a[1]);
    if (b) { if (Number(b[1]) >= total - 0.02) ultimo = ini; ini = null; }
  }
  return ini ?? ultimo; // silêncio que vai até o fim do arquivo
};

/** Corta a cauda no início do silêncio final + COLA, com fade; o decaimento da voz fica inteiro. */
const aparar = (mp3, destino) => {
  const total = duracao(mp3);
  const s0 = inicioDoSilencioFinal(mp3, total);
  const corte = s0 === null ? total : Math.min(total, s0 + COLA);
  const fade = s0 === null ? FADE_MIN : Math.max(FADE_MIN, corte - s0);
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-t', corte.toFixed(3),
    '-af', `afade=t=out:st=${Math.max(0, corte - fade).toFixed(3)}:d=${fade.toFixed(3)}`, '-ar', '44100', '-ac', '1', destino]);
  return duracao(destino);
};

export const narrar = async ({blocos, voz, chave, pasta, velocidade = 1.0, ttsImpl}) => {
  const tts = ttsImpl ?? ttsElevenLabs(chave);
  const v = limitarVelocidade(velocidade);
  const cache = path.join(pasta, '.cache');
  fs.mkdirSync(cache, {recursive: true});
  const pecas = [];
  const palavras = [];
  let cursor = 0;
  for (const b of blocos) {
    const h = crypto.createHash('sha1').update(`${b.texto}|${voz}|${v}`).digest('hex').slice(0, 16);
    const mp3 = path.join(cache, `${h}.mp3`);
    const js = path.join(cache, `${h}.json`);
    if (!fs.existsSync(mp3) || !fs.existsSync(js)) {
      const r = await tts(b.texto, {voz, velocidade: v});
      fs.writeFileSync(mp3, r.audio);
      fs.writeFileSync(js, JSON.stringify(r.alinhamento));
    }
    const wav = path.join(pasta, `${b.id}.wav`);
    const d = aparar(mp3, wav);
    palavras.push(...palavrasDoAlinhamento(JSON.parse(fs.readFileSync(js, 'utf8')), cursor)
      .filter((p) => p.start < cursor + d));
    pecas.push(wav);
    cursor += d;
  }
  const lista = path.join(pasta, 'lista.txt');
  fs.writeFileSync(lista, pecas.map((p) => `file '${path.resolve(p)}'`).join('\n'));
  const saida = path.join(pasta, 'narracao.wav');
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '1', saida]);
  return {wav: saida, palavras, duracao: Number(duracao(saida).toFixed(3))};
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const roteiroPath = process.argv[2];
  if (!roteiroPath) { console.error('uso: node scripts/editor/narrar.mjs <roteiro.json>'); process.exit(1); }
  const env = lerEnv();
  if (!env.ELEVENLABS_API_KEY) { console.error('falta ELEVENLABS_API_KEY no .env (veja .env.exemplo)'); process.exit(1); }
  if (!env.ELEVENLABS_VOICE_ID) { console.error('falta ELEVENLABS_VOICE_ID no .env: siga o references/edicao/instalar.md da skill (passo 4)'); process.exit(1); }
  const roteiro = JSON.parse(fs.readFileSync(roteiroPath, 'utf8'));
  const nome = path.basename(roteiroPath, '.json');
  const r = await narrar({blocos: roteiro.narracao.blocos, voz: env.ELEVENLABS_VOICE_ID, chave: env.ELEVENLABS_API_KEY,
    pasta: `public/${nome}`, velocidade: roteiro.narracao.velocidade ?? 1.0});
  Object.assign(roteiro, {audio: `${nome}/narracao.wav`, palavras: r.palavras, duracao: r.duracao});
  fs.writeFileSync(roteiroPath, JSON.stringify(roteiro, null, 2));
  console.log(`narração de ${r.duracao.toFixed(1)} s, ${r.palavras.length} palavras: public/${nome}/narracao.wav`);
}
