import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { listDecksMerged, getDeckByIdMerged } from '../../lib/decks/manifest';
import { on, MC_EVENTS, stageGoto, stagePresenterState } from '../../lib/mc/bridge';
import SlideDeck from './SlideDeck'; // your existing deck renderer (left/right grid)

export default function PresenterView() {
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState(null);
  const [deck, setDeck] = useState(null);
  const [index, setIndex] = useState(0);
  const [laser, setLaser] = useState(true);

  useEffect(() => { (async () => setDecks(await listDecksMerged()))(); }, []);
  useEffect(() => {
    const d = decks.find(d => d.id === deckId) || decks[0];
    if (!d) return;
    setDeckId(d.id);
    d.load().then(({ deck }) => setDeck(deck));
  }, [decks, deckId]);

  // audience reacts to our index via channel
  useEffect(() => { stagePresenterState({ deckId, index, laser }); }, [deckId, index, laser]);

  useEffect(() => on(MC_EVENTS.STAGE_GOTO, ({ index }) => setIndex(index)), []);

  const next = () => { const n = Math.min((deck?.slides?.length ?? 1)-1, index+1); setIndex(n); stageGoto(n); };
  const prev = () => { const p = Math.max(0, index-1); setIndex(p); stageGoto(p); };

  if (!deck) return <Typography sx={{ p: 2 }}>Loading deck…</Typography>;
  return (
    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
      <SlideDeck deck={deck} index={index} laser={laser} onIndexChange={(i)=>{ setIndex(i); stageGoto(i); }} />
      <Box>
        <Typography variant="h6">Presenter Controls</Typography>
        <Typography variant="body2" sx={{ opacity: .7, mb: 1 }}>{deck.title}</Typography>
        <Button variant="contained" onClick={prev} sx={{ mr: 1 }}>Prev</Button>
        <Button variant="contained" onClick={next}>Next</Button>
        <Button sx={{ ml: 2 }} onClick={()=>setLaser(v=>!v)}>Laser: {laser ? 'on':'off'}</Button>
      </Box>
    </Box>
  );
}