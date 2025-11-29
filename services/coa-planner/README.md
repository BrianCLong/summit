# COA Planner + Monte Carlo Simulator

Course-of-Action planner with Monte Carlo "what-if" simulation for risk/impact analysis.

## Features
- ✅ DAG-based COA modeling
- ✅ Monte Carlo simulation (1k runs)
- ✅ Reproducible seeds
- ✅ Risk/impact bands
- ✅ Performance tested (1k-node DAGs)

## Usage
```typescript
import { COAPlanner } from '@intelgraph/coa-planner';

const planner = new COAPlanner();
planner.loadCOA('coa-1', [
  { id: 'n1', action: 'Recon', resources: ['team-a'], duration: 2, riskFactor: 0.1, dependencies: [] },
  { id: 'n2', action: 'Execute', resources: ['team-a', 'team-b'], duration: 4, riskFactor: 0.3, dependencies: ['n1'] },
]);

const result = planner.simulate('coa-1', 1000, 42);
console.log(result.outcomes); // { success: 650, failure: 250, delayed: 100 }
```
