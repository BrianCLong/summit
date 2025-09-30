import { useEffect, useRef, useState } from 'react';
import { stagePointer, on, MC_EVENTS } from '../../lib/mc/bridge';

// A simple circular dot that follows normalized coordinates.
export default function LaserOverlay({ enabled = true }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null); // {x,y} normalized
  const [local, setLocal] = useState(false);

  useEffect(() => {
    const off = on(MC_EVENTS.STAGE_POINTER, ({ x, y }) => {
      setPos({ x, y }); setLocal(false);
    });
    return off;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const nx = Math.max(0, Math.min(1, x));
      const ny = Math.max(0, Math.min(1, y));
      stagePointer(nx, ny);
      setPos({ x: nx, y: ny });
      setLocal(true);
    };
    const onLeave = () => setLocal(false);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [enabled]);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, cursor: enabled ? 'none' : 'default' }}>
      {pos && (
        <div
          style={{
            position: 'absolute',
            left: `calc(${pos.x * 100}% - 8px)`,
            top: `calc(${pos.y * 100}% - 8px)`,
            width: 16, height: 16,
            borderRadius: '50%',
            background: local ? '#ff5555' : '#ffd166',
            boxShadow: '0 0 8px rgba(255,85,85,0.9)',
            transition: 'left 40ms linear, top 40ms linear',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}