"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const crypto_1 = __importDefault(require("crypto"));
const chain = [];
function computeMerkleHash(evt) {
    const s = JSON.stringify({
        type: evt.type,
        timestamp: evt.timestamp,
        payload: evt.payload,
        prevHash: evt.prevHash,
    });
    return crypto_1.default.createHash('sha256').update(s).digest('hex');
}
function signHash(hash, privPem) {
    const sign = crypto_1.default.createSign('RSA-SHA256');
    sign.update(hash);
    return sign.sign(privPem, 'base64');
}
const PRIV = process.env.LEDGER_PRIVATE_PEM || '';
const _PUB = process.env.LEDGER_PUBLIC_PEM || ''; // Reserved for signature verification
exports.app = (0, express_1.default)(); // Export app for testing
exports.app.use(body_parser_1.default.json());
exports.app.post('/ledger/append', (req, res) => {
    const { type, payload, signer } = req.body;
    const prev = chain.length ? chain[chain.length - 1].merkleHash : '';
    const timestamp = new Date().toISOString();
    const merkleHash = computeMerkleHash({
        type,
        timestamp,
        payload,
        prevHash: prev,
    });
    const signature = signHash(merkleHash, PRIV);
    const ev = {
        eventId: crypto_1.default.randomUUID(),
        type,
        timestamp,
        payload,
        prevHash: prev,
        merkleHash,
        signature,
        signer,
    };
    chain.push(ev);
    res.json(ev);
});
exports.app.get('/ledger/range', (req, res) => {
    const { from = 0, to = chain.length } = req.query;
    res.json(chain.slice(Number(from), Number(to)));
});
exports.app.get('/ledger/last', (req, res) => {
    res.json(chain[chain.length - 1] || null);
});
const port = Number(process.env.PORT || 7401);
exports.app.listen(port, () => {
    // Ledger server listening on port
});
