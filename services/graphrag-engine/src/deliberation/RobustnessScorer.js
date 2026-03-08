"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobustnessScorer = void 0;
class RobustnessScorer {
    /**
     * Computes a robustness score for a given explanation and its supporting proof.
     */
    static score(explanation, proof) {
        // 1. Path Multiplicity: number of edges in proof
        const pathMultiplicity = proof.edges.length;
        // 2. Evidence Diversity: count of distinct provenance fields
        const provenances = new Set(proof.nodes.map(n => n.provenance).filter(p => p));
        const evidenceDiversity = provenances.size;
        // 3. Stability: Simplified as 1 for now
        const stability = 1.0;
        // 4. Minimality: Prefer smaller proof subgraphs when robustness is equal
        const minimality = proof.nodes.length > 0 ? 1 / proof.nodes.length : 0;
        // Weighted combination
        const score = (pathMultiplicity * 0.3) + (evidenceDiversity * 0.4) + (stability * 0.2) + (minimality * 0.1);
        return {
            score,
            pathMultiplicity,
            evidenceDiversity,
            stability,
            minimality
        };
    }
}
exports.RobustnessScorer = RobustnessScorer;
