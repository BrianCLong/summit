# NLQ Synthetic Probes

Location
- Script: `ops/synthetics/nlq-probes.js`
- Workflow: `.github/workflows/synthetics-nlq.yml`

Env
- `NLQ_URL` secret points to the NL→Cypher endpoint.

Pass Criteria
- HTTP 200, p95 < 2s, shape checks ≥ 99%.

