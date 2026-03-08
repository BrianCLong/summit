"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskyDelta = riskyDelta;
function riskyDelta(prev, next) {
    const added = next.packages.filter((p) => !prev.packages.some((q) => q.purl === p.purl));
    return added.filter((p) => p.license?.match(/GPL|AGPL/i) || p.vuln?.severity === 'critical');
}
