"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const slo_js_1 = require("../slo.js");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const runbook = String(req.query.runbook || '');
        const tenant = String(req.query.tenant || '');
        if (!runbook || !tenant)
            return res.status(400).json({ error: 'runbook and tenant required' });
        const r = await (0, slo_js_1.computeBurn)(runbook, tenant, process.env.SLO_WINDOW || '24h');
        res.json(r);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'failed' });
    }
});
exports.default = router;
