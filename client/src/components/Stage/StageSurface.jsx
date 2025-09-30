import { useEffect, useState, useCallback } from 'react';
import { Box } from ' @mui/material';
import SlideDeck from './SlideDeck';
import { DECKS } from '../../slides/registry';
import { MC_EVENTS, on, emit } from '../../lib/mc/bridge';

export default function StageSurface() {
  const [status, setStatus] = useState('idle'); // idle | live
  const [deckId, setDeckId] = useState(null);
  const [DeckComponent, setDeckComponent] = useState(null);
  const [slide, setSlide] = useState(0);

  // load deck dynamically
  const loadDeck = useCallback(async (id) => {
    const loader = DECKS[id];
    if (!loader) return;
    const mod = await loader();
    setDeckComponent(() => mod.default);
  }, []);

  useEffect(() => {
    const off1 = on(MC_EVENTS.STAGE_STATE, ({ status: s }) => setStatus(s));
    const off2 = on(MC_EVENTS.STAGE_PRESENT, async ({ deckId: id, slide: idx = 0 }) => {
      setDeckId(id);
      setSlide(idx);
      await loadDeck(id);
    });
    const off3 = on(MC_EVENTS.STAGE_NAV, ({ delta }) => {
      setSlide((s) => Math.max(0, s + delta));
    });
    return () => { off1(); off2(); off3(); };
  }, [loadDeck]);

  // arrow keys to navigate when live
  useEffect(() => {
    if (status !== 'live') return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') emit(MC_EVENTS.STAGE_NAV, { delta: 1 });
      if (e.key === 'ArrowLeft') emit(MC_EVENTS.STAGE_NAV, { delta: -1 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status]);

  if (status !== 'live' || !DeckComponent) {
    return (
      <Box className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center">
        {status === 'live' ? 'Loading deck…' : 'Stage idle'}
      </Box>
    );
  }

  return (
    <Box className="h-[420px] rounded-xl bg-neutral-950 text-white relative overflow-hidden">
      <SlideDeck DeckComponent={DeckComponent} slide={slide} />
    </Box>
  );
}