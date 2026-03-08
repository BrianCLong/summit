"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schema_js_1 = require("../schema.js");
const store_js_1 = require("../services/store.js");
const router = (0, express_1.Router)();
router.post('/', (req, res) => {
    const parse = schema_js_1.RelationshipSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.flatten() });
    }
    const rel = store_js_1.store.upsertRelationship(parse.data);
    res.json(rel);
});
exports.default = router;
