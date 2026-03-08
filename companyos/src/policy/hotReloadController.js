"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotReloadLoop = hotReloadLoop;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const index_1 = require("../../../clients/cos-policy-fetcher/src/index");
const opaApi_1 = require("./opaApi");
const PACK_URL = process.env.MC_POLICY_PACK_URL; // e.g., http://mc/v1/policy/packs/policy-pack-v0
const POLL_INTERVAL_MS = Number(process.env.POLICY_POLL_INTERVAL_MS ?? 15000);
let lastDigest = '';
async function sha256(buf) {
    return node_crypto_1.default.createHash('sha256').update(buf).digest('hex');
}
async function hotReloadLoop(signal) {
    while (!signal?.aborted) {
        try {
            const dir = await (0, index_1.fetchAndVerify)({ url: PACK_URL });
            const rego = await promises_1.default.readFile(node_path_1.default.join(dir, 'opa', 'cos.abac.rego'));
            const retention = await promises_1.default.readFile(node_path_1.default.join(dir, 'data', 'retention.json'));
            const purposes = await promises_1.default.readFile(node_path_1.default.join(dir, 'data', 'purpose-tags.json'));
            const dig = await sha256(Buffer.concat([rego, retention, purposes]));
            if (dig !== lastDigest) {
                await (0, opaApi_1.putPolicy)(rego.toString('utf8'), 'cos.abac');
                await (0, opaApi_1.putData)('cos/retention', JSON.parse(retention.toString('utf8')));
                await (0, opaApi_1.putData)('cos/purpose_tags', JSON.parse(purposes.toString('utf8')));
                lastDigest = dig;
                console.log('[policy] hot-reloaded pack digest', dig.slice(0, 12));
            }
        }
        catch (e) {
            console.warn('[policy] reload error:', e.message);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}
