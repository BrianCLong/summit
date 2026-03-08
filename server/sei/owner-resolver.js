"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickOwners = pickOwners;
function pickOwners(scores, k = 2) {
    return scores
        .sort((a, b) => b.p - a.p)
        .slice(0, k)
        .map((x) => x.user);
}
