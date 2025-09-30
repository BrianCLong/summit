import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { on, MC_EVENTS } from '../../lib/mc/bridge';
import { getDeckByIdMerged } from '../../lib/decks/manifest';
import LaserOverlay from './LaserOverlay';
import Thumbnails from './Thumbnails';
import { preloadImages } from '../../lib/img/preload';
import { fetchSignedMedia } from '../../lib/decks/mediaCache';
import { decodeInWorker } from '../../lib/img/workerLoader';
import SlideMDX from './SlideMDX';
import { fetchWithExpiryRetry, getSignedSlideUrl } from '../../lib/decks/media';

// util: find slide asset URLs in your slide object (adapt to your deck shape)
function slideAssets(slide) {
  // examples: slide.image, slide.thumb, inline content with <img src> etc.
  const urls = [];
  if (!slide) return urls;
  if (slide.image) urls.push(slide.image);
  if (slide.thumb) urls.push(slide.thumb);
  if (Array.isArray(slide.images)) urls.push(...slide.images);
  return urls.filter(Boolean);
}

// Parse MDX deck: split on thematic breaks '---' and extract notes from <!-- notes: ... -->
function splitMdxToSlides(mod) {
  // mod.default is the compiled component; but we also need raw body.
  // @mdx-js/rollup keeps frontmatter on mod.frontmatter; content is compiled.
  // We’ll rely on source splitting by exposing a static source if present.
  const src = mod?.__raw ?? mod?.default?.toString?.() ?? '';
  // Fallback: try to split by "\n---\n" (matches our sample)
  const blocks = String(src).split(/\n---\n/g);

  const parse = (block) => {
    const notesMatch = block.match(/<!--\s*notes:\s*([\s\S]*?)-->/i);
    const notes = notesMatch ? notesMatch[1].trim() : '';
    const body = block.replace(/<!--[\s\S]*?-->/g, '').trim();
    // Title = first markdown heading line if any
    const titleMatch = body.match(/^\s*#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Slide';
    return { title, md: body, notes };
  };

  return blocks.map(parse).filter(s => s.md);
}

export default function SlideDeck({
  deck,
  index: controlledIdx,
  onIndexChange,
  laser = true,
  readOnly = false
}) {
  const [slideIdx, setSlideIdx] = useState(controlledIdx ?? 0);
  const [liveAt, setLiveAt] = useState(null);
  const tickRef = useRef();

  useEffect(() => { if (controlledIdx != null) setSlideIdx(controlledIdx); }, [controlledIdx]);

  const slides = deck?.slides || [];
  const cur = slides[slideIdx];
  const next = slides[Math.min(slides.length - 1, slideIdx + 1)];
  const thumbs = useMemo(() => slides.map(s => s.thumb).filter(Boolean), [slides]);

  const updateIdx = (i) => {
    if (onIndexChange) onIndexChange(i);
    else setSlideIdx(i);
  };

  useEffect(() => {
    let done = false;
    (async () => {
      if (deck?.getSlide && cur && (cur.partial || (!cur.content && !cur.image))) {
        const full = await deck.getSlide(slideIdx);
        if (!done && full) {
          // resolve media hashes to object URLs
          if (full.imageHash && !full.image) {
            try { full.image = await decodeInWorker(await fetchWithExpiryRetry(() => getSignedSlideUrl({ deckId: deck.id, index: slideIdx }))) || full.image; } catch {} // Use fetchWithExpiryRetry
          }
          if (full.thumbHash && !full.thumb) {
            try { full.thumb = await decodeInWorker(await fetchWithExpiryRetry(() => getSignedSlideUrl({ deckId: deck.id, index: slideIdx }))) || full.thumb; } catch {} // Use fetchWithExpiryRetry
          }
          preloadImages(slideAssets(full));
        }
      }
    })();
    return () => { done = true; };
  }, [deck, cur, slideIdx]);

  useEffect(() => {
    const offState = on(MC_EVENTS.STAGE_STATE, ({ status }) => {
      if (status === 'live') setLiveAt(Date.now());
      if (status === 'idle') { setDeck(null); updateIdx(0); setLiveAt(null); }
    });

    const offPresent = on(MC_EVENTS.STAGE_PRESENT, async ({ deckId, slide = 0 }) => {
      const entry = getDeckByIdMerged(deckId || 'quarterly-review');
      if (!entry) return;
      const { type, deck: jsonDeck, mod } = await entry.load();

      if (type === 'json') {
        setDeck({ title: jsonDeck.title || deckId, slides: jsonDeck.slides || [] });
        updateIdx(slide);
      } else if (type === 'mdx') {
        const slides = splitMdxToSlides(mod).map(s => ({
          title: s.title, content: s.md, notes: s.notes
        }));
        const title = mod?.frontmatter?.title || deckId;
        setDeck({ title, slides });
        updateIdx(slide);
      }
    });

    const offNav = on(MC_EVENTS.STAGE_NAV, ({ delta }) => {
      updateIdx(i => Math.max(0, Math.min((deck?.slides?.length ?? 1) - 1, i + delta)));
    });

    const offGoto = on(MC_EVENTS.STAGE_GOTO, ({ index }) => {
      updateIdx(() => Math.max(0, Math.min((deck?.slides?.length ?? 1) - 1, index)));
    });

    return () => { offState(); offPresent(); offNav(); offGoto(); };
  }, [deck?.slides?.length, onIndexChange]);

  // Preload next slide assets when index changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (next) {
        const assets = slideAssets(next);
        await preloadImages(assets);
        if (!cancelled) {
          // optional: warm next+1 too
          const n2 = slides[Math.min(slides.length - 1, slideIdx + 2)];
          if (n2) preloadImages(slideAssets(n2)); // fire-and-forget
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slideIdx, next, slides]);

  // Preload all thumbs once
  useEffect(() => { preloadImages(thumbs); }, [thumbs]);

  // presenter clock
  const [elapsed, setElapsed] = useState('00:00');
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!liveAt) return;
    tickRef.current = setInterval(() => {
      const s = Math.max(0, Math.floor((Date.now() - liveAt) / 1000));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    }, 500);
    return () => clearInterval(tickRef.current);
  }, [liveAt]);

  const slide = useMemo(() => deck?.slides?.[slideIdx] ?? null, [deck, slideIdx]);

  if (!deck || !slide) {
    return (
      <Box className="h-64 rounded-xl bg-black/80 text-white flex items-center justify-center">
        <Typography variant="h6">Waiting for deck…</Typography>
      </Box>
    );
  }

  return (
    <Box className="h-64 rounded-xl bg-black/90 text-white p-4 grid grid-cols-3 gap-3">
      {/* slide view */}
      <Box className="col-span-2 rounded-xl bg-black/60 p-4 overflow-auto relative">
        <Typography variant="overline" sx={{ opacity: 0.7 }}>{deck.title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{slide.title}</Typography>
        <Box sx={{ '& > * + *': { mt: 1 }, color: 'white', position: 'relative' }}>
          {cur.type === 'mdx' && cur.Content ? (
            <SlideMDX Content={cur.Content} />
          ) : 'md' in slide ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slide.content || slide.md}
            </ReactMarkdown>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {slide.content}
            </Typography>
          )}
        </Box>

        {/* laser overlay */}
        <LaserOverlay enabled={laser && !readOnly} />
      </Box>

      {/* presenter HUD */}
      <Box className="col-span-1 rounded-xl bg-black/60 p-3 flex flex-col">
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip label={`Time ${elapsed}`} size="small" color="success" />
          <Chip label={`Slide ${slideIdx + 1}/${deck.slides.length}`} size="small" />
          <Chip label="Local" size="small" variant="outlined" />
        </Stack>
        <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 1 }}>Presenter notes</Typography>
        <Box className="rounded-lg bg-black/40 p-2" sx={{ minHeight: 120, whiteSpace: 'pre-wrap' }}>
          <Typography variant="body2">{slide.notes || '—'}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {!readOnly && (
          <Typography
            variant="caption"
            sx={{ opacity: 0.6, cursor: 'pointer', mt: 1 }}
            onClick={() => setLaser(v => !v)}
          >
            Laser: {laser ? 'on' : 'off'} (click to toggle)
          </Typography>
        )}
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          ← / → to navigate
        </Typography>
      </Box>

      <Box className="col-span-3">
        <Thumbnails deck={deck} active={slideIdx} onClick={(i) => updateIdx(i)} />
      </Box>
    </Box>
  );
}
