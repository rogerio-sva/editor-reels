import React from 'react';
import {Img, staticFile} from 'remotion';

/** Print de prova no terço de cima. Entra e sai por corte seco; nunca cobre o rosto. */
export const ProvaTopo: React.FC<{imagem: string; topo?: number; altura?: number}> = ({imagem, topo = 70, altura = 520}) => (
  <div style={{position: 'absolute', top: topo, left: 50, right: 50, height: altura, display: 'flex', justifyContent: 'center'}}>
    <Img src={staticFile(imagem)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 18,
      boxShadow: '0 18px 50px rgba(0,0,0,.55)'}} />
  </div>
);
