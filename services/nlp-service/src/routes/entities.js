"use strict";
/**
 * Entity extraction routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityRouter = createEntityRouter;
const express_1 = require("express");
const entity_extraction_1 = require("@intelgraph/entity-extraction");
function createEntityRouter() {
    const router = (0, express_1.Router)();
    const nerExtractor = new entity_extraction_1.NERExtractor();
    const disambiguator = new entity_extraction_1.EntityDisambiguator();
    /**
     * POST /api/entities/extract
     * Extract named entities
     */
    router.post('/extract', async (req, res, next) => {
        try {
            const { text, options } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            const entities = nerExtractor.extract(text);
            res.json({ entities });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/entities/disambiguate
     * Disambiguate entities
     */
    router.post('/disambiguate', async (req, res, next) => {
        try {
            const { entities, text } = req.body;
            if (!entities || !text) {
                return res.status(400).json({ error: 'Entities and text are required' });
            }
            const clusters = disambiguator.disambiguate(entities, text);
            res.json({ clusters });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
