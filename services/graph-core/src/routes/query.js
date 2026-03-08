"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../services/store.js");
const QueryInput = zod_1.z.object({
    cypher: zod_1.z.string(),
    time: zod_1.z.string().datetime().optional(),
    id: zod_1.z.string().optional(),
});
const router = (0, express_1.Router)();
router.post('/cypher', (req, res) => {
    const parsed = QueryInput.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    if (parsed.data.id && parsed.data.time) {
        const entity = store_js_1.store.getEntityAt(parsed.data.id, parsed.data.time) || null;
        return res.json({ entity });
    }
    // For sandboxing, simply echo back; real implementation would validate and run in Neo4j
    res.json({ cypher: parsed.data.cypher, time: parsed.data.time || null });
});
exports.default = router;
