/* =====================================================================================
   temas.ts: paletas. As cenas, blocos e transições não mudam; trocar o tema troca as cores de tudo.
     marca   : o padrão (marca/marca.json pode trocar qualquer cor)
     aula, caso, urgente : a mesma marca com outro acento, usados pelos modelos de src/biblioteca/modelos.json
     original: a paleta verde do filme modelo da Skill Motion
   Regras do guia: fundo muito escuro, um acento só, vermelho (alerta) só para riscar.
   ===================================================================================== */
const base = { branco: '#FFFFFF', alerta: '#FF3B30' };
const escuro = { fundo: '#04080F', floresta: '#0A1628', florestaClara: '#132845', papel: '#F4F0E6', dim: '#B4BCC8', faint: '#7A8496' };

export const TEMAS = {
  original: {
    nome: 'Skill Motion (verde)',
    paleta: { ...base, fundo: '#030705', floresta: '#0A1C11', florestaClara: '#123A22', halo: '#1C5C34',
      acento: '#30DC68', acentoClaro: '#85EEA7', papel: '#F1F0E8', dim: '#A9B8AE', faint: '#6E8075' },
  },
  marca: { nome: 'Marca', paleta: { ...base, ...escuro, halo: '#5A4718', acento: '#D4AF4F', acentoClaro: '#EED89A' } },
  aula: { nome: 'Aula', paleta: { ...base, ...escuro, halo: '#0E4A66', acento: '#38BDF8', acentoClaro: '#A5E3FC' } },
  caso: {
    nome: 'Caso real',
    paleta: { ...base, alerta: '#FF6B4A', fundo: '#070707', floresta: '#161212', florestaClara: '#2A1E1E', halo: '#5C1A1C',
      acento: '#E5484D', acentoClaro: '#F7A5A7', papel: '#F4F0E6', dim: '#BDB6B6', faint: '#857C7C' },
  },
  urgente: {
    nome: 'Urgente',
    paleta: { ...base, fundo: '#0A0603', floresta: '#1E1206', florestaClara: '#33200A', halo: '#6B4E06',
      acento: '#FACC15', acentoClaro: '#FDE68A', papel: '#FFF8E7', dim: '#C9BFA8', faint: '#8A826F' },
  },
} as const;

export type NomeTema = keyof typeof TEMAS;
