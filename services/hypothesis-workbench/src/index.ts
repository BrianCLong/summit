export interface Evidence {
  id: string;
  description: string;
  citation: string;
  provenanceHash?: string;
  weight: number; // 0-1
}

export interface Hypothesis {
  id: string;
  description: string;
  priorProbability: number;
  evidenceSupport: Record<string, number>; // evidenceId -> support (-1 to 1)
  posteriorProbability?: number;
}

export class HypothesisWorkbench {
  private hypotheses: Hypothesis[] = [];
  private evidence: Evidence[] = [];

  addHypothesis(h: Hypothesis) {
    this.hypotheses.push(h);
  }

  addEvidence(e: Evidence) {
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

  generateBrief(): string {
    let brief = '# Analysis of Competing Hypotheses\n\n';
    brief += '## Hypotheses\n';
    this.hypotheses.forEach(h => {
      brief += `- **${h.description}**: ${(h.posteriorProbability! * 100).toFixed(1)}% likelihood\n`;
    });
    brief += '\n## Evidence\n';
    this.evidence.forEach(e => {
      if (!e.citation) {
        brief += `⚠️ **Missing citation**: ${e.description}\n`;
      } else {
        brief += `- ${e.description} [${e.citation}]\n`;
      }
    });
    return brief;
  }

  exportDisclosurePack(): any {
    return {
      hypotheses: this.hypotheses,
      evidence: this.evidence,
      provenanceHashes: this.evidence.map(e => e.provenanceHash).filter(Boolean),
    };
  }
}
