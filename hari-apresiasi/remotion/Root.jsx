import React from 'react';
import { Composition } from 'remotion';
import { Countdown } from './Countdown.jsx';
import { W, H, DURATION } from '../src/scene.js';

// Props boleh ditimpa: npx remotion render ... --props='{"config":{"countdown":{"daysLeft":3}}}'
export const Root = () => (
  <Composition id="CountdownApresiasi" component={Countdown} width={W} height={H} fps={30}
    durationInFrames={DURATION * 30} defaultProps={{ config: {} }} />
);
