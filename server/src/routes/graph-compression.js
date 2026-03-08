"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GraphCompressionService_js_1 = require("../services/GraphCompressionService.js");
const router = (0, express_1.Router)();
router.post('/compress', (req, res) => {
    try {
        const { nodes, links } = req.body;
        if (!nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Invalid graph data: nodes array required' });
        }
        if (!links || !Array.isArray(links)) {
            return res.status(400).json({ error: 'Invalid graph data: links array required' });
        }
        // Sanitize input: ensure links have string IDs if they are objects
        const sanitizedLinks = links.map((l) => ({
            ...l,
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target
        }));
        // Pass nodes as is (presuming they include x, y, etc.)
        const compressed = GraphCompressionService_js_1.graphCompressionService.compress({ nodes, links: sanitizedLinks });
        res.json(compressed);
    }
    catch (error) {
        console.error('Graph compression error:', error);
        res.status(500).json({ error: 'Failed to compress graph' });
    }
});
exports.default = router;
