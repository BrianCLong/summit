"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canServeResult = canServeResult;
function canServeResult(resultMeta, proofs) {
    const req = resultMeta.required_hash;
    if (!req) {
        return false;
    } // deny-by-default
    return proofs.some(p => p.path_token === resultMeta.path_token && p.hash === req);
}
