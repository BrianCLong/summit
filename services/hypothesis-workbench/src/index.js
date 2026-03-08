"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HypothesisWorkbench = void 0;
class HypothesisWorkbench {
    hypotheses = [];
    evidence = [];
    addHypothesis(h) {
        this.hypotheses.push(h);
    }
    addEvidence(e) {
        this.evidence.push(e);
    }
    // Bayesian update (simplified)
    updateBelief() {
        this.hypotheses.forEach(h => {
            let posterior = h.priorProbability;
            this.evidence.forEach(e => {
                const support = h.evidenceSupport[e.id] || 0;
                posterior += support * e.weight * 0.1; // Simplified update
            });
            h.posteriorProbability = Math.max(0, Math.min(1, posterior));
        });
    }
    generateBrief() {
        let brief = '# Analysis of Competing Hypotheses\n\n';
        brief += '## Hypotheses\n';
        this.hypotheses.forEach(h => {
            brief += `- **${h.description}**: ${(h.posteriorProbability * 100).toFixed(1)}% likelihood\n`;
        });
        brief += '\n## Evidence\n';
        this.evidence.forEach(e => {
            if (!e.citation) {
                brief += `⚠️ **Missing citation**: ${e.description}\n`;
            }
            else {
                brief += `- ${e.description} [${e.citation}]\n`;
            }
        });
        return brief;
    }
    exportDisclosurePack() {
        return {
            hypotheses: this.hypotheses,
            evidence: this.evidence,
            provenanceHashes: this.evidence.map(e => e.provenanceHash).filter(Boolean),
        };
    }
}
exports.HypothesisWorkbench = HypothesisWorkbench;
