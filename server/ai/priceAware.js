"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveUSD = effectiveUSD;
function effectiveUSD(base, tokK, gpuMin, ptok, pgpu) {
    return base + tokK * ptok + gpuMin * pgpu;
}
