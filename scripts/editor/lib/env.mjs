import fs from 'node:fs';

export const lerEnv = (caminho = '.env') => {
  if (!fs.existsSync(caminho)) return {};
  const out = {};
  for (const linha of fs.readFileSync(caminho, 'utf8').split('\n')) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
};
