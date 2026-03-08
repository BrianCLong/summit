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
router.post('/sms', webhook_guard_js_1.webhookRatelimit, (0, webhook_guard_js_1.replayGuard)(), express_2.default.raw({ type: 'application/x-www-form-urlencoded', limit: '1mb' }), async (req, res) => {
    // NOTE: For production, verify X-Twilio-Signature using your Twilio auth token
    const secret = process.env.TWILIO_AUTH_TOKEN;
    if (!secret)
        return res.status(503).send('webhook disabled');
    // Signature verification omitted here; ensure to compare against header
    return res.sendStatus(200);
});
exports.default = router;
