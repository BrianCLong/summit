export function bayesianUpdate(prior, evidence) {
    let odds = prior / (1 - prior);
    for (const e of evidence) {
        const weight = e.likelihoodGivenHypothesis / e.likelihoodGivenAlternative;
        odds *= weight;
    }
    return odds / (1 + odds);
}
export function applyEvidence(h, e) {
    const evidence = [...h.evidence, e];
    const posterior = bayesianUpdate(h.prior, evidence);
    return { ...h, evidence, posterior };
}
export function addDissent(h, note) {
    return { ...h, dissent: [...h.dissent, note] };
}
export function missingEvidencePrompts(h) {
    const uncited = h.evidence.filter((e) => !e.cited);
    return uncited.map((e) => `Evidence ${e.id} lacks citation`);
}
//# sourceMappingURL=index.js.map