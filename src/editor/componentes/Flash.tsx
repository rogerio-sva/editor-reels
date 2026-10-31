import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

/** Clarão quente de transição entre gancho e corpo: acende em 2 quadros e apaga em 6. Vai dentro de uma Sequence. */
export const Flash: React.FC = () => {
  const o = interpolate(useCurrentFrame(), [0, 2, 8], [0, 0.95, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o <= 0) return null;
  return <AbsoluteFill style={{opacity: o, background: 'radial-gradient(circle at 50% 45%, #FFF6D8 0%, #FFD36A 45%, #FF9F2E 100%)', mixBlendMode: 'screen'}} />;
};
