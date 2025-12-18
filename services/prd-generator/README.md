# PRD Generator & Acceptance-Pack Scaffolder

Generate complete PRD (Markdown) and acceptance-test pack for new features.

## Features
- ✅ PRD structure (Executive Summary → Risks)
- ✅ MoSCoW matrix
- ✅ Jest unit test scaffold
- ✅ k6 load test scaffold
- ✅ Definition of Done checklist

## Usage
```typescript
import { PRDGenerator } from '@intelgraph/prd-generator';

const gen = new PRDGenerator();
const prd = gen.generate({
  productName: 'GraphRAG Copilot',
  users: ['Analysts', 'Investigators'],
  goals: ['Fast graph queries', 'Explainable results'],
});

const scaffold = gen.scaffold(prd);
console.log(scaffold.files['PRD.md']);
console.log(scaffold.files['tests/acceptance.test.ts']);
```

CLI: `npx prd-init --name "My Feature" --users "analyst,admin" --goals "fast,secure"`
