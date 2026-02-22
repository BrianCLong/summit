# Prompt: Koreai-Agentic Evidence Scaffold (v1)

You are scaffolding the deterministic evidence gate for the Koreai agentic subsumption lane. The
output must include an evidence bundle, a deterministic verifier, and GA verification mappings.
Update the roadmap status and record a DecisionLedger entry with rollback guidance.

## Constraints

- Do not modify production runtime behavior.
- Keep timestamps confined to `stamp.json` only.
- Ensure GA verification artifacts remain deterministic and sorted.

## Deliverables

- Evidence bundle under `evidence/runs/koreai-agentic/`.
- Evidence verifier script and CI workflow gate.
- GA verification map + MVP-4 verification matrix update.
- `docs/roadmap/STATUS.json` update.
- Decision ledger entry with rollback steps.
