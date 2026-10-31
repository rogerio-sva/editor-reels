#!/usr/bin/env node
/* Clonar estilo: mede um vídeo de referência para o agente estudar.
     node scripts/reel/referencia.mjs <video> <nome>
   Grava saida/ref-<nome>/: medidas.json (cortes por segundo, plano médio, volume) e folha-N.jpg (2 quadros por segundo).
   O agente olha as folhas e cria o modelo em src/biblioteca/modelos.json (passo a passo na skill). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ff, gravarJson, posicionais } from './lib/comum.mjs';

const [video, nome] = posicionais(process.argv.slice(2));
if (!video || !nome) { console.error('Uso: node scripts/reel/referencia.mjs <video> <nome>'); process.exit(1); }
const dir = path.join('saida', `ref-${nome}`);
fs.mkdirSync(dir, { recursive: true });
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' }));
const log = (a) => String(spawnSync('ffmpeg', ['-hide_banner', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr);
const cortes = [...new Set([...log(['-i', video, '-vf', "select='gt(scene,0.25)',showinfo", '-an', '-f', 'null', '-']).matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(Number(m[1]).toFixed(2))))].sort((a, b) => a - b);
const planos = [0, ...cortes, dur].map((t, i, l) => (i ? t - l[i - 1] : 0)).slice(1);
const lufs = [...log(['-i', video, '-af', 'ebur128', '-f', 'null', '-']).matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
const medidas = { duracao: Number(dur.toFixed(1)), cortes: cortes.length, cortes_por_s: Number((cortes.length / dur).toFixed(2)), plano_medio_s: Number((planos.reduce((a, b) => a + b, 0) / planos.length).toFixed(2)), plano_mais_longo_s: Number(Math.max(...planos).toFixed(1)), lufs: lufs ? Number(lufs[1]) : null };
gravarJson(path.join(dir, 'medidas.json'), medidas);
ff(['-i', video, '-vf', 'fps=2,scale=240:-2,tile=6x4', '-q:v', '4', path.join(dir, 'folha-%d.jpg')]);
console.log(JSON.stringify(medidas));
console.log(`folhas em ${dir}/ (cada quadro = 0,5 s; 12 s por folha)`);
