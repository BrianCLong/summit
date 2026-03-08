"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const regions = [
    { name: 'eu-west-1', weight: 1, traffic: 'low' },
    { name: 'us-east-1', weight: 2, traffic: 'high' },
    { name: 'ap-south-1', weight: 1, traffic: 'med' },
];
async function healthy() {
    const r = await (0, node_fetch_1.default)(process.env.SLO_URL);
    return (await r.json()).burnRateP95 < 1.0;
}
(async () => {
    const wave0 = regions.filter((r) => r.traffic === 'low');
    const wave1 = regions.filter((r) => r.traffic !== 'low');
    await rollout(wave0);
    if (await healthy())
        await Promise.all([rollout([wave1[0]]), rollout([wave1[1]])]);
    else
        process.exit(1);
})();
async function rollout(rs) {
    for (const r of rs) {
        console.log('rollout', r.name); /* kubectl/argo here */
    }
}
