"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const signature_js_1 = require("../utils/signature.js");
const router = (0, express_1.Router)();
router.post('/events', express_2.default.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret)
        return res.status(503).send('webhook disabled');
    const sig = req.header('X-Hub-Signature-256') || '';
    const expected = 'sha256=' + (0, signature_js_1.hmacHex)('sha256', secret, req.body);
    if (!(0, signature_js_1.safeEqual)(expected, sig))
        return res.status(401).send('bad signature');
    // const payload = JSON.parse((req.body as Buffer).toString('utf8'));
    return res.status(200).send();
});
exports.default = router;
