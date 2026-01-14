# GA Bundle Release Artifacts Inclusion (v1)

Purpose: Ensure GA bundle assembly stages release-artifacts inventory and checksums, and provenance/bundle index manifests report the hashes.

Scope:

- scripts/release/
- docs/roadmap/STATUS.json
- prompts/release/ga-bundle-release-artifacts@v1.md
- prompts/registry.yaml
- agents/examples/
- artifacts/agent-runs/
- artifacts/agent-metrics.json

Requirements:

- Stage artifacts/release-artifacts/inventory.json and artifacts/release-artifacts/SHA256SUMS into the GA bundle under release-artifacts/.
- Update provenance/bundle index manifests to include these files and their hashes.
- Update roadmap status metadata per governance instructions.

Verification:

- scripts/check-boundaries.cjs
- Bundle manifests list release-artifacts inventory and checksums with hashes.
