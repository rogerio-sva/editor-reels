#!/usr/bin/env node
/* Gera o efeito sonoro de troca de slide: um "tec" curto com sopro, ~0,17 s.
 * É gerado aqui para o produto não depender de arquivo de áudio de terceiros.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sh} from './lib/sh.mjs';

export const gerarSfx = (destino = 'assets/sfx/troca.wav') => {
  fs.mkdirSync(path.dirname(destino), {recursive: true});
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-filter_complex',
    'anoisesrc=d=0.17:c=pink:a=0.9,highpass=f=1200,lowpass=f=8000,afade=t=in:d=0.004,' +
    'afade=t=out:st=0.01:d=0.16:curve=exp[n];sine=f=1500:d=0.03,afade=t=out:d=0.03:curve=exp,volume=0.6[c];' +
    '[n][c]amix=inputs=2:normalize=0,volume=1.6,aresample=48000[o]',
    '-map', '[o]', '-ac', '2', destino]);
  return destino;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`pronto: ${gerarSfx()}`);
