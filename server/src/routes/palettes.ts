import { Router } from 'express';
import { listPalettes, resolvePaletteRuntimeConfig, getPalette } from '../llm/palette/registry.js';

const router = Router();

router.get('/', (_req, res) => {
  const runtime = resolvePaletteRuntimeConfig();
  const palettes = listPalettes().map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    injectionKind: p.injection.kind,
    tags: p.tags,
    safeDefault: p.safeDefault,
    decoding: p.decoding,
    enabled: runtime.enabled,
  }));
  res.json({ palettes, runtime });
});

router.post('/runs/:id/palette', (req, res) => {
  const runtime = resolvePaletteRuntimeConfig();
  if (!runtime.enabled) {
    return res.status(403).json({ error: 'Reasoning palette feature is disabled' });
  }
  const { paletteId } = req.body || {};
  const palette = paletteId ? getPalette(paletteId) : null;
  if (!palette) {
    return res.status(400).json({ error: 'Unknown palette id' });
  }
  // Placeholder hook; in this codebase run templates are not persisted in this router.
  res.json({
    message: 'Palette recorded for run template context',
    runId: req.params.id,
    palette: { id: palette.id, label: palette.label },
  });
});

export default router;
