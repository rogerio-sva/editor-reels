#!/usr/bin/env node
/* Monta o vídeo a partir da partitura.
     node scripts/reel/render.mjs <nome> [--previa] [--sem-chamada]
   Lê saida/<nome>/partitura.json (o agente escreve), src/videos/<nome>/tempos.json (aplicar-cortes grava),
   saida/<nome>/info.json (preparar grava) e marca/marca.json. Valida, renderiza, acerta o volume (-14 LUFS), faz a
   capa e a conferência. Saída: out/<nome>.mp4, out/<nome>-capa.jpg e out/<nome>-conferencia.jpg.
   --previa: meia resolução, sem volume nem conferência, para aprovar antes do render final. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { conferir } from './conferir.mjs';
import { ff, folha, gravarJson, lerJson, marca, opcoes, posicionais, remotion } from './lib/comum.mjs';
import { validarCapitulos, validarCenas } from './lib/validar.mjs';

const args = process.argv.slice(2);
const [nome] = posicionais(args);
const op = opcoes(args);
if (!nome) { console.error('Uso: node scripts/reel/render.mjs <nome> [--previa] [--sem-chamada]'); process.exit(1); }
const MODELOS = lerJson('src/biblioteca/modelos.json');
const dir = path.join('saida', nome);
const part = lerJson(path.join(dir, 'partitura.json'));
const info = lerJson(path.join(dir, 'info.json'));
const tempos = lerJson(path.join('src', 'videos', nome, 'tempos.json'));
const palavras = tempos.palavras;
const modelo = MODELOS[part.modelo] ? part.modelo : 'podcast';
const m = MODELOS[modelo];
const mc = marca();

/** Chamada final: a da partitura; senão uma de marca.json, fixa por vídeo. "gatilho" só com automação real respondendo. */
const chamada = () => {
  if (part.final) return part.final;
  const lista = mc.chamadas.length ? mc.chamadas : [{ tipo: 'comentario', titulo: 'Você concorda?', sub: 'Deixe seu comentário' }, { tipo: 'seguir', titulo: 'Siga para mais dicas', sub: 'Toda semana tem conteúdo novo' }];
  return lista[parseInt(crypto.createHash('md5').update(nome).digest('hex').slice(0, 8), 16) % lista.length];
};

fs.mkdirSync('out', { recursive: true });
const saida = path.join('out', `${nome}${op.previa ? '-previa' : ''}.mp4`);
const props = path.join(dir, 'props.json');
const bruto = op.previa ? saida : path.join(dir, 'bruto.mp4');

if (m.estilo === 'editorial') {
  // editorial: a partitura é o roteiro do estilo (references/estilos/editorial/ESTILO.md)
  const pasta = path.join('src', 'videos', nome);
  const roteiro = { estilo: 'editorial', volumeVideo: 1, ...part.roteiro, video: `reels/${nome}/video-com-som.mp4`, recorte: info.recorte };
  ff(['-i', path.join(dir, 'corte.mp4'), '-c', 'copy', path.join('public', 'reels', nome, 'video-com-som.mp4')]);
  gravarJson(path.join(pasta, 'roteiro.json'), roteiro);
  execFileSync('node', ['scripts/trilha.mjs', pasta, `--saida=public/reels/${nome}/trilha.wav`], { stdio: 'inherit' });
  roteiro.trilha = `reels/${nome}/trilha.wav`;
  gravarJson(props, { roteiro, tempos });
  remotion(['render', 'src/index.ts', 'EditorialPartitura', bruto, `--props=${props}`, '--crf=20', ...(op.previa ? ['--scale=0.5'] : [])]);
} else {
  const { cenas, avisos } = validarCenas(part.cenas, palavras);
  const caps = m.capitulos ? validarCapitulos(part.capitulos, palavras) : { capitulos: [], avisos: [] };
  [...avisos, ...caps.avisos].forEach((a) => console.log('aviso:', a));
  const paleta = { ...(m.tema === 'marca' && mc.cores.destaque ? { acento: mc.cores.destaque } : {}), ...(m.paleta ?? {}), ...(part.paleta ?? {}) };
  gravarJson(props, {
    video: `reels/${nome}/video.mp4`, audio: `reels/${nome}/audio.m4a`, ultimo: `reels/${nome}/ultimo.jpg`, recorte: info.recorte ?? null,
    larguraOrig: info.largura, alturaOrig: info.altura, rosto: part.rosto ?? null,
    planos: part.planos?.length ? part.planos : [{ a: 0, b: info.duracao, tipo: info.altura > info.largura ? 'vertical' : 'rosto', x: part.foco ?? 0.5 }],
    palavras, fim_s: palavras[palavras.length - 1].e, modelo, tema: m.tema, paleta, pessoa: part.pessoa ?? null,
    marca: { nome: mc.nome, handle: mc.handle, logo: mc.logo }, cenas, capitulos: caps.capitulos,
    final: op['sem-chamada'] ? { tipo: 'seguir', titulo: mc.nome, sub: '' } : chamada(), sfx: true,
  });
  remotion(['render', 'src/index.ts', 'Partitura', bruto, `--props=${props}`, '--crf=20', ...(op.previa ? ['--scale=0.5'] : [])]);
}

if (op.previa) { console.log(`prévia: ${saida}`); process.exit(0); }
execFileSync('node', ['scripts/editor/masterizar.mjs', bruto, saida], { stdio: 'inherit' });
ff(['-ss', '2', '-i', saida, '-frames:v', '1', '-q:v', '2', path.join('out', `${nome}-capa.jpg`)]);
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', saida], { encoding: 'utf8' }));
folha(saida, path.join('out', `${nome}-conferencia.jpg`), { n: 18, colunas: 9, dur });
const av = conferir(saida);
console.log(`\npronto: ${saida}\nconferência: ${av.length ? '' : 'nada a corrigir'}`);
av.forEach((a) => console.log(' -', a));
console.log(`olhe out/${nome}-conferencia.jpg antes de entregar`);
