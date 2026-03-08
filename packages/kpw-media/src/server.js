"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const wallet_1 = require("./wallet");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json({ limit: '10mb' }));
const PRIV = process.env.PRIVATE_KEY_PEM || '';
const PUB = process.env.PUBLIC_KEY_PEM || '';
if (!PRIV)
    console.warn('[KPW] PRIVATE_KEY_PEM not set (server will not sign)');
app.post('/kpw/build', (req, res) => {
    const { runId, caseId, steps } = req.body;
    const out = (0, wallet_1.buildWallet)(runId, caseId, steps, PRIV);
    res.json(out); // {manifest, steps, leaves}
});
app.post('/kpw/disclose', (req, res) => {
    const { manifest, steps, leaves, stepIds } = req.body;
    const bundle = (0, wallet_1.disclose)(stepIds, manifest, steps, leaves);
    res.json(bundle);
});
app.post('/kpw/verify', (req, res) => {
    const { bundle } = req.body;
    const ok = (0, wallet_1.verifyDisclosure)(bundle, PUB);
    res.json({ ok });
});
const port = Number(process.env.PORT || 7102);
app.listen(port, () => console.log(`KPW-Media server on ${port}`));
