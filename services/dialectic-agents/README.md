# Dialectic Co-Agents (DCQ)

Paired adversarial reasoners generating arguments/counter-arguments with Decision Debate Record (DDR).

## Features
- ✅ Claim/counter-argument generation
- ✅ Coverage/novelty threshold stopping rule
- ✅ DDR export (claims, counters, assumptions, flip conditions)
- ✅ Signed artifact

## Usage
```typescript
import { DialecticAgents } from '@intelgraph/dialectic-agents';

const agents = new DialecticAgents();
const ddr = await agents.debate('Should we proceed with operation X?', 5);

console.log(ddr.claims);
console.log(ddr.counters);
console.log(ddr.coverageMetrics);
console.log(ddr.flipConditions);
```
