# Agent Backlog Pull Workflow

Agents **pull** work instead of being pushed tasks. Pulls are guarded by scope, budget, and
verification constraints and must be reproducible from the backlog snapshot.

## Preconditions

- Backlog items conform to `backlog/item.schema.json` and are present in the latest
  `artifacts/backlog/backlog-snapshot.json`.
- Agent capabilities and budgets are defined in `backlog/agents.yaml`.
- Scores use weights from `backlog/weights.yaml`; CI regenerates snapshots before assignment.
  The scoring script validates items against the schema and fails fast on any violations.

## Pull Steps

1. **Score the backlog** (CI):
   ```bash
   npx tsx scripts/backlog/score-items.ts --items backlog/examples --weights backlog/weights.yaml \
     --schema backlog/item.schema.json --out artifacts/backlog/backlog-snapshot.json \
     --metrics artifacts/backlog/backlog-metrics.json
   ```
2. **Validate assignment** (agent request):

   ```bash
   npx tsx scripts/backlog/assign-to-agent.ts --item BL-0002 --agent Jules \
     --snapshot artifacts/backlog/backlog-snapshot.json --agents backlog/agents.yaml \
     --out artifacts/backlog-decisions
   ```

   - Fails if the agent is outside category/domain scope, lacks verification tier, or exceeds
     risk/debt budgets.

3. **Lock the task spec** once assignment is approved:
   ```bash
   npx tsx scripts/backlog/to-task-spec.ts --item BL-0002 --agent Jules \
     --snapshot artifacts/backlog/backlog-snapshot.json --out artifacts/backlog-decisions
   ```
   The resulting `artifacts/backlog-decisions/BL-0002.json` is the immutable Agent Task Spec.

## Rules

- **No silent backlog creation**: signals without evidence cannot be turned into items.
- **No self-assignment outside rules**: only `assign-to-agent.ts` can authorize a pull.
- **Budgets enforced**: `budget_impact.risk/debt` must be <= agent budgets before work begins.
- **Verification tier match**: required tier in the backlog item must be present in the agent record.
- **Provenance required**: task specs must record snapshot path, generation time, and source signals.

## Governance Hooks

- CI validates the snapshot + metrics artifacts as evidence.
- Assignment decisions are written to `artifacts/backlog-decisions/*-assignment.json` for audit.
- Humans approve strategy; agents pull items within the approved guardrails.
