import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { createScene, W, H } from '../src/scene.js';

// Remotion hanya memandu masa: frame/fps -> scene.renderAt(t) (Three.js).
export const Countdown = ({ config }) => {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [scene, setScene] = useState(null);

  useEffect(() => {
    const h = delayRender('init-three');
    const base = staticFile('logo.png').replace(/\/logo\.png.*$/, '');
    createScene({ canvas: ref.current, width: W, height: H, assetBase: base, config })
      .then((s) => { setScene(s); continueRender(h); })
      .catch((e) => { console.error(e); throw e; });
  }, []);

  useEffect(() => {
    if (!scene) return;
    const h = delayRender('frame-' + frame);
    scene.renderAt(frame / fps);
    requestAnimationFrame(() => continueRender(h));
  }, [scene, frame, fps]);

  return (
    <AbsoluteFill style={{ background: '#e4dbd0' }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H }} />
    </AbsoluteFill>
  );
};
