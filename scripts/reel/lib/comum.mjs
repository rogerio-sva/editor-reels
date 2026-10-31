import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const WIN = process.platform === 'win32';
export const remotion = (args) => execFileSync(WIN ? 'npx.cmd' : 'npx', ['remotion', ...args], { stdio: 'inherit', shell: WIN });
export const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
export const lerJson = (arq) => JSON.parse(fs.readFileSync(arq, 'utf8'));
export const gravarJson = (arq, d) => { fs.mkdirSync(path.dirname(arq), { recursive: true }); fs.writeFileSync(arq, JSON.stringify(d, null, 1)); };
export const opcoes = (argv) => Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
export const posicionais = (argv) => argv.filter((a) => !a.startsWith('--'));

export const marca = () => {
  const m = fs.existsSync('marca/marca.json') ? lerJson('marca/marca.json') : {};
  return { nome: m.nome ?? '', handle: m.handle ?? '', logo: m.logo ?? '', cores: m.cores ?? {}, chamadas: m.chamadas ?? [] };
};

/** Folha de quadros em ffmpeg puro: n quadros espalhados pelo vídeo, em grade. */
export const folha = (video, saida, { n = 12, colunas = 6, dur }) => {
  const t = Math.max(0.1, dur / n);
  ff(['-i', video, '-vf', `fps=1/${t.toFixed(3)},scale=270:-2,tile=${colunas}x${Math.ceil(n / colunas)}`, '-frames:v', '1', '-q:v', '4', saida]);
};
