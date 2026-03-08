"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveCost = effectiveCost;
function effectiveCost(baseUSD, usage, price) {
    return baseUSD + usage.gpuMin * price.gpu + (usage.tokens / 1000) * price.tok;
}
