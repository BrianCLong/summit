"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.app = void 0;
exports.computeHash = computeHash;
exports.merkleRoot = merkleRoot;
const express_1 = __importDefault(require("express"));
const node_crypto_1 = __importDefault(require("node:crypto"));
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.log = [];
function computeHash(record, prevHash) {
    const data = JSON.stringify(record) + prevHash;
    return node_crypto_1.default.createHash('sha256').update(data).digest('hex');
}
function merkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
    while (nodes.length > 1) {
        const next = [];
        for (let i = 0; i < nodes.length; i += 2) {
            const left = nodes[i];
            const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];
            next.push(node_crypto_1.default
                .createHash('sha256')
                .update(Buffer.concat([left, right]))
                .digest());
        }
        nodes = next;
    }
    return nodes[0].toString('hex');
}
exports.app.post('/audit/append', (req, res) => {
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    const offsets = [];
    const hashes = [];
    for (const r of records) {
        const base = {
            user: r.user,
            action: r.action,
            resource: r.resource,
            authorityId: r.authorityId,
            reason: r.reason,
            timestamp: new Date().toISOString(),
        };
        const prevHash = exports.log.length ? exports.log[exports.log.length - 1].hash : '';
        const hash = computeHash(base, prevHash);
        exports.log.push({ ...base, hash });
        offsets.push(exports.log.length - 1);
        hashes.push(hash);
    }
    res.json({ offsets, merkleRoot: merkleRoot(hashes) });
});
exports.app.get('/audit/query', (req, res) => {
    const { user, action, resource, start, end } = req.query;
    let results = exports.log.slice();
    if (user)
        results = results.filter((r) => r.user === user);
    if (action)
        results = results.filter((r) => r.action === action);
    if (resource)
        results = results.filter((r) => r.resource === resource);
    if (start)
        results = results.filter((r) => r.timestamp >= start);
    if (end)
        results = results.filter((r) => r.timestamp <= end);
    res.json({ records: results });
});
exports.default = exports.app;
