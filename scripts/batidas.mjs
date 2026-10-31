#!/usr/bin/env node
/* Mostra a TABELA DE BATIDAS de um vídeo (editorial ou quadro): o que entra na tela, quando, e qual
   som toca junto. É o "storyboard" que se mostra ao usuário antes de renderizar.
   Uso:  node scripts/batidas.mjs src/videos/<nome>      (imprime em Markdown)
   A mesma conta (src/estilos/agenda.mjs) é a que a composição e o scripts/trilha.mjs usam. */
import fs from 'node:fs';
import path from 'node:path';
import { agendaEditorial, agendaQuadro, tabelaDeBatidas } from '../src/estilos/agenda.mjs';

const [pasta] = process.argv.slice(2);
if (!pasta) {
  console.error('Uso: node scripts/batidas.mjs src/videos/<nome>');
  process.exit(1);
}
const roteiro = JSON.parse(fs.readFileSync(path.join(pasta, 'roteiro.json'), 'utf8'));
const tempos = JSON.parse(fs.readFileSync(path.join(pasta, 'tempos.json'), 'utf8'));
const ag = roteiro.estilo === 'quadro' ? agendaQuadro(roteiro, tempos) : agendaEditorial(roteiro, tempos);
console.log(`Tabela de batidas: ${path.basename(pasta)} (${roteiro.estilo}, ${ag.dur.toFixed(2)} s)\n`);
console.log(tabelaDeBatidas(ag));
