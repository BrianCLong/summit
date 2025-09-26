# MC v0.3.2 — PR Batch, Interop Gateways, and Evidence Scaffold (ready-to-merge)

> This package contains **merge-ready PR specs + code patches** for: (1) Tier‑3 autonomy expansion on TENANT_002, (2) readiness assessment pipeline for TENANT_006/007, (3) MCP/A2A interop gateways with policy/audit enforcement, and (4) a complete **v0.3.2‑mc evidence scaffold**. All artifacts are designed to pass existing MC gates (persisted‑only, OPA, SLO/cost, red‑team) and extend the “better‑than‑guide” deltas.

---

## PR‑1 — Tier‑3 Autonomy (computed) on TENANT_002
**Branch**: `feature/t3-autonomy-t2`  
**Summary**: Enables Tier‑3 (read‑only + computed aggregations) for TENANT_002 with counterfactual simulation + HITL and tripwires.

### Files Added/Changed
- `ops/autonomy/tenants/TENANT_002/runbook.md`
- `ops/autonomy/tenants/TENANT_002/policy-overrides.yaml`
- `ops/autonomy/tenants/TENANT_002/sim-scenarios.json`
- `ops/autonomy/scripts/enable-tier3.sh`

### Key Content
```bash
# ops/autonomy/scripts/enable-tier3.sh
set -euo pipefail
TENANT=${1:-TENANT_002}
mc autonomy set --tenant "$TENANT" --tier T3 --scope read-only,computed --require-hitl true
mc autonomy simulate --tenant "$TENANT" --op-set derived_updates --evidence out/${TENANT}-sim.json
mc autonomy enact --tenant "$TENANT" --approval-token "$MC_APPROVAL_TOKEN" --from-sim out/${TENANT}-sim.json --evidence out/${TENANT}-enact.json
mc autonomy status --tenant "$TENANT" --verbose | tee out/${TENANT}-status.txt
```

```yaml
# ops/autonomy/tenants/TENANT_002/policy-overrides.yaml
tripwires:
  slo_fast_burn: { threshold: 0.02, window: 3600, action: halt }
  slo_slow_burn: { threshold: 0.10, window: 21600, action: halt }
  compensation_rate: { threshold: 0.005, window: 86400, action: pause }
scopes:
  computed:
    writeTargets: [ materializedViews, denormCounters ]
    exclusions: [ export, retention, crossTenant ]
```

```json
// ops/autonomy/tenants/TENANT_002/sim-scenarios.json
{
  "scenarios": [
    { "name": "mv-refresh-hotkeys", "ops": 2500, "expect": {"successRate": ">=0.999", "compensationRate": "<=0.005"} },
    { "name": "counter-recompute", "ops": 500, "expect": {"successRate": ">=0.999", "compensationRate": "<=0.005"} }
  ]
}
```

**Acceptance**: sim→enact success ≥99.9%, compensation ≤0.5%, no residency/privacy violations, no SLO regression. Evidence artifacts: `out/TENANT_002-*.json` + status.

---

## PR‑2 — Readiness Assessment Pipeline for TENANT_006 & TENANT_007
**Branch**: `feature/aa-readiness-t6-t7`  
**Summary**: Adds pipeline and fixtures to evaluate A/A rollout readiness and schedule monthly DR drills.

### Files Added
- `ops/readiness/tenants/TENANT_006/checklist.yaml`
- `ops/readiness/tenants/TENANT_007/checklist.yaml`
- `ops/readiness/run-assessment.sh`
- `ops/dr/schedule/monthly/dr-drill-schedule-monthly.json` (links existing artifact)

```yaml
# ops/readiness/tenants/TENANT_006/checklist.yaml
trafficProfile: { dailyOps: 1.2e6, peakQPS: 180 }
residencyTags: [ US ]
cachePlan: { hotKeyTTL: 300, maxKeys: 20000 }
queryBudgets: { topOps: [ "pq.getPersonById", "pq.searchEntitiesByName" ] }
compliance: { persistedOnly: ">=0.999", residencyViolations: 0 }
disasterRecovery: { enrolled: true, rpo: "<=5m", rto: "<=30m" }
```

```bash
# ops/readiness/run-assessment.sh
set -euo pipefail
TENANT=${1:?tenant required}
mc readiness assess --tenant "$TENANT" --checklist ops/readiness/tenants/${TENANT}/checklist.yaml --out out/${TENANT}-readiness.json
jq -e '.status=="READY"' out/${TENANT}-readiness.json
```

**Acceptance**: both tenants produce `status: READY` with attached metrics; DR schedule registered.

---

## PR‑3 — MCP Client/Server Adapter + A2A Interop Gateway (policy/audit enforced)
**Branch**: `feature/mcp-a2a-gateways`

**Summary**: Introduces a governed interop layer so external agents/tools interact via **MCP** (Model Context Protocol) and **A2A** (agent‑to‑agent) endpoints while remaining **persisted‑only**, **OPA‑simulated**, and **audit‑logged**.

### Files Added
- `services/interop/mcp/server.ts` — MCP server; exposes tools through MC policy wrapper
- `services/interop/mcp/client.ts` — MCP client; calls external MCP servers *through* policy/audit
- `services/interop/a2a/gateway.ts` — JSON/HTTP bridge for agent‑to‑agent calls with provenance
- `services/interop/policy-wrapper.ts` — shared OPA & residency/purpose guard
- `services/interop/audit.ts` — SIEM sink integration (replaces file sink if configured)

```ts
// services/interop/policy-wrapper.ts
export async function enforcePolicy(ctx:{tenantId:string,purpose:string,residency:string,pqid?:string}, action:{kind:string, resource:string}){
  const sim = await simulateOPA({ input: { ...ctx, action } });
  if(!sim.allow) throw new Error(`OPA_DENY: ${sim.reasons?.join('; ')}`);
}
```

```ts
// services/interop/a2a/gateway.ts (excerpt)
app.post('/a2a/perform', async (req,res)=>{
  const { tenantId, purpose, residency, pqid, agent, task } = req.body;
  await enforcePolicy({ tenantId, purpose, residency, pqid }, { kind:'a2a', resource: agent });
  const result = await routeToAgent(agent, task); // calls via MCP client or provider
  await audit('a2a.perform', { tenantId, agent, taskHash: hash(task), resultMeta: summarize(result) });
  res.json({ ok:true, result, provenance: { hash: hash(result), time: Date.now() }});
});
```

```ts
// services/interop/mcp/server.ts (excerpt)
import { MCPServer } from 'mcp-kit'; // placeholder impl; bind actual library in repo
MCPServer.tool('graph.query', async (ctx, params)=>{
  await enforcePolicy(ctx, { kind:'tool', resource:'graph.query' });
  return runPersistedGraphQuery(ctx.tenantId, params.pqid, params.vars);
});
```

**Acceptance**: All interop calls fail closed without OPA allow + persisted‑only; audit events emitted; e2e tests green.

---

## PR‑4 — v0.3.2 Evidence Scaffold & CI wiring
**Branch**: `release/v0.3.2-mc`

### Files Added
- `evidence/v0.3.2/manifest.json`
- `evidence/v0.3.2/checksums.txt`
- `evidence/v0.3.2/README.md`
- `.github/workflows/evidence-v0.3.2.yml`

```json
// evidence/v0.3.2/manifest.json
{
  "version": "v0.3.2-mc",
  "artifacts": [
    { "name": "TENANT_002-sim", "path": "out/TENANT_002-sim.json", "hash": "TBD" },
    { "name": "TENANT_002-enact", "path": "out/TENANT_002-enact.json", "hash": "TBD" },
    { "name": "TENANT_002-status", "path": "out/TENANT_002-status.txt", "hash": "TBD" },
    { "name": "TENANT_006-readiness", "path": "out/TENANT_006-readiness.json", "hash": "TBD" },
    { "name": "TENANT_007-readiness", "path": "out/TENANT_007-readiness.json", "hash": "TBD" },
    { "name": "mcp-a2a-tests", "path": "out/mcp-a2a-tests.json", "hash": "TBD" },
    { "name": "slo-baseline", "path": "out/slo-v0.3.2-baseline.json", "hash": "TBD" },
    { "name": "k6-crossregion", "path": "out/k6-aa-v0.3.2.json", "hash": "TBD" },
    { "name": "privacy-redteam", "path": "out/privacy-redteam-v0.3.2.json", "hash": "TBD" }
  ],
  "signing": { "algo": "ed25519", "keyRef": "${{ secrets.MC_SIGNING_KEY }}" }
}
```

```yaml
# .github/workflows/evidence-v0.3.2.yml
name: evidence-v0.3.2
on: { workflow_dispatch: {}, push: { branches: [ release/v0.3.2-mc ] } }
jobs:
  build-evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SLO baseline
        run: mc slo snapshot --out out/slo-v0.3.2-baseline.json
      - name: Run MCP/A2A tests
        run: npm run test:interop --silent && cp out/mcp-a2a-tests.json evidence/v0.3.2/
      - name: Hash artifacts
        run: |
          mkdir -p evidence/v0.3.2
          for f in $(jq -r '.artifacts[].path' evidence/v0.3.2/manifest.json); do sha256sum "$f" >> evidence/v0.3.2/checksums.txt; done
      - name: Sign manifest
        env: { SIGNING_KEY: ${{ secrets.MC_SIGNING_KEY }} }
        run: node ops/sign-evidence.js evidence/v0.3.2/manifest.json $SIGNING_KEY
      - name: Upload evidence
        uses: actions/upload-artifact@v4
        with: { name: evidence-v0.3.2, path: evidence/v0.3.2/ }
```

**Acceptance**: Evidence job produces signed manifest + checksums; artifacts present; SLO baseline attached.

---

## Runbooks (operator quick cards)

### TENANT_002 Tier‑3 — Execute now
```bash
export MC_APPROVAL_TOKEN=$(op read op://secrets/mc/approvalToken)
bash ops/autonomy/scripts/enable-tier3.sh TENANT_002
```

### Readiness — TENANT_006 / TENANT_007
```bash
bash ops/readiness/run-assessment.sh TENANT_006
bash ops/readiness/run-assessment.sh TENANT_007
```

### Interop Gateway — Local test
```bash
# Start MCP server
node services/interop/mcp/server.js &
# Perform an A2A task (governed)
curl -sS -X POST :8080/a2a/perform -H 'Content-Type: application/json' \
  -d '{"tenantId":"TENANT_001","purpose":"investigation","residency":"US","pqid":"pq.getPersonById","agent":"code-refactor","task":{"repo":"svc-api","goal":"add pagination"}}' | jq .
```

---

## RACI (this push)
| Workstream | R | A | C | I |
|---|---|---|---|---|
| Tier‑3 on TENANT_002 | MC | CTO | SRE, Platform Sec | PM |
| Readiness T6/T7 | SRE | MC | Data Eng, Platform Sec | PM |
| MCP/A2A Interop | DevEx | MC | API, Sec Eng | PM |
| Evidence v0.3.2 | DevEx | MC | SRE, Sec | PM |

---

## Definition of Done (v0.3.2‑mc)
- Tier‑3 (computed) live on TENANT_002 with ≥99.9% success, ≤0.5% compensation; evidence attached.  
- TENANT_006/007 readiness **READY** with checklists and DR schedule.  
- MCP/A2A gateways merged; e2e tests and audit events visible; OPA enforced.  
- `evidence/v0.3.2/*` produced from CI with signed manifest and checksums.

