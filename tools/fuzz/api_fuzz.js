"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const fast_check_1 = __importDefault(require("fast-check"));
const base = process.env.BASE || 'http://localhost:4000';
const arbs = {
    decision: fast_check_1.default.constantFrom('allow', 'deny'),
    policy: fast_check_1.default.string({ minLength: 3, maxLength: 32 }),
    resource: fast_check_1.default.record({
        kind: fast_check_1.default.constantFrom('Pod', 'Job'),
        name: fast_check_1.default.string(),
        ns: fast_check_1.default.string(),
    }),
    details: fast_check_1.default.anything(),
};
async function postAdmission(p) {
    const r = await (0, node_fetch_1.default)(`${base}/api/admission/event`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(p),
    });
    return r.status;
}
(async () => {
    await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record(arbs), async (payload) => {
        const s = await postAdmission(payload);
        if (![200, 400, 422].includes(s))
            throw new Error(`unexpected ${s}`);
    }), { numRuns: 100 });
    console.log('API fuzz OK');
})();
