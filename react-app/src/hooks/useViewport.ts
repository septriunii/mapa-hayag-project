import { useEffect, useState } from 'react';

export function useViewport() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const width = window.innerWidth, height = window.innerHeight;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', resize);
    // A resize may occur between render and subscription. Recheck immediately,
    // and measure resize events on the next frame after viewport layout settles.
    measure();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frame); };
  }, []);
  return size;
}
