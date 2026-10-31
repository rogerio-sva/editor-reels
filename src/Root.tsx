/* Todas as composições do projeto.
   - Partitura / EditorialPartitura: vídeo real, montado por props (scripts/reel/)
   - Demo, exemplos e catálogos dos estilos; filme modelo e transições isoladas */
import React from 'react';
import { ComposicoesFilme } from './filme/Filme';
import { ComposicoesTransicoes } from './transicoes/catalogo';
import { ComposicaoDemo } from './videos/demo/Demo';
import { ComposicaoPartitura } from './biblioteca/Partitura';
import { ComposicaoEditorialPartitura } from './biblioteca/EditorialPartitura';
import { ComposicaoEditorialExemplo } from './videos/editorial-exemplo/Exemplo';
import { ComposicaoPrancha } from './estilos/comum/Prancha';
import { ComposicaoQuadroExemplo } from './videos/quadro-exemplo/Exemplo';
import { ComposicaoQuadroIcones } from './estilos/quadro/FolhaIcones';
import { ComposicaoEditorialCatalogo } from './videos/editorial-exemplo/Catalogo';

export const RemotionRoot: React.FC = () => (
  <>
    <ComposicaoPartitura />
    <ComposicaoEditorialPartitura />
    <ComposicaoDemo />
    <ComposicaoEditorialExemplo />
    <ComposicaoEditorialCatalogo />
    <ComposicaoQuadroExemplo />
    <ComposicaoQuadroIcones />
    <ComposicaoPrancha />
    <ComposicoesFilme />
    <ComposicoesTransicoes />
  </>
);
