# Hypothesis Workbench (ACH)

Analysis of Competing Hypotheses workbench with Bayesian updates, evidence tracking, and auto-generated briefs.

## Features
- ✅ Competing hypotheses tracking
- ✅ Evidence with citations and provenance
- ✅ Bayesian belief update
- ✅ Missing-evidence prompts
- ✅ Disclosure Pack export

## Usage
```typescript
import { HypothesisWorkbench } from '@intelgraph/hypothesis-workbench';

const bench = new HypothesisWorkbench();
bench.addHypothesis({ id: 'h1', description: 'Insider threat', priorProbability: 0.5, evidenceSupport: {} });
bench.addEvidence({ id: 'e1', description: 'Unusual access pattern', citation: 'log-2024-01', weight: 0.8 });
bench.updateBelief();
console.log(bench.generateBrief());
```
