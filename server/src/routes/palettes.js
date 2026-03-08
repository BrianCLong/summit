"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const registry_js_1 = require("../llm/palette/registry.js");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    const runtime = (0, registry_js_1.resolvePaletteRuntimeConfig)();
    const palettes = (0, registry_js_1.listPalettes)().map((p) => ({
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
    const runtime = (0, registry_js_1.resolvePaletteRuntimeConfig)();
    if (!runtime.enabled) {
        return res.status(403).json({ error: 'Reasoning palette feature is disabled' });
    }
    const { paletteId } = req.body || {};
    const palette = paletteId ? (0, registry_js_1.getPalette)(paletteId) : null;
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
exports.default = router;
