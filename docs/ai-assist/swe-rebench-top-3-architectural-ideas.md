# SWE-rebench V2: Three Architectural Ideas Summit Should Operationalize

## Summit readiness assertion

Summit now has a concrete SWE substrate surface in-repo (`datasets/swe-rebench/`, `evaluation/swe/`, `src/evals/swe/`) and should advance by hardening determinism, validation, and behavior-first scoring along that exact path.

## 1) Environment reconstruction is a first-class control loop

### Insight
SWE tasks are environment-reconstruction problems before they are patch-generation problems. Deterministic checkout, setup, and test execution are required to produce valid learning/evaluation signals.

### Summit implication
Treat environment planning/execution as mandatory preconditions for every task attempt.

### Implementation mapping (existing module anchors)
- `evaluation/swe/containerRunner.ts` for policy-constrained container execution.
- `evaluation/swe/runTask.ts` for deterministic before/after execution flow.
- `datasets/swe-rebench/loader.ts` for instance metadata hydration that includes image + base commit fields.

## 2) Fail→Pass behavior delta is the core optimization target

### Insight
Patch similarity is not the primary objective. Correctness is represented by behavioral transitions in test outcomes.

### Summit implication
Reward and evaluation should prioritize:
- failing tests resolved,
- regressions avoided,
- bounded patch-size penalties (optional shaping).

### Implementation mapping
- `src/evals/swe/behaviorReward.ts` computes behavior-first reward values.
- `evaluation/swe/runTask.ts` emits deterministic artifacts:
  - `report.json`
  - `metrics.json`
  - `stamp.json`

## 3) Dataset scale requires validator agents

### Insight
Large harvested task pools include noisy/invalid items. Validator gates are required to prevent polluted training/evaluation sets.

### Summit implication
Task eligibility should require explicit proof of:
1. executable setup,
2. reproducible fail-state,
3. verifiable post-patch correction,
4. regression safety.

### Implementation mapping
- `src/evals/swe/taskValidator.ts` for validation decisioning + validated task manifest writes.
- `datasets/swe-rebench/validated_tasks.json` as machine-readable eligibility record.

## Recommended Summit agent loop

1. Load dataset instance (`datasets/swe-rebench/loader.ts`)
2. Validate task (`src/evals/swe/taskValidator.ts`)
3. Prepare deterministic execution plan (`evaluation/swe/containerRunner.ts`)
4. Execute before/after tests (`evaluation/swe/runTask.ts`)
5. Compute behavior reward (`src/evals/swe/behaviorReward.ts`)
6. Emit evidence artifacts (`report/metrics/stamp + behavior_metrics`)

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt injection via repo text, malicious setup scripts, supply-chain drift, test bypass patches, artifact tampering.
- **Mitigations:** image allowlists, sandboxed containers (`--network none`), deterministic artifact schemas, validator fail-closed checks, reproducible metadata (`base_commit`, image).

## Finality

Summit should proceed with implementation-backed, test-validated increments on the existing SWE module surface to produce a clean, deterministic, machine-verifiable benchmark and training substrate.
