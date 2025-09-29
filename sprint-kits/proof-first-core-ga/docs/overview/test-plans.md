# Test Plans

## Acceptance Packs

- **Prov-Ledger:** Run `prov-verify` against `fixtures/case-demo`; expect exit 0. Tampering should produce a non-zero exit with diff details.
- **NL→Cypher:** Execute corpus to confirm ≥95% syntactic validity; preserve diff snapshots for regression.
- **Entity Resolution:** Validate reversible merges and `/er/explain` responses returning features and rationale JSON.
- **Ops:** Trigger k6 load scripts to exercise SLO alerts and confirm Cost Guard kill events are logged.
- **UI:** Run Cypress time-to-path benchmark and capture screenshot diffs for Explain overlay.

## k6 Smoke Script Skeleton

```js
import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = { vus: 10, duration: '2m' };
export default function () {
  const r = http.post('https://api.local/query', {
    cypher: 'MATCH (n)-[r*1..3]->(m) RETURN n LIMIT 100',
  });
  check(r, {
    'status 200': (res) => res.status === 200,
    'latency ok': (res) => res.timings.duration < 1500,
  });
  sleep(1);
}
```
