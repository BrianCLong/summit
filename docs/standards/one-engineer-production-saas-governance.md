# Standard: one-engineer-production-saas-governance

## MAESTRO Layers
- Data
- Agents
- Tools
- Observability
- Security

## Threats Considered
- Prompt injection to bypass policy checks
- Data exfiltration from over-broad retrieval
- Over-privileged API actions

## Mitigations
- Policy aware input sanitization with allowlist parser
- Mandatory data classification enforcement before output
- Least privilege schema validation and deny-by-default fallback

## Interop
- Input: service description, threat model YAML, data classification JSON.
- Output: governance report.json, metrics.json, stamp.json.

## Performance Budget
- Runtime budget: median generation time must remain below 200ms.
- Memory budget: peak memory must remain below 50MB.
- Profiler: `scripts/perf/profile_governance.py`.
- Artifact: `governance/one-engineer-production-saas-governance/perf.json`.
