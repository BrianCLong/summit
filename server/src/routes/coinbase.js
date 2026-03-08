"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const webhook_guard_js_1 = require("../middleware/webhook-guard.js");
const router = (0, express_1.Router)();
router.post('/events', webhook_guard_js_1.webhookRatelimit, (0, webhook_guard_js_1.replayGuard)(), express_2.default.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
    const secret = process.env.COINBASE_WEBHOOK_SECRET;
    if (!secret)
        return res.status(503).send('webhook disabled');
    const h = crypto_1.default
        .createHmac('sha256', secret)
        .update(req.body)
        .digest('hex');
    const sig = (req.header('X-CC-Webhook-Signature') || '').toLowerCase();
    if (h !== sig)
        return res.status(401).send('bad signature');
    return res.sendStatus(200);
});
exports.default = router;
