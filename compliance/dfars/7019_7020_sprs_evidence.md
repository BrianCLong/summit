# DFARS 7019/7020 SPRS Evidence Pack

Supports DoD assessment requirements by producing a control-evidence bundle aligned to NIST SP 800-171 Rev. 3 and a SPRS-ready summary.

## Evidence Inputs

- Control-evidence compiler outputs (telemetry-to-control mappings)
- SSP references and POA&M deltas
- Replay tokens for assessment runs
- Transparency log digests for integrity

## Evidence Outputs

| Output              | Description                               |
| ------------------- | ----------------------------------------- |
| Assessment Artifact | Control bundle + sufficiency indicators   |
| SPRS Summary        | Control score readiness, dates, and scope |
| POA&M Delta         | Missing evidence and mitigation timeline  |

## Policy-as-Code Controls

- `intelgraph.policy.contracting` enforces evidence sufficiency before export.
- Missing control IDs or insufficient evidence blocks SPRS bundle generation.

## Operational Steps

1. Collect telemetry for the defined assessment window.
2. Map telemetry to controls using the control matrix.
3. Produce the assessment artifact and replay token.
4. Export the SPRS summary and attach audit digests.
