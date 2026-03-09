# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Mar 23–Apr 3, 2026 (Sprint 11; Q1 close → Q2 setup)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, Buyer Enablement)  
**Theme:** **Externalize trust** — Attestation Webhooks, OPA‑signed bundles, SLSA L3 Phase‑2, Procurement Packs, and a Q2 readiness cut.

---

## 1) Sprint Goal

“Make our provenance **provably consumable** outside our walls: signed policy bundles, customer attestation webhooks, buyer/procurement packs, and SLSA L3 Phase‑2 (hermetic builds + subject pinning) — all wired into CI and the Trust Portal.”

---

## 2) Objectives & Key Results (OKRs)

1. **OPA bundles signed & version‑pinned** org‑wide.  
   _Measure:_ Disclosure/Compliance Packs include `policy_bundle.sig`; portal verifies.
2. **Customer Attestation Webhooks** live (prod preview).  
   _Measure:_ `POST /webhooks/attestation` delivers signed events; 3 sample consumers validate.
3. **SLSA L3 Phase‑2** implemented in one critical repo.  
   _Measure:_ Hermetic build job green; provenance subjects pinned; isolation claim present.
4. **Procurement Pack v1** generated per tag.  
   _Measure:_ `procurement-pack.zip` contains security questionnaire, policies, attestations.
5. **Q2 Readiness**: Q1 close metrics + Q2 OKR seeds in board appendix.  
   _Measure:_ `board-appendix-Q1-close.md` generated; links verified.

---

## 3) Deliverables (Definition of Done)

- **Signed OPA bundle pipeline** (keyless) with `cosign` for `policy.tar.gz` + verification step & badge.
- **Attestation Webhooks** service (HMAC + optional mTLS) + retry/backoff + idempotency keys + OpenAPI.
- **SLSA L3 Phase‑2**: lockfile vendor snapshot, network‑denied build, subject pinning; threat model addendum.
- **Procurement Pack Generator** with auto‑filled SIG templates (CAIQ‑lite) + sub‑processor list + incident/SLA policy.
- **Portal v2.3**: policy verify badge, webhook delivery status, procurement download tile.
- **Runbooks**: webhook consumer guide, bundle signing rotation, hermetic build checklist.

---

## 4) Work Plan & Owners

| Date   | Work Item                            | Owner        | Exit Criteria                                         |
| ------ | ------------------------------------ | ------------ | ----------------------------------------------------- |
| Mar 23 | OPA bundle signing flow              | SecOps       | `policy.tar.gz` + `policy.sig` produced & verified    |
| Mar 24 | Webhooks: schema + HMAC + retries    | DevEx        | Events delivered; redelivery UI works                 |
| Mar 25 | SLSA L3 P2: hermetic build job       | SecOps+DevEx | Network‑denied build green; subjects pinned           |
| Mar 26 | Procurement Pack generator           | Co‑CEO       | `procurement-pack.zip` generated in CI                |
| Mar 27 | Portal v2.3 (badges + tiles)         | PM           | Policy badge + webhook status + procurement tile live |
| Mar 31 | Consumer samples (3x) + docs         | DevEx        | Node/GHA/GitLab examples verify signature             |
| Apr 1  | Bundle rotation drill + audit log    | SecOps       | Rotation run recorded in Maestro                      |
| Apr 2  | Board appendix (Q1 close + Q2 seeds) | Co‑CEO       | Appendix generated & linked                           |
| Apr 3  | Demo + retro                         | Co‑CEO       | OKRs measured; risks updated                          |

---

## 5) Artifacts & Scaffolding

### 5.1 OPA Bundle Signing (CI)

**Path:** `.github/workflows/policy.sign.yml`

```yaml
name: policy.sign
on: { workflow_dispatch: {}, push: { paths: ['policies/**'] } }
permissions: { id-token: write, contents: write }
jobs:
  build_sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build bundle
        run: |
          tar -czf policy.tar.gz policies/*.rego policies/*.json
      - name: Sign (keyless)
        run: |
          COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes --output-signature policy.sig policy.tar.gz
      - uses: actions/upload-artifact@v4
        with: { name: policy-bundle, path: |
          policy.tar.gz
          policy.sig }
```

**Verify in release pipeline**

```yaml
verify_policy:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v4
      with: { name: policy-bundle, path: . }
    - name: Verify signature
      run: |
        COSIGN_EXPERIMENTAL=1 cosign verify-blob --certificate-oidc-issuer https://token.actions.githubusercontent.com \
          --signature policy.sig policy.tar.gz
```

---

### 5.2 Attestation Webhooks Service

**Path:** `services/webhooks/server.mjs`

```js
import express from 'express';
import crypto from 'crypto';
const app = express();
app.use(express.json({ limit: '1mb' }));
function sign(body, secret) {
  return (
    'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  );
}
app.post('/webhooks/attestation', (req, res) => {
  const sig = req.get('X-Topicality-Signature') || '';
  const raw = JSON.stringify(req.body);
  const valid = sig === sign(raw, process.env.WEBHOOK_SECRET);
  if (!valid) return res.status(401).json({ ok: false });
  // idempotency check via event.id
  res.json({ ok: true });
});
app.listen(8082);
```

**Event schema** `services/webhooks/schemas/attestation.json`

```json
{
  "type": "object",
  "required": ["id", "tag", "artifacts", "policy"],
  "properties": {
    "id": { "type": "string" },
    "tag": { "type": "string" },
    "artifacts": { "type": "array", "items": { "type": "string" } },
    "policy": { "type": "object", "required": ["version", "sha256"] }
  }
}
```

**Emitter step (CI)**

```yaml
  webhook_emit:
    needs: [release]
    runs-on: ubuntu-latest
    steps:
      - name: Emit attestation event
        env: { URL: ${{ secrets.WEBHOOK_URL }}, S: ${{ secrets.WEBHOOK_SECRET }} }
        run: |
          body=$(jq -n --arg t "$GITHUB_REF_NAME" '{id:env.GITHUB_RUN_ID, tag:$t, artifacts:["sbom.json","provenance.intoto.jsonl","compliance-pack.zip"], policy:{version:"v1.5",sha256:"$POLICY_SHA"}}')
          sig=$(node -e "c=require('crypto');b=process.argv[1];s=process.env.S;console.log('sha256='+c.createHmac('sha256',s).update(b).digest('hex'))" "$body")
          curl -fsS -H "X-Topicality-Signature: $sig" -H 'Content-Type: application/json' -d "$body" "$URL"
```

---

### 5.3 SLSA L3 Phase‑2 (Hermetic Build + Subject Pinning)

**Path:** `.github/workflows/release.hermetic.yml`

```yaml
name: release.hermetic
on: { workflow_dispatch: {} }
permissions: { id-token: write, contents: write }
jobs:
  hermetic:
    runs-on: [self-hosted, isolated]
    container: { image: ghcr.io/yourorg/builder:20 } # pre‑baked deps
    steps:
      - uses: actions/checkout@v4
      - name: Block network egress
        run: iptables -P OUTPUT DROP || true
      - name: Use vendored lockfiles only
        run: |
          corepack enable
          pnpm install --frozen-lockfile --offline
      - run: pnpm build
      - name: Generate provenance with subjects
        uses: slsa-framework/slsa-github-generator@v2
        with: { base64-subjects: ${{ secrets.SUBJECTS_B64 }} }
```

**Addendum:** `security/slsa-l3-addendum.md` — describe vendor snapshot process, isolation, and subject pinning.

---

### 5.4 Procurement Pack Generator

**Path:** `.github/actions/procurement-pack/action.yml`

```yaml
name: 'Procurement Pack'
description: 'Bundle security questionnaire, policies, attestations, DPIA/DPA'
runs:
  using: 'composite'
  steps:
    - shell: bash
      run: |
        mkdir -p procurement
        cp privacy/DPA.md privacy/DPIA.md procurement/ 2>/dev/null || true
        cp controls.json procurement/ 2>/dev/null || true
        cp vendor_attestations.json procurement/ 2>/dev/null || true
        cp policies/*.md procurement/ 2>/dev/null || true
        echo "org: Topicality" > procurement/QUESTIONNAIRE.txt
        (cd procurement && zip -qr ../procurement-pack.zip .)
    - uses: actions/upload-artifact@v4
      with: { name: procurement-pack, path: procurement-pack.zip }
```

---

### 5.5 Portal v2.3 (badges + tiles)

**Path:** `tools/trust-portal/components/PolicyBadge.tsx`

```tsx
export function PolicyBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded-2xl ${verified ? 'bg-green-100' : 'bg-red-100'}`}
    >
      {verified ? 'Policy Signed' : 'Unsigned Policy'}
    </span>
  );
}
```

**Webhook status tile** `components/WebhookTile.tsx` (lists last deliveries, status codes, retry count).

**Procurement tile** `components/ProcureTile.tsx` (download `procurement-pack.zip`, show hash).

---

## 6) Dashboards & Alerts

- **Policy signature coverage:** 100% bundles signed & verified.
- **Webhook delivery success:** ≥ 99% in 24h; retries tracked.
- **SLSA L3 P2 job:** success state; network‑denied check; provenance subjects present.
- **Procurement pack presence:** 100% latest tags.
- **Portal health:** error budget burn < 10% weekly.

---

## 7) Risks & Mitigations

| Risk                      | Likelihood | Impact | Mitigation                                                    |
| ------------------------- | ---------: | -----: | ------------------------------------------------------------- |
| Keyless verify flakiness  |        Med |    Med | Pin cosign; preflight checks; fallback signer                 |
| Webhook consumer variance |        Med |    Med | Provide 3 starter adapters; exponential backoff + idempotency |
| Hermetic build complexity |        Med |   High | Start with 1 repo; document gaps; staged rollout              |
| Procurement pack drift    |        Low |    Med | Generator in CI + hash in Disclosure Pack                     |

---

## 8) Alignment Notes

- Builds on Sprint 10 (policy v1.5, sign‑off, DPA/DPIA, board brief).
- Sets up Q2 Sprints: external audits, partner rollout, API monetization bound to attestation consumption.

---

## 9) Exit Checklist

- `policy.sig` verified in release; badge green in portal.
- Webhooks delivering signed events; consumers confirmed (3x).
- Hermetic release job green with provenance subjects pinned.
- `procurement-pack.zip` attached to latest tag; tile visible.
- Board appendix generated; demo recorded; metrics & risks updated.
