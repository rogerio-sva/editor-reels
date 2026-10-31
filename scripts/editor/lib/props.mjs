import fs from 'node:fs';
import {validarMarca} from '../../../src/editor/marca.ts';

/** Junta o roteiro com a marca. Marca inválida para aqui, antes de qualquer render. */
export const lerProps = (roteiroPath, marcaPath = 'marca/marca.json') => {
  const roteiro = JSON.parse(fs.readFileSync(roteiroPath, 'utf8'));
  const marca = JSON.parse(fs.readFileSync(marcaPath, 'utf8'));
  const v = validarMarca(marca);
  if (!v.ok) throw new Error(`marca/marca.json com problema:\n- ${v.erros.join('\n- ')}`);
  return {...roteiro, marca};
};
