"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const crypto_js_1 = require("./crypto.js");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json({ limit: '2mb' }));
const PRIV = process.env.AER_PRIVATE_KEY_PEM || '';
const PUB = process.env.AER_PUBLIC_KEY_PEM || '';
app.post('/aer/mint', (req, res) => {
    const { assertion, subjectToken } = req.body;
    const assertionHash = (0, crypto_js_1.hash)(assertion);
    const epoch = Math.floor(Date.now() / 1000);
    const sig = (0, crypto_js_1.sign)(assertionHash, epoch, subjectToken, PRIV);
    res.json({ assertionHash, epoch, subjectToken, ...sig });
});
app.post('/aer/verify', (req, res) => {
    const { aer } = req.body;
    const ok = (0, crypto_js_1.verify)(aer, PUB);
    res.json({ ok });
});
app.listen(process.env.PORT || 7201, () => { });
