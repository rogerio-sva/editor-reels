import React from 'react';
import {Composition} from 'remotion';
import marca from '../../marca/marca.json';
import {Carrossel, type PropsCarrossel} from './formatos/Carrossel';
import {Reel, type RoteiroReel} from './formatos/Reel';
import {TelaDividida, type RoteiroTelaDividida} from './formatos/TelaDividida';
import {DoZero, type RoteiroDoZero} from './formatos/DoZero';
import {Fala} from './formatos/Fala';
import {duracaoFala, type RoteiroFala} from './fala';
import {TesteComponentes} from './formatos/TesteComponentes';
import {duracaoCarrossel, duracaoTrechos} from './timeline';

const FPS = 30;
const VERTICAL = {fps: FPS, width: 1080, height: 1920, durationInFrames: 1};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Carrossel"
      component={Carrossel as never}
      {...VERTICAL}
      calculateMetadata={({props}) => ({durationInFrames: Math.round(duracaoCarrossel(props as unknown as PropsCarrossel) * FPS)})}
      defaultProps={{} as never}
    />
    <Composition
      id="Reel"
      component={Reel as never}
      {...VERTICAL}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(duracaoTrechos((props as unknown as RoteiroReel).trechos) * FPS))})}
      defaultProps={{} as never}
    />
    <Composition
      id="TelaDividida"
      component={TelaDividida as never}
      {...VERTICAL}
      calculateMetadata={({props}) => ({durationInFrames: Math.round((props as unknown as RoteiroTelaDividida).duracao * FPS)})}
      defaultProps={{} as never}
    />
    <Composition
      id="DoZero"
      component={DoZero as never}
      {...VERTICAL}
      calculateMetadata={({props}) => ({durationInFrames: Math.round((props as unknown as RoteiroDoZero).duracao * FPS)})}
      defaultProps={{} as never}
    />
    <Composition
      id="Fala"
      component={Fala as never}
      {...VERTICAL}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.round(duracaoFala(props as unknown as RoteiroFala) * FPS))})}
      defaultProps={{} as never}
    />
    <Composition id="TesteComponentes" component={TesteComponentes as never} {...VERTICAL} durationInFrames={30}
      defaultProps={{marca} as never} />
  </>
);
