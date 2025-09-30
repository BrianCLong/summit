import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { on, MC_EVENTS } from '../../lib/mc/bridge';
import { listDecksMerged, getDeckByIdMerged } from '../../lib/decks/manifest';
import SlideDeck from './SlideDeck';

export default function AudienceView() {
  const [deck, setDeck] = useState(null);
  const [index, setIndex] = useState(0);
  const [laser, setLaser] = useState(true);

  // follow presenter broadcasts
  useEffect(() => on(MC_EVENTS.STAGE_PRESENTER_STATE, async ({ deckId, index, laser }) => {
    setIndex(index ?? 0);
    setLaser(laser ?? true);
    // resolve deck
    const list = await listDecksMerged();
    const entry = list.find(d => d.id === deckId) || list[0];
    if (entry) entry.load().then(({ deck }) => setDeck(deck));
  }), []);

  if (!deck) return <Typography sx={{ p: 2 }}>Waiting for presenter…</Typography>;
  return (
    <Box sx={{ p: 2 }}>
      <SlideDeck deck={deck} index={index} laser={laser} readOnly />
    </Box>
  );
}