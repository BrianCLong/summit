#!/usr/bin/env bash
set -euo pipefail

LABELS="sprint-2026-03-09,good-first-issue,repoos/evidence"

echo "Creating Good First Issues for Sprint 2026-03-09..."

gh issue create \
  --title "Add JSON output + --format=json to repoos-governor-demo.mjs" \
  --body "The \`repoos-governor-demo.mjs\` script currently outputs unstructured text. We need to add a \`--format=json\` flag to output structured JSON for better integrability." \
  --label "$LABELS"

gh issue create \
  --title "Document SEP core usage in docs/evidence/" \
  --body "The Summit Evidence Protocol (SEP) core was recently added. We need comprehensive documentation in \`docs/evidence/\` on how to use it, including examples of creating and verifying claims." \
  --label "$LABELS"

gh issue create \
  --title "Extend parity tests for concurrent writes (#19616 follow-up)" \
  --body "Follow-up to #19616. The deterministic parity tests between Postgres and Neo4j need to be extended to cover concurrent write scenarios and ensure eventual consistency holds." \
  --label "$LABELS"

gh issue create \
  --title "Integrate cognitive terrain engine smoke into repoos-smoke.sh" \
  --body "The cognitive terrain engine needs a quick smoke test. Add a step to \`scripts/repoos-evidence-smoke.sh\` that exercises the core terrain engine functionality." \
  --label "$LABELS"

gh issue create \
  --title "Add verify step for bitemporal ledger in full-governance-gate.sh" \
  --body "The bitemporal provenance ledger needs to be verified during the governance gate. Add a step to \`scripts/full-governance-gate.sh\` (or equivalent) to verify ledger integrity." \
  --label "$LABELS"

gh issue create \
  --title "Create README section for praxeology quarantined validators" \
  --body "Add a section to the main \`README.md\` explaining the purpose and usage of the praxeology quarantined validators introduced in recent commits." \
  --label "$LABELS"

echo "Done creating issues."
