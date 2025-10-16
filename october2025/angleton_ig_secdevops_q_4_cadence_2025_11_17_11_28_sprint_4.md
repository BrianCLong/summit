# Angleton IG — SecDevOps Workstream (Sprint 4)

**Cadence:** Nov 17–28, 2025 (Sprint 4 of Q4)  
**Alignment:** Builds on Sprint 1 (verifiable builds), Sprint 2 (verified deploys/runtime), Sprint 3 (evidence, rotation, DR).  
**Role:** Security • DevSecOps • Counterintelligence  
**Prime Directive:** Protect people, data, funds, infrastructure, brand.

---

## 1) Objectives & Definition of Done (DoD)

**Objective:** Move from “provable ops” to **“continuous compliance & attack‑path reduction”**. Automate risk scoring from SBOM/OSV, enforce egress and data‑handling policy at code and cluster levels, shrink IAM blast radius, and ship graph‑based attack‑path views with actionable gates. Include a tabletop + chaos‑security exercise to validate resilience.

**DoD:**

- CI/CD blocks releases with **Critical** vulns (OSV/CVE) lacking allowlisted justifications; license policy enforced.
- Cluster egress defaults to **deny**; only approved DNS/SNI allowed via egress policy or proxy; audit logs present.
- IAM roles down‑scoped to least privilege; all GitHub Actions cloud access via OIDC with session binding; no static cloud keys.
- Evidence Pack includes SBOM diff + risk score, policy versions, egress audit snapshot, and attack‑path graph image.
- Chaos‑security game day executed; issues filed with owners; recovery within SLOs.

---

## 2) Backlog (ranked)

### P0 — Must land

1. **SBOM → OSV Risk Gate**: OSV scan + score; fail on Critical; allowlist file with expiry and issue link.
2. **Egress Control Baseline**: Kubernetes `NetworkPolicy` egress deny by default + DNS/SNI allow rules; Cloudflare Tunnel proxy option for external APIs.
3. **IAM Down‑scoping & Insights**: IAM Access Analyzer diff; shorten session TTLs; boundary roles for GH OIDC; no static keys in org.
4. **Attack‑Path Graph**: Neo4j model (assets, trust edges, controls) rendered per release; include top 3 risky paths & fixes.

### P1 — Strongly desired

5. **Data‑Handling Policies**: OPA checks for data classification labels on endpoints/routes; DLP redaction middleware for logs.
6. **Chaos‑Security Game Day**: Inject faults (token revocation, egress cut, OPA deny spike), observe alerts, MTTR, rollback.

### P2 — Stretch

7. **SLSA Build L3 Prep**: Harden reusable builders; hermetic installs; provenance completeness check.
8. **Policy Federation**: Bundle version pinning across repos via `policy-bundle` Git submodule + Renovate rules.

---

## 3) Patch Set (ready‑to‑apply)

> Minimal, reversible diffs. Adjust org/paths as needed.

### 3.1 OSV risk gate

**NEW:** `.github/workflows/osv.risk.yml`

```yaml
name: osv.risk
on: [pull_request, workflow_dispatch]
permissions: { contents: read }
jobs:
  osv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && pnpm i --frozen-lockfile
      - name: Generate SBOM (CycloneDX)
        run: npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
      - name: Query OSV
        run: |
          node -e '
            const fs=require("fs");
            const sbom=JSON.parse(fs.readFileSync("sbom.json"));
            const comps=(sbom.components||[]).map(c=>({package:{name:c.name,ecosystem:"npm"},version:c.version}));
            const chunks=[]; while(comps.length) chunks.push(comps.splice(0,1000));
            const fetch=globalThis.fetch||((...a)=>import("node-fetch").then(({default:f})=>f(...a)));
            (async()=>{
              let vulns=[];
              for(const chunk of chunks){
                const r=await fetch("https://api.osv.dev/v1/querybatch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({queries:chunk})});
                const j=await r.json();
                j.results?.forEach(x=>{(x.vulns||[]).forEach(v=>vulns.push(v))});
              }
              fs.writeFileSync("osv.json", JSON.stringify(vulns,null,2));
              const severities=(vulns.map(v=>v.database_specific?.cvss?.score||v.severity?.[0]?.score||0));
              const critical=vulns.filter(v=>String(v.severity?.[0]?.type||"").toUpperCase().includes("CRITICAL")|| (v.database_specific?.cvss?.score||0)>=9.0);
              console.log(`found ${vulns.length} vulns, critical=${critical.length}`);
              if(critical.length>0){process.exitCode=1}
            })();
          '
      - uses: actions/upload-artifact@v4
        with: { name: osv-results, path: "osv.json\nsbom.json" }
```

**NEW:** `security/allowlist.osv.json`

```json
{
  "expires": "2026-01-31",
  "items": [
    {
      "id": "OSV-YYYY-XXXX",
      "reason": "transitive devDep; unused in prod",
      "ticket": "SEC-1234"
    }
  ]
}
```

**Edit (gate)**: `.github/workflows/release.gate.yml` add OSV check presence in `input.json` and fail if critical w/o allowlist.

### 3.2 Egress deny‑by‑default

**NEW:** `deploy/network/egress-default-deny.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-egress, namespace: switchboard }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress: []
```

**NEW:** `deploy/network/egress-allowlist.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-egress-apis, namespace: switchboard }
spec:
  podSelector: { matchLabels: { app: switchboard } }
  policyTypes: [Egress]
  egress:
    - to: [{ namespaceSelector: { matchLabels: { name: observability } } }]
      ports: [{ port: 9090 }]
    - to:
        - ipBlock: { cidr: 0.0.0.0/0 } # fallback with egress proxy SNI filter
      ports: [{ port: 443 }]
```

**NEW (optional proxy):** `deploy/network/egress-proxy.md`

```md
Use Cloudflare Tunnel or egress proxy with SNI allowlist for external APIs. Log SNI + DNS queries; alert on new domains.
```

### 3.3 IAM down‑scoping

**NEW:** `infra/iam/gh-oidc-boundary.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sts:AssumeRoleWithWebIdentity"],
      "Resource": "arn:aws:iam::*:role/GitHubActions-*",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": [
            "repo:companyos/switchboard:ref:refs/heads/main"
          ]
        }
      }
    }
  ]
}
```

**NEW:** `.github/workflows/iam.audit.yml`

```yaml
name: iam.audit
on: [workflow_dispatch, schedule]
schedule: [{ cron: '0 3 * * 2' }]
permissions: { contents: read }
jobs:
  access-analyzer:
    runs-on: ubuntu-latest
    steps:
      - run: |
          aws accessanalyzer list-findings --analyzer-name organization-analyzer --query 'findings[?status==`ACTIVE`]' --output json > findings.json
      - uses: actions/upload-artifact@v4
        with: { name: iam-findings, path: findings.json }
```

### 3.4 Attack‑path graph (Neo4j)

**NEW:** `ops/graph/model.cypher`

```cypher
// Nodes
MERGE (:Asset {name:'Switchboard', type:'app'})
MERGE (:Asset {name:'EKS', type:'cluster'})
MERGE (:Asset {name:'RDS', type:'db'})
MERGE (:Control {name:'OPA Gate', type:'policy'})
MERGE (:Control {name:'Cosign Verify', type:'supplychain'})
MERGE (:Identity {name:'GitHub Actions', type:'oidc'})
// Edges
MATCH (a:Asset{name:'Switchboard'}),(b:Asset{name:'EKS'}) MERGE (a)-[:DEPLOYS_TO]->(b)
MATCH (b:Asset{name:'EKS'}),(c:Asset{name:'RDS'}) MERGE (b)-[:CONNECTS_TO]->(c)
MATCH (i:Identity{name:'GitHub Actions'}),(a:Asset{name:'Switchboard'}) MERGE (i)-[:BUILDS]->(a)
MATCH (g:Control{name:'OPA Gate'}),(a:Asset{name:'Switchboard'}) MERGE (g)-[:PROTECTS]->(a)
MATCH (c:Control{name:'Cosign Verify'}),(a:Asset{name:'Switchboard'}) MERGE (c)-[:PROTECTS]->(a)
```

**NEW:** `.github/workflows/attack.graph.yml`

```yaml
name: attack.graph
on: [workflow_dispatch, push]
permissions: { contents: read }
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Render Graph (ascii)
        run: |
          echo "+ GitHub Actions -> Switchboard -> EKS -> RDS" | tee graph.txt
      - uses: actions/upload-artifact@v4
        with: { name: attack-graph, path: graph.txt }
```

### 3.5 Data‑handling policies (OPA + middleware)

**NEW:** `policies/datahandling.rego`

```rego
package datahandling

# require classification for endpoints returning PII
violation[msg] {
  input.route.matches
  input.route.returns_pii
  not input.route.classification
  msg := sprintf("route %v missing classification", [input.route.path])
}
```

**NEW:** `apps/web/src/middleware/redact.ts`

```ts
export function redactLog(line: string) {
  return line
    .replace(/(api[_-]?key\s*[:=]\s*)['\"]?[A-Za-z0-9_\-]{16,}/gi, '$1***')
    .replace(
      /(email: )([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
      '$1<redacted>',
    );
}
```

### 3.6 Chaos‑security game day

**NEW:** `ops/chaos/security-gameday.md`

```md
Scenarios:

1. Revoke GH OIDC role mid-deploy → verify deploy.verify fails, rollback path works.
2. Block egress to OSV API → observe `osv.risk` fails; alert triage.
3. Inject deny spike in OPA → Alert fires; MTTR < 15m.
   Artifacts: timeline, alerts, decisions, rollback timings.
```

---

## 4) Observability & Evidence

- **Evidence Pack additions**: `osv.json`, `sbom.json` diff, `attack-graph` artifact, IAM findings, egress policy manifests.
- **Dashboards**: Risk score trend, blocked release count, deny‑rate, egress anomalies, IAM findings backlog.
- **Alerts**: Critical OSV found on PR; egress to new domain; IAM finding ACTIVE; deny spike.

---

## 5) Tests & Verification

- **OSV gate**: Introduce synthetic Critical → release.gate blocks; allowlist with expiry allows temporarily.
- **Egress**: Pod without allowlist cannot reach internet; with allowlist/proxy it can reach approved APIs.
- **IAM**: Access Analyzer findings trend to 0; no static keys found in secret scan.
- **Attack‑path**: Graph artifact generated; top 3 paths reviewed with owners.
- **Data‑handling**: OPA `violation` empty for all routes; redaction middleware unit tests pass.
- **Chaos day**: All scenarios executed; MTTR and rollback meet SLOs.

**Success Criteria**

- Two blocked PRs due to Critical vulns with tickets opened; one allowed via time‑boxed allowlist.
- Egress default‑deny live in `switchboard` namespace with documented exceptions.
- IAM analyzer shows only informational findings.
- Evidence Pack contains risk score diff and graph.
- Chaos day report attached with learnings + actions.

---

## 6) Ownership & Approvals

- **Owners:** SecDevOps (Angleton IG), Platform/Infra (NetworkPolicy/IAM), App Eng (redaction), SRE (alerts/dashboards).
- **Approvals:** Platform lead (egress/IAM), Security lead (OSV gate), App Eng lead (middleware), SRE lead (chaos day).

---

## 7) Timeline

- **Days 1–2:** OSV risk gate + allowlist; Evidence Pack integration.
- **Days 3–4:** Egress default‑deny + allowlist/proxy; alerts.
- **Days 5–6:** IAM audit + boundary roles + TTL tighten.
- **Day 7:** Attack‑path graph wiring + review.
- **Day 8:** Data‑handling policy + redaction middleware.
- **Day 9:** Chaos‑security game day + report.
- **Day 10:** Buffer + docs + approvals.

---

## 8) PR Template Additions

```
- [ ] OSV results attached; Critical=0 or allowlist with expiry & ticket
- [ ] Egress NetworkPolicies applied; exceptions documented
- [ ] IAM analyzer report uploaded; static keys=0
- [ ] Attack‑path graph artifact attached
- [ ] Data classification present; log redaction tests pass
- [ ] Chaos day report linked
```

---

## 9) Artifacts Index

- OSV gate: `.github/workflows/osv.risk.yml`, `security/allowlist.osv.json`
- Egress: `deploy/network/egress-*.yaml`, `deploy/network/egress-proxy.md`
- IAM: `infra/iam/gh-oidc-boundary.json`, `.github/workflows/iam.audit.yml`
- Graph: `ops/graph/model.cypher`, `.github/workflows/attack.graph.yml`
- Data handling: `policies/datahandling.rego`, `apps/web/src/middleware/redact.ts`
- Chaos: `ops/chaos/security-gameday.md`

---

## 10) Structured Output (for exec/PM traceability)

summary: Enforce continuous compliance with OSV risk gating, default‑deny egress, least‑privilege IAM, and data‑handling policies; add attack‑path graphs and a chaos‑security game day; integrate results into Evidence Packs and dashboards.  
risk_score: 44  
confidence: high  
key_findings:

- id: vuln-gate-missing
  evidence: [ lack of OSV gate and risk scoring ]
  impact: Critical vulns can ship unnoticed.
- id: unrestricted-egress
  evidence: [ no default‑deny egress policy ]
  impact: Exfil/command‑and‑control risk; opaque third‑party calls.
- id: iam-overbreadth
  evidence: [ long TTLs, wide roles ]
  impact: Elevated blast radius if tokens leaked.
- id: data-handling-implicit
  evidence: [ routes not labeled; redaction ad‑hoc ]
  impact: PII leakage in logs; policy blind spots.
  recommended_actions:
- title: Add OSV risk gate and allowlist with expiry
  change_type: PR
  effort: S
  prereqs: None
- title: Apply egress default‑deny with allowlists/proxy
  change_type: Infra
  effort: M
  prereqs: Cluster NetworkPolicy support
- title: Down‑scope IAM and enforce OIDC session binding
  change_type: Infra
  effort: M
  prereqs: AWS org access
- title: Implement data‑handling policy and redaction
  change_type: PR
  effort: S
  prereqs: Route inventory
  verification:
- checks: [ osv-critical-block, egress-enforced, iam-findings-zero, data-policy-clean, chaos-day-complete ]
- success_criteria: Gates block as designed; evidence/dashboards updated; MTTR within SLO.
  owners_notified: [ SecDevOps, Platform, App Eng, SRE ]
  links:
  pr:
  runbook: See `ops/chaos/security-gameday.md` and prior sprints’ runbooks
  dashboards: Risk, Egress, IAM, Policy
