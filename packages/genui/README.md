# Summit GenUI

This package defines the Summit-native Generative UI plan contract, registry, linting, and evidence
helpers. The model emits structured UI plans; Summit renders them via signed components and policy
filters.

## Core exports

- `UiPlanSchema` + `validatePlan`
- `componentRegistry`
- `lintPlan`, `repairPlan`, `applyPolicyFilter`
- `createEvidenceBundle`

## Usage

```ts
import { validatePlan, lintPlan, repairPlan } from "@intelgraph/genui";

const plan = validatePlan(raw);
const lint = lintPlan(plan);
const repaired = repairPlan(plan);
```
