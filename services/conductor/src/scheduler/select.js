"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectPool = selectPool;
const score_1 = require("./score");
const pools_1 = require("./pools");
function selectPool(req, ctx) {
    const eligible = (0, pools_1.listEligible)(req);
    const ranked = eligible
        .map((p) => ({ p, s: (0, score_1.scorePool)(p, req, ctx) }))
        .sort((a, b) => a.s - b.s);
    return ranked[0]?.p || null;
}
