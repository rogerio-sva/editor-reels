import React from 'react';

export type NomeIcone = 'check' | 'alerta' | 'seta' | 'relogio' | 'dinheiro' | 'cerebro' | 'raio' | 'pessoa';

/** Traços simples desenhados aqui, para o produto não depender de pacote de ícones de terceiros. */
const TRACOS: Record<NomeIcone, string> = {
  check: 'M5 12l5 5L20 7',
  alerta: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
  seta: 'M4 12h15M13 6l6 6-6 6',
  relogio: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 3',
  dinheiro: 'M3 7h18v10H3zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  cerebro: 'M9 4a3 3 0 0 0-3 3a3 3 0 0 0-2 5a3 3 0 0 0 2 5a3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3a3 3 0 0 1 2 5a3 3 0 0 1-2 5a3 3 0 0 1-3 3h-1V4z',
  raio: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  pessoa: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6',
};

export const Icone: React.FC<{nome: NomeIcone; cor: string; tamanho: number}> = ({nome, cor, tamanho}) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={TRACOS[nome]} />
  </svg>
);
