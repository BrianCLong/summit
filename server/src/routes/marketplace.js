"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketplace_js_1 = require("../marketplace.js");
const router = express_1.default.Router();
router.post('/install', async (req, res) => {
    const name = String(req.query.name || '');
    const version = String(req.query.version || '');
    if (!name || !version)
        return res.status(400).json({ error: 'name and version required' });
    try {
        const file = await (0, marketplace_js_1.installStep)(name, version);
        res.json({ ok: true, file });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
exports.default = router;
