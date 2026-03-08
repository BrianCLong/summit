"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsExtRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
exports.analyticsExtRouter = (0, express_1.Router)();
// Link prediction (placeholder): return pairs with simple score derived from IDs
exports.analyticsExtRouter.get('/link-prediction', (0, auth_js_1.requirePermission)('analytics:run'), (req, res) => {
    const seeds = String(req.query.seeds || '')
        .split(',')
        .filter(Boolean);
    const out = [];
    for (let i = 0; i < seeds.length; i++) {
        for (let j = i + 1; j < seeds.length; j++) {
            const a = seeds[i], b = seeds[j];
            const score = ((a.length + b.length) % 10) / 10;
            out.push({ a, b, score });
        }
    }
    res.json({ items: out.sort((x, y) => y.score - x.score).slice(0, 50) });
});
