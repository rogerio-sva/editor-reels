#!/usr/bin/env node
/* Confere um roteiro editorial contra os tempos (14/10/2026, video-editor/cortes/motion.py chama).
   Uso: node scripts/validar-editorial.mjs <roteiro.json> <tempos.json>
   Tira os blocos cuja palavra não existe e escreve no stdout { roteiro, removidos, dur }. */
import fs from 'node:fs';
import { agendaEditorial } from '../src/estilos/agenda.mjs';

const [arqR, arqT] = process.argv.slice(2);
const roteiro = JSON.parse(fs.readFileSync(arqR, 'utf8'));
const tempos = JSON.parse(fs.readFileSync(arqT, 'utf8'));
const removidos = [];
const bons = [];
for (const b of roteiro.blocos ?? []) {
  try {
    agendaEditorial({ ...roteiro, blocos: [...bons, b] }, tempos);
    bons.push(b);
  } catch (e) {
    removidos.push({ tipo: b.tipo, em: b.em, erro: String(e.message ?? e) });
  }
}
const final = { ...roteiro, blocos: bons };
const ag = agendaEditorial(final, tempos);
process.stdout.write(JSON.stringify({ roteiro: final, removidos, dur: ag.dur, blocos: ag.blocos.length }));
