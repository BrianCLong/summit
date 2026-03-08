"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const webhook_guard_js_1 = require("../middleware/webhook-guard.js");
const router = (0, express_1.Router)();
router.post('/events', webhook_guard_js_1.webhookRatelimit, (0, webhook_guard_js_1.replayGuard)(), express_2.default.raw({ type: '*/*', limit: '2mb' }), async (_req, res) => {
    // Plaid v2 verification requires SDK/header parsing; stubbed route
    const secret = process.env.PLAID_WEBHOOK_SECRET;
    if (!secret)
        return res.status(503).send('webhook disabled');
    return res.sendStatus(200);
});
exports.default = router;
