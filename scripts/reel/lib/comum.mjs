import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

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

/** Garante o navegador interno do Remotion. Em Node recente o download termina mas a descompactação falha em silêncio
    ("No browser found"): aqui o .zip é aberto com a ferramenta do sistema (unzip no Mac/Linux, tar no Windows). */
export const garantirNavegador = () => {
  const raiz = path.join('node_modules', '.remotion', 'chrome-headless-shell');
  const temBinario = (d) => fs.existsSync(d) && fs.readdirSync(d, { recursive: true }).some((f) => /chrome-headless-shell(\.exe)?$/.test(path.basename(String(f))));
  const pronto = () => fs.existsSync(raiz) && fs.readdirSync(raiz).some((d) => !d.endsWith('.zip') && temBinario(path.join(raiz, d)));
  if (pronto()) return;
  spawnSync(WIN ? 'npx.cmd' : 'npx', ['remotion', 'browser', 'ensure'], { stdio: 'inherit', shell: WIN });
  if (pronto() || !fs.existsSync(raiz)) return;
  const zip = fs.readdirSync(raiz).find((f) => f.endsWith('.zip'));
  if (!zip) throw new Error('navegador do Remotion não baixou: rode npx remotion browser ensure');
  const destino = path.join(raiz, zip.replace('chrome-headless-shell-', '').replace('.zip', ''));
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });
  if (WIN) execFileSync('tar', ['-xf', path.join(raiz, zip), '-C', destino]);
  else execFileSync('unzip', ['-q', path.join(raiz, zip), '-d', destino]);
  if (process.platform === 'darwin') spawnSync('xattr', ['-dr', 'com.apple.quarantine', destino]);
  if (!pronto()) throw new Error('não consegui abrir o navegador do Remotion');
};
