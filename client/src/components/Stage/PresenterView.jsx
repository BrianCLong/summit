import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
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

  const slides = deck?.slides || [];
  const cur = slides[index];
  const nextSlide = slides[Math.min(slides.length - 1, index + 1)];

  const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;

  if (!deck) return <Typography sx={{ p: 2 }}>Loading deck…</Typography>;
  return (
    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
      {/* left: current slide */}
      <SlideDeck deck={deck} index={index} laser={laser} onIndexChange={(i)=>{ setIndex(i); stageGoto(i); }} />

      {/* right: controls + notes + next */}
      <Box sx={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 1 }}>
        <Box>
          <Typography variant="h6">Presenter Controls</Typography>
          <Typography variant="body2" sx={{ opacity: .7, mb: 1 }}>{deck.title}</Typography>
          <Button variant="contained" onClick={prev} sx={{ mr: 1 }}>Prev</Button>
          <Button variant="contained" onClick={next}>Next</Button>
          <Button sx={{ ml: 2 }} onClick={()=>setLaser(v=>!v)}>Laser: {laser ? 'on':'off'}</Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => invoke?.('open_audience')}
          >
            Open Audience Window
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ p: 1 }}>
          <Typography variant="overline">Next</Typography>
          {nextSlide ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 1, alignItems: 'center' }}>
              {nextSlide.thumb ? <img src={nextSlide.thumb} alt="next" style={{ width: 96, height: 54, objectFit: 'cover', borderRadius: 8 }} /> : <Box sx={{ width:96, height:54, bgcolor: 'grey.200', borderRadius: 1 }} />}
              <Typography variant="body2" noWrap>{nextSlide.title || `Slide ${index+2}`}</Typography>
            </Box>
          ) : <Typography variant="body2" sx={{ opacity:.7 }}>End of deck</Typography>}
        </Paper>

        <Paper variant="outlined" sx={{ p: 1, minHeight: 160, overflow: 'auto' }}>
          <Typography variant="overline">Presenter Notes</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {cur?.notes || '—'}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}