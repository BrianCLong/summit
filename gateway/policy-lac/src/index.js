"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const policy_store_1 = require("./policy-store");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const POLICY_DIR = process.env.LAC_POLICY_DIR || path_1.default.join(__dirname, '..', 'policies', 'examples');
let cachedPolicy = (0, policy_store_1.mergePolicies)((0, policy_store_1.discoverPolicies)(POLICY_DIR));
function validateContext(body) {
    if (!body || typeof body.action !== 'string' || typeof body.resource !== 'string') {
        throw new Error('Invalid context: action and resource are required strings');
    }
    if (!body.attributes || typeof body.attributes !== 'object') {
        body.attributes = {};
    }
}
app.post('/policy/explain', (req, res) => {
    try {
        validateContext(req.body);
        const decision = (0, policy_store_1.explainDecision)(cachedPolicy, req.body);
        res.json({ ...decision, policyVersion: cachedPolicy.version });
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Invalid request' });
    }
});
app.post('/policy/reload', (_req, res) => {
    cachedPolicy = (0, policy_store_1.mergePolicies)((0, policy_store_1.discoverPolicies)(POLICY_DIR));
    res.json({ ok: true, rules: cachedPolicy.rules.length });
});
app.post('/policy/diff', (req, res) => {
    try {
        const { leftPath, rightPath } = req.body || {};
        if (typeof leftPath !== 'string' || typeof rightPath !== 'string') {
            throw new Error('leftPath and rightPath are required');
        }
        const left = (0, policy_store_1.mergePolicies)((0, policy_store_1.discoverPolicies)(path_1.default.dirname(leftPath)));
        const right = (0, policy_store_1.mergePolicies)((0, policy_store_1.discoverPolicies)(path_1.default.dirname(rightPath)));
        res.json((0, policy_store_1.diffPolicies)(left, right));
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Invalid request' });
    }
});
app.get('/health', (_req, res) => res.send('ok'));
function startServer() {
    const port = Number(process.env.PORT || 4000);
    return app.listen(port, () => console.log(`[policy-lac] listening on ${port}`));
}
if (require.main === module) {
    startServer();
}
exports.default = app;
