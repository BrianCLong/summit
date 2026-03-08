"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const backfill_js_1 = require("../conductor/backfill.js");
const router = express_1.default.Router();
router.post('/plan', express_1.default.text({ type: '*/*' }), async (req, res) => {
    try {
        const slots = await (0, backfill_js_1.planBackfill)(String(req.body || ''));
        res.json({ slots });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || 'invalid yaml' });
    }
});
router.post('/run', express_1.default.text({ type: '*/*' }), async (req, res) => {
    try {
        const planned = await (0, backfill_js_1.runBackfill)(String(req.body || ''), true);
        res.json({ planned });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || 'invalid yaml' });
    }
});
exports.default = router;
