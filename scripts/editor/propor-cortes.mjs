#!/usr/bin/env node
/* Take bruto, passo 1 de 2: trata o áudio, transcreve palavra a palavra e PROPÕE os cortes
 * (frases refeitas, interrompidas, hesitação e silêncios). Não corta nada: grava a proposta em
 * saida/<nome>/cortes.json e mostra a lista de frases para o agente conferir.
 *
 *   node scripts/editor/propor-cortes.mjs <video bruto> <nome> [--sem-isolar] [--palavras=<json>]
 *
 * Áudio: com a chave da ElevenLabs no .env, a voz passa pelo isolamento de voz deles (tira eco e
 * ruído da sala; devolve o áudio com a mesma duração, então os tempos não mudam). Sem a chave, ou com
 * --sem-isolar, só o filtro do ffmpeg (graves, médios, presença e compressor). Resultado:
 * saida/<nome>/voz.wav, que o aplicar-cortes.mjs usa no lugar do som original.
 * --palavras=<json>  usa uma transcrição já feita ({palavras: [{text, start, end}]}) e não transcreve de novo.
 * Depois de conferir (e, se precisar, mudar "fica" de uma frase ou pôr índices em "tirarPalavras"):
 *   node scripts/editor/aplicar-cortes.mjs <nome>
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh, duracao} from './lib/sh.mjs';
import {lerEnv} from './lib/env.mjs';
import {proporCortes, trechosDasFrases, duracaoDosTrechos, tropeco} from './lib/cortes.mjs';
import {transcrever} from './transcrever.mjs';

/** Receita de voz aprovada para take de celular em sala com eco (EQ + compressor). */
export const FILTRO_VOZ = 'highpass=f=75,equalizer=f=250:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.5:g=2.5,' +
  'highshelf=f=9000:g=1.5,acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=4';

export const isolarVoz = async (arquivo, destino, {chave, fetchImpl = fetch}) => {
  const form = new FormData();
  form.set('audio', new Blob([fs.readFileSync(arquivo)]), path.basename(arquivo));
  const r = await fetchImpl('https://api.elevenlabs.io/v1/audio-isolation', {method: 'POST', headers: {'xi-api-key': chave}, body: form});
  if (!r.ok) throw new Error(`ElevenLabs recusou o isolamento de voz (${r.status}): ${(await r.text()).slice(0, 300)}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return destino;
};

/** Gera saida/<nome>/voz.wav: isolada (se der) e filtrada, com a mesma duração do vídeo. */
export const tratarAudio = async (video, pasta, {isolar = true, log = console.log} = {}) => {
  const bruto = path.join(pasta, 'bruto.wav');
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '48000', bruto]);
  let fonte = bruto;
  let isolado = false;
  const chave = lerEnv().ELEVENLABS_API_KEY;
  if (isolar && chave) {
    try {
      const mp3 = await isolarVoz(bruto, path.join(pasta, 'isolado.mp3'), {chave});
      const d0 = duracao(bruto), d1 = duracao(mp3);
      if (Math.abs(d0 - d1) > 0.15) throw new Error(`a voz isolada voltou com ${d1.toFixed(2)} s e o vídeo tem ${d0.toFixed(2)} s`);
      fonte = mp3;
      isolado = true;
    } catch (e) {
      log(`Isolamento de voz indisponível (${e.message}). Sigo só com o filtro do ffmpeg.`);
    }
  } else if (isolar) {
    log('Sem chave da ElevenLabs no .env: o áudio passa só pelo filtro do ffmpeg (sem o isolamento de voz).');
  }
  const voz = path.join(pasta, 'voz.wav');
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', fonte, '-af', `aresample=48000,${FILTRO_VOZ}`, '-ac', '1', '-c:a', 'pcm_s24le', voz]);
  return {voz, isolado};
};

const fmt = (s) => s.toFixed(2).replace('.', ',');

export const tabelaDeFrases = (palavras, frases) => frases.map((f) => {
  const ws = palavras.slice(f.palavras[0], f.palavras[1] + 1);
  const aviso = ws.map((p, k) => (tropeco(p.text) ? `tropeço em "${p.text}" (palavra ${f.palavras[0] + k})` : '')).filter(Boolean);
  return `${String(f.n).padStart(3)}  ${fmt(f.de).padStart(6)}-${fmt(f.ate).padEnd(6)}  ${f.fica ? 'FICA' : 'SAI '}  ${(f.motivo || '').padEnd(20)} ${f.texto}` +
    (aviso.length ? `\n${' '.repeat(42)}atenção: ${aviso.join('; ')}` : '');
}).join('\n');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
  const [video, nome] = args.filter((a) => !a.startsWith('--'));
  if (!video || !nome) { console.error('uso: node scripts/editor/propor-cortes.mjs <video bruto> <nome> [--sem-isolar] [--palavras=<json>]'); process.exit(1); }
  if (!fs.existsSync(video)) { console.error(`não achei ${video}`); process.exit(1); }
  const pasta = path.join('saida', nome);
  fs.mkdirSync(pasta, {recursive: true});
  console.log('1/3 tratando o áudio…');
  const {voz, isolado} = await tratarAudio(video, pasta, {isolar: !opc['sem-isolar']});
  let fonte, palavras;
  if (opc.palavras) {
    ({fonte = 'arquivo', palavras} = JSON.parse(fs.readFileSync(opc.palavras, 'utf8')));
    console.log(`2/3 usando a transcrição de ${opc.palavras}`);
  } else {
    console.log('2/3 transcrevendo palavra a palavra…');
    ({fonte, palavras} = await transcrever(voz));
  }
  fs.writeFileSync(path.join(pasta, 'palavras.json'), JSON.stringify({fonte, palavras}, null, 1));
  console.log('3/3 propondo os cortes…');
  const frases = proporCortes(palavras);
  const cortes = {video: path.resolve(video), voz, isolado, fonte, duracaoOriginal: Number(duracao(video).toFixed(3)),
    pausa: 0.22, folga: 0.05, tirarPalavras: [], frases: frases.map(({n, de, ate, palavras: pw, texto, fica, motivo}) => ({n, de, ate, palavras: pw, texto, fica, motivo}))};
  fs.writeFileSync(path.join(pasta, 'cortes.json'), JSON.stringify(cortes, null, 1));
  const trechos = trechosDasFrases(palavras, frases);
  console.log(`\nFrases do take (${fonte === 'elevenlabs' ? 'transcrição da ElevenLabs' : fonte === 'whisper' ? 'transcrição do Whisper local' : 'transcrição dada'}, áudio ${isolado ? 'isolado + filtro' : 'só com filtro'}):\n`);
  console.log(tabelaDeFrases(palavras, frases));
  console.log(`\n${fmt(cortes.duracaoOriginal)} s viram ${fmt(duracaoDosTrechos(trechos))} s em ${trechos.length} trechos. Proposta: ${path.join(pasta, 'cortes.json')}`);
  console.log(`Confira a lista (fica sempre a última tomada). Para mudar: "fica" de cada frase ou "tirarPalavras" no cortes.json. Depois: node scripts/editor/aplicar-cortes.mjs ${nome}`);
}
