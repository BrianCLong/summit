GA Readiness Assets — Quick Start

What’s Included
- RACI plan: project_management/ga-readiness/30-60-90-raci.md
- Kanban board: project_management/ga-readiness/kanban.yaml
- OPA gates (SLO, SBOM diff, WebAuthn): tools/ci/governance-policy.rego
- Synthetic NLQ probes: tools/synthetics/ (nlq-probe.js, golden-queries.json, README.md)
- Gate input contract: docs/generated/governance-gates.md

How to Use
- RACI & Kanban: import YAML into your PM tool or reference directly in PRs.
- OPA gates: in CI, render a JSON input matching docs/generated/governance-gates.md and evaluate governance-policy.rego.
- Synthetics: set GATEWAY_URL and run `node tools/synthetics/nlq-probe.js`; wire into a cron/CI job.

Next Steps
- Connect SBOM diff output to the OPA input fields.
- Feed burn-rate metrics into the OPA gate from your SLO exporter.
- Adjust golden queries to your most critical NLQ paths.

