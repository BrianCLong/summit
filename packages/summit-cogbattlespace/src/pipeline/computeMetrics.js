"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDivergenceMetrics = computeDivergenceMetrics;
exports.computeBeliefGapMetrics = computeBeliefGapMetrics;
function id(prefix) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
function computeDivergenceMetrics(links, asOf) {
    return links.map((link) => ({
        id: id('div'),
        narrativeId: link.narrativeId,
        claimId: link.claimId,
        divergenceScore: link.type === 'contradicts' || link.type === 'misrepresents' ? link.score : 0,
        asOf,
    }));
}
function computeBeliefGapMetrics(links, cohortId, asOf) {
    return links.map((link) => ({
        id: id('gap'),
        cohortId,
        beliefId: link.beliefId,
        claimId: link.claimId,
        gap: link.gap,
        asOf,
    }));
}
