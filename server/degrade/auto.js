"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoshed = autoshed;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function autoshed() {
    const prom = process.env.PROM_URL;
    const q = 'route:latency:p95{path="/search"}';
    const v = Number((await (await (0, node_fetch_1.default)(`${prom}/api/v1/query?query=${encodeURIComponent(q)}`)).json()).data.result?.[0]?.value?.[1] || '0');
    if (v > 1.5)
        await (0, node_fetch_1.default)(process.env.FLAG_API, {
            method: 'POST',
            body: JSON.stringify({ flag: 'ranker_v2', value: false }),
        });
}
