#!/usr/bin/env node
/* Prancha de quadros numa imagem só, para aprovar o visual ANTES do render e conferir DEPOIS.

   Antes do render (4 a 6 quadros escolhidos pela tabela de batidas do roteiro):
     node scripts/prancha.mjs <Composicao> out/<nome>/prancha-aprovacao.jpg --roteiro=src/videos/<nome>
   Quadros à mão:
     node scripts/prancha.mjs <Composicao> out/<nome>/prancha.jpg --quadros=12,40,95,160
   Depois do render (12 quadros a 2 por segundo, ou --por-segundo=N --inicio=s):
     node scripts/prancha.mjs --video=out/<nome>.mp4 out/<nome>/prancha-conferencia.jpg
   Opções: --colunas=6 --largura=270 (de cada quadro). Abra a imagem (Read) e passe o checklist do estilo. */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const args = process.argv.slice(2);
const opc = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const livres = args.filter((a) => !a.startsWith('--'));
const video = opc.video;
const [comp, saida] = video ? [null, livres[0]] : livres;
if (!saida || (!video && !comp)) {
  console.error('Uso: node scripts/prancha.mjs <Composicao> <saida.jpg> [--roteiro=src/videos/<nome> | --quadros=a,b,c]\n     node scripts/prancha.mjs --video=out/x.mp4 <saida.jpg> [--por-segundo=2]');
  process.exit(1);
}
const largura = Number(opc.largura ?? 270);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prancha-'));
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const fmt = (s) => `${s.toFixed(2)} s`;
const dataUrl = (arq) => 'data:image/jpeg;base64,' + fs.readFileSync(arq).toString('base64');

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
try {
  const imagens = [];
  let altura;
  if (video) {
    const dur = Number(execFileSync(npx, ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString().trim());
    const passo = 1 / Number(opc['por-segundo'] ?? 2);
    const inicio = Number(opc.inicio ?? passo / 2);
    const n = Number(opc.n ?? 12);
    for (let k = 0; k < n; k++) {
      const t = inicio + k * passo;
      if (t >= dur) break;
      const arq = path.join(tmp, `v${k}.jpg`);
      execFileSync(npx, ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${largura}:-2`, '-q:v', '3', arq]);
      imagens.push({ src: dataUrl(arq), rotulo: fmt(t) });
    }
  } else {
    const c = await selectComposition({ serveUrl, id: comp });
    let quadros = [];
    if (opc.quadros) quadros = String(opc.quadros).split(',').map(Number);
    else if (opc.roteiro) {
      const { agendaEditorial, agendaQuadro } = await import(path.resolve('src/estilos/agenda.mjs'));
      const roteiro = JSON.parse(fs.readFileSync(path.join(opc.roteiro, 'roteiro.json'), 'utf8'));
      const tempos = JSON.parse(fs.readFileSync(path.join(opc.roteiro, 'tempos.json'), 'utf8'));
      let ts;
      if (roteiro.estilo === 'quadro') {
        const ag = agendaQuadro(roteiro, tempos, { largura: c.width, altura: c.height });
        ts = [...(ag.rosto ? [ag.rosto.t1 * 0.5] : []), ...ag.cenas.flatMap((ce) => {
          const fim = ce.limpa ?? ag.dur;
          return [ce.t0 + (fim - ce.t0) * 0.45, fim - 0.15];
        })];
      } else {
        const ag = agendaEditorial(roteiro, tempos);
        ts = ag.blocos.filter((b) => b.tipo !== 'whip').map((b) => Math.min(b.t0 + 0.75, (b.t0 + b.t1) / 2 + 0.2));
      }
      ts.sort((a, b) => a - b);
      const max = Number(opc.max ?? 6);
      if (ts.length > max) ts = Array.from({ length: max }, (_, i) => ts[Math.round((i * (ts.length - 1)) / (max - 1))]);
      quadros = ts.map((t) => Math.min(c.durationInFrames - 1, Math.round(t * c.fps)));
    } else {
      quadros = Array.from({ length: 6 }, (_, i) => Math.round(((i + 0.5) * c.durationInFrames) / 6));
    }
    for (const q of quadros) {
      const arq = path.join(tmp, `q${q}.jpg`);
      await renderStill({ serveUrl, composition: c, frame: q, scale: largura / c.width, output: arq, imageFormat: 'jpeg', jpegQuality: 82 });
      imagens.push({ src: dataUrl(arq), rotulo: `${fmt(q / c.fps)} · q${q}` });
    }
    altura = Math.round((largura * c.height) / c.width);
  }
  if (!altura) altura = Math.round(largura * 16 / 9);
  const colunas = Math.min(imagens.length, Number(opc.colunas ?? 6));
  const props = { imagens, colunas, w: largura, h: altura };
  const folha = await selectComposition({ serveUrl, id: 'Prancha', inputProps: props });
  fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true });
  await renderStill({ serveUrl, composition: folha, frame: 0, inputProps: props, output: saida, imageFormat: 'jpeg', jpegQuality: 85 });
  console.log('ok', saida, `(${imagens.length} quadros)`);
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}
