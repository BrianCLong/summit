"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advise = advise;
const yaml_1 = __importDefault(require("yaml"));
const pools_js_1 = require("./conductor/scheduling/pools.js");
async function advise({ runbookYaml }) {
    const rb = yaml_1.default.parse(runbookYaml);
    const pools = await (0, pools_js_1.listPools)();
    const pricing = await (0, pools_js_1.currentPricing)();
    const recs = [];
    let savedUsd = 0;
    const estFor = (_n) => ({ cpuSec: 60, gbSec: 1, egressGb: 0.02 });
    for (const n of rb?.graph?.nodes || []) {
        const est = estFor(n);
        const residency = rb?.policy?.residency;
        const best = (0, pools_js_1.pickCheapestEligible)(pools, pricing, est, residency);
        if (best) {
            recs.push({ stepId: n.id, to: best.id, estPrice: best.price });
            savedUsd += Math.max(0, best.price * 0.1); // placeholder savings estimate
        }
    }
    return { savedUsd, recs };
}
