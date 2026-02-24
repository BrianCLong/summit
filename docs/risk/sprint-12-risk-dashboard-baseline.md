# Sprint 12 Risk Dashboard Baseline (As of 2026-02-24)

## Baseline Signals

| Metric | Baseline | Sprint 12 Target | Source |
| --- | --- | --- | --- |
| GitHub Actions refs pinned by SHA | 225 / 868 (25.9%) | +3 pinned refs (remove 3 unpinned refs) | `.github/workflows/*` static scan |
| GitHub Actions refs unpinned | 643 / 868 (74.1%) | 640 or lower | `.github/workflows/*` static scan |
| Required check status for SBOM scan | Conditional, not always-required | Always-required for Golden Path services | `docs/ci/REQUIRED_CHECKS_POLICY.yml` |
| Production CVE high threshold in release policy | `high_cves == 0` already encoded | Keep `max_high=0` default, add waiver governance | `docs/release-reliability/policies/release_gate.rego` |
| Evidence collection freshness | Last governance collection at `2026-01-23T08:57:27Z` | Daily evidence refresh during sprint | `docs/releases/_state/evidence_state.json` |

## Risk Ledger (Pre-Mortem)

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Cosign key mismanagement | Medium | High | KMS-backed keyless identity policy + rotation runbook |
| False-positive CVE blocks | Medium | Medium | Timeboxed waiver path with named approver and expiry |
| Canary flap loops | Medium | High | 5-minute rolling windows + hold-down cooldown |
| CI slowdown from added scans | High | Medium | Parallelized jobs, cache reuse, target max +5% runtime |

## Dashboard Panels to Publish Before Sprint Start

1. Signed artifact coverage by service.
2. CVE budget burn-down and waiver count.
3. Canary rollback events with MTTR and trigger reason.
4. CI runtime trend vs baseline (p50 and p95).

## Deterministic Refresh Commands

```bash
# Action pinning baseline
node - <<'NODE'
const fs = require('fs');
const glob = require('glob');
const files = glob.sync('.github/workflows/*.{yml,yaml}');
let uses = 0, pinned = 0;
for (const file of files) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!m) continue;
    uses += 1;
    const ref = m[1];
    const ver = ref.includes('@') ? ref.split('@').pop() : '';
    if (/^[0-9a-f]{40}$/i.test(ver)) pinned += 1;
  }
}
console.log(JSON.stringify({ files: files.length, uses, pinned, unpinned: uses - pinned }, null, 2));
NODE

# Release policy sanity check for high-CVE denial
opa eval -d docs/release-reliability/policies/release_gate.rego 'data.companyos.release.no_high_security_issues_in_production'
```
