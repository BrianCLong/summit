"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nock_1 = __importDefault(require("nock"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const MAESTRO_BASE = 'https://maestro.internal';
(0, vitest_1.describe)('Runbooks trigger API (allow‑listed)', () => {
    (0, vitest_1.afterEach)(() => nock_1.default.cleanAll());
    (0, vitest_1.it)('rejects non‑allow‑listed runbook', async () => {
        const scope = (0, nock_1.default)(MAESTRO_BASE)
            .post('/runbooks/trigger')
            .reply(403, { error: 'runbook not allow‑listed' });
        const res = await (0, node_fetch_1.default)(`${MAESTRO_BASE}/runbooks/trigger`, {
            method: 'POST',
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        scope.done();
    });
});
