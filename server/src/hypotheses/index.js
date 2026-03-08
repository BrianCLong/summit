"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bayesianUpdate = bayesianUpdate;
exports.applyEvidence = applyEvidence;
exports.addDissent = addDissent;
exports.missingEvidencePrompts = missingEvidencePrompts;
function bayesianUpdate(prior, evidence) {
    let odds = prior / (1 - prior);
    for (const e of evidence) {
        const weight = e.likelihoodGivenHypothesis / e.likelihoodGivenAlternative;
        odds *= weight;
    }
    return odds / (1 + odds);
}
function applyEvidence(h, e) {
    const evidence = [...h.evidence, e];
    const posterior = bayesianUpdate(h.prior, evidence);
    return { ...h, evidence, posterior };
}
function addDissent(h, note) {
    return { ...h, dissent: [...h.dissent, note] };
}
function missingEvidencePrompts(h) {
    const uncited = h.evidence.filter((e) => !e.cited);
    return uncited.map((e) => `Evidence ${e.id} lacks citation`);
}
