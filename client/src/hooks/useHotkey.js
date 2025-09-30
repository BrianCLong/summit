import { useEffect } from 'react';

export default function useHotkey(combo = 'mod+k', handler = () => {}) {
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (combo === 'mod+k' && mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); handler(); return;
      }
      if (combo === 'arrow-right' && e.key === 'ArrowRight') { handler(); return; }
      if (combo === 'arrow-left'  && e.key === 'ArrowLeft')  { handler(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}
