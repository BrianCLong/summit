# Doctrine Enforcement Spine

Phase 1 enforcement helpers for Summit/IntelGraph governance runtime hooks. The package
codifies evidence, authority, admissibility, and refusal requirements so hosts can block
decisions that lack compliance-grade provenance.

## Exports

- `DecisionValidator.validate(proposal)` → `ValidationResult`
- `InformationGate.admit(fact, now?)` → `ValidationResult`
- `RefusalRecord` → auditable refusal artifact (constructor throws if invalid)

## Usage

```ts
import { DecisionValidator, InformationGate, RefusalRecord } from "@summit/doctrine-enforcement";

const decision = DecisionValidator.validate({
  summary: "Approve containment for suspected manipulation",
  evidence: [{ id: "ev-123", source: "ledger" }],
  confidence: 0.72,
  authority: { actor: "Alice Analyst", role: "Duty Officer" },
});

if (!decision.ok) {
  const refusal = new RefusalRecord({
    reason: "Decision missing required evidence/authority",
    actor: "Duty Officer",
    evidenceIds: decision.issues.map((issue) => issue.field),
    doctrineRefs: ["purpose-lock", "refusal-surface"],
  });
  console.warn(refusal.toJSON());
}

const admission = InformationGate.admit({
  id: "fact-1",
  source: "ledger",
  attribution: "intel-ops",
  receivedAt: new Date(),
});

if (!admission.ok) {
  const refusal = new RefusalRecord({
    reason: "Fact failed admissibility checks",
    actor: "Duty Officer",
    evidenceIds: ["fact-1"],
    doctrineRefs: ["information-lifecycle", "refusal-surface"],
  });
  console.warn(refusal.toJSON());
}
```

## Tests

```bash
pnpm --filter @summit/doctrine-enforcement test
```
