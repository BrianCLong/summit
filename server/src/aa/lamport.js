"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextLamport = nextLamport;
let L = 0;
function nextLamport(remote) {
    L = Math.max(L, remote || 0) + 1;
    return L;
}
