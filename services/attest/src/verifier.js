"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const ALLOW = new Set((process.env.MEAS_ALLOWLIST || '').split(',').filter(Boolean));
app.post('/verify', (req, res) => {
    const { nodeId, provider, reportB64 } = req.body;
    // TODO: call AMD/Intel verification service; parse claims → measurement digest
    const measurement = crypto_1.default
        .createHash('sha256')
        .update(Buffer.from(reportB64, 'base64'))
        .digest('hex');
    const ok = ALLOW.has(measurement);
    res.json({ ok, measurement, provider, ts: new Date().toISOString() });
});
app.listen(process.env.PORT || 4040);
