## Sprint 5: PsyOps Console (Cross‑Tenant Sharing & Red‑Team Harness) | IntelGraph Advisory Report | GitHub Branch: feature/psyops-sharing-redteam

> As Chair, I present the findings of the IntelGraph Advisory Committee on Sprint 5: secure cross‑tenant sharing (read‑only) and a red‑team harness to harden deception analytics and governance. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary

**Unanimous View:** Enable **read‑only, policy‑aware sharing** of evidence bundles and saved views across tenants via cryptographically signed **ShareCapsules** (time‑boxed, watermarked, revocable). In parallel, ship a **red‑team harness** to continuously probe scoring/XAI and policy rails.  
**Dissents:** **🟥 Starkey** warns link‑style shares are phishing magnets; require strict domain allow‑lists and mTLS where possible. **🟥 Foster** insists on data minimization, PII scrubs, and an always‑on ethics gate; no audience activation or persuasion modules—analysis only.

---

### Individual Commentaries

### 🪄 Elara Voss

- “By the runes of Scrum: lock scope to **ShareCapsule v0.1 + Red‑Team Harness v0.1 + Watermark UI**. No ‘nice‑to‑haves’ beyond revocation + audit.”
- Deliver one golden path: select nodes → create capsule → send link → recipient views with watermark + provenance and **cannot export raw** unless policy OK.

### 🛰 Starkey

- Reality check: cross‑org sharing expands attack surface. Require **issuer‑pinned** keys, **tenant allow‑lists**, and **mTLS** for enterprise mode; links default to **single‑use**.
- Add anomaly traps: throttle views, geo‑jitter alerts, and invalidate on suspicious reuse.

### 🛡 Foster

- Operational vectors indicate **data minimization first**: strip PII, enforce license constraints, and bind scope to **read** only.
- [RESTRICTED] Any capsule with persuasive text or audience fields must be denied with HTTP 451 + rationale.

### ⚔ Oppie (11‑persona consensus)

- We decree unanimously: watermark everything—**tenant name, email, timestamp, capsuleId**—over graph/timeline/map.
- Dissent: _Beria_ demands bidirectional sync; the Committee rejects—**one‑way, read‑only** only.

### 📊 Magruder

- For executive traction: add **share analytics** (unique viewers, time‑to‑insight proxy) without tracking content recipients across domains.
- Expose **capsule health** (policy pass/fail, expiry, revocation status) in a dashboard.

### 🧬 Stribol

- Cross‑source analysis reveals lift from **clean‑room previews** (aggregates only) before full evidence.
- The red‑team harness should simulate **cadence spoofing**, **coordination patterns**, and **XAI stress** (counterfactual flips) to prevent metric gaming.

---

### Chair Synthesis

#### Sprint Objectives (2 weeks)

1. **ShareCapsule v0.1**: Cryptographically signed, read‑only evidence bundles + saved‑view state; revocable; watermarked.
2. **Red‑Team Harness v0.1**: Scenario YAML + runner to probe scoring/XAI and policy rails; CI‑gated.
3. **Governance & Observability**: audit trails, ethics denials (HTTP 451), share analytics, and revocation UX.

#### Scope & Backlog (Must‑Have)

- **Capsule Creation**: select items → minimize → policy check → sign → produce short code `sc_{base58}`.
- **Delivery Modes**: (a) Link with single‑use token; (b) Enterprise mTLS share to allow‑listed domains.
- **Viewer**: read‑only tri‑pane render with watermark overlay; provenance tooltips; export limited to policy‑clean bundles.
- **Revocation**: server‑side kill switch; cached capsules re‑validate every open.
- **Red‑Team Harness**: YAML scenarios (adversarial cadence, burst floods, coordination motifs, PII traps, policy‑violation attempts).
- **Analytics & Audit**: unique viewers (privacy‑preserving), last access, policy outcomes, revocations, denials.

**Stretch**

- **Clean‑Room Mode**: share only aggregates (k‑anonymized stats) with on‑demand escalation to full capsule after recipient attests to policy.

#### Acceptance Criteria

- A1: Capsules require successful **policy pre‑flight** (license, PII, ethics) and cryptographic signature; otherwise denial with human‑readable rationale.
- A2: Viewer enforces **read‑only** and shows visible watermark (tenant/email/time/capsuleId) across all panes.
- A3: Revocation takes effect on next open and invalidates cached tokens.
- A4: Red‑team harness runs in CI and fails build on any: (i) unbounded confidence under adversarial inputs, (ii) missing uncertainty bands, (iii) export of restricted data.
- A5: Share analytics show **non‑identifying** counts; no tracking beacons beyond domain‑level metrics.

#### Risk Matrix

| Risk                                 | Severity | Likelihood |                                                                  Mitigation |
| ------------------------------------ | -------: | ---------: | --------------------------------------------------------------------------: |
| Phishing via shared links            |     High |     Medium |     Single‑use tokens, domain allow‑lists, mTLS enterprise mode, throttling |
| Data leakage / policy bypass         | Critical |        Low |      Policy pre‑flight + minimization + watermark + revocation; audit trail |
| Metric gaming via adversarial inputs |     High |     Medium |     Red‑team harness CI, uncertainty caps, XAI counterfactual sanity checks |
| Privacy over‑collection in analytics |   Medium |        Low |                          Aggregate only; no per‑user tracking; rotate salts |
| Token replay / cache abuse           |   Medium |     Medium | Short TTL, audience binding, IP/ASN anomaly detection, constant‑time checks |

---

### Code & Specs (Guy IG)

#### 1) ShareCapsule Claim (JWT‑like, detached JWS)

```json
{
  "iss": "intelgraph://tenant/alpha",
  "sub": "sc_7Yf3...",
  "aud": ["https://viewer.partner.example"],
  "scope": ["read"],
  "datasets": ["ds_narratives_2025Q3:MIN"],
  "provenance": { "hash": "sha256:91cd...", "license": "CC-BY" },
  "pii": { "scrubbed": true },
  "exp": 1752364800,
  "nbf": 1752278400,
  "watermark": { "tenant": "Alpha", "email": "alice@alpha.tld" }
}
```

#### 2) Capsule Sign & Verify (TypeScript)

```ts
import crypto from 'crypto';

export function signCapsule(claim: object, priv: crypto.KeyObject) {
  const payload = Buffer.from(JSON.stringify(claim));
  const sig = crypto.sign(null, payload, priv).toString('base64');
  return { payload: payload.toString('base64'), sig };
}

export function verifyCapsule(
  { payload, sig }: { payload: string; sig: string },
  pub: crypto.KeyObject,
) {
  const ok = crypto.verify(
    null,
    Buffer.from(payload, 'base64'),
    pub,
    Buffer.from(sig, 'base64'),
  );
  if (!ok) throw new Error('invalid_signature');
  const claim = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  if (!claim.scope?.includes('read')) throw new Error('invalid_scope');
  if (Date.now() / 1000 > claim.exp) throw new Error('expired');
  return claim;
}
```

#### 3) Tenant Isolation Policy (OPA/Rego)

```rego
package intelgraph.tenant

# deny if tenant mismatch
violation[msg] {
  input.request.tenant != input.resource.tenant
  msg := sprintf("tenant_mismatch: %v != %v", [input.request.tenant, input.resource.tenant])
}

# deny if scope is not read
violation[msg] {
  not input.request.scope[_] == "read"
  msg := "write_scope_blocked"
}

# deny if ethics gate flags payload
violation[msg] {
  input.resource.ethics == "deny"
  msg := "denied_by_policy_ethics"
}
```

#### 4) Watermark Overlay (React + CSS)

```tsx
// apps/web/src/features/share/Watermark.tsx
export default function Watermark({
  who,
  capsule,
}: {
  who: string;
  capsule: string;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-0 opacity-20 select-none"
      aria-hidden
    >
      <div
        className="w-[200%] h-[200%] rotate-[-30deg] origin-top-left grid place-items-center"
        style={{ gap: 64 }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="text-2xl font-semibold">
            {who} · {capsule} · {new Date().toISOString()}
          </span>
        ))}
      </div>
    </div>
  );
}
```

#### 5) Red‑Team Harness (YAML + Node Runner)

```yaml
# redteam/scenarios/cadence_spoof.yaml
name: cadence_spoof
checks:
  - type: score_under_attack
    timestamps: poisson_lambda_2_with_spikes
    expect:
      max_confidence: 0.85
      min_uncertainty: 0.15
  - type: xai_counterfactual_flip
    graph_edit: remove_edge:u1->u9
    expect:
      delta_range: [-0.5, -0.1]
  - type: policy_denial
    payload: { audience: 'segment:foo' }
    expect:
      http_status: 451
```

```ts
// tools/redteam/run.ts
import fs from 'fs';
import assert from 'assert';

async function runScenario(path: string) {
  const yml = fs.readFileSync(path, 'utf8');
  const s = parseYaml(yml); // assume available
  for (const c of s.checks) {
    if (c.type === 'score_under_attack') {
      const r = await scoreSynthetic(c.timestamps);
      assert(r.deceptionScore <= c.expect.max_confidence);
      assert(r.uncertainty >= c.expect.min_uncertainty);
    }
    if (c.type === 'xai_counterfactual_flip') {
      const d = await counterfactualDelta(c.graph_edit);
      assert(d >= c.expect.delta_range[0] && d <= c.expect.delta_range[1]);
    }
    if (c.type === 'policy_denial') {
      const res = await postCapsule(c.payload);
      assert.equal(res.status, 451);
    }
  }
}

(async () => {
  for (const f of fs.readdirSync('redteam/scenarios'))
    await runScenario(`redteam/scenarios/${f}`);
})();
```

#### 6) Audit Log (JSONL)

```json
{"ts":"2025-09-11T18:00:00Z","tenant":"alpha","actor":"alice@alpha.tld","action":"capsule.create","capsule":"sc_7Yf3","result":"allow"}
{"ts":"2025-09-11T18:01:10Z","tenant":"alpha","actor":"system","action":"capsule.view","capsule":"sc_7Yf3","viewer":"partner.example","result":"allow"}
{"ts":"2025-09-11T18:03:22Z","tenant":"alpha","actor":"policy","action":"capsule.export","capsule":"sc_7Yf3","result":"deny","reason":"license_violation"}
```

---

### Tickets (ready for grooming)

- **SHARE‑400**: Capsule creation service (minimization → policy pre‑flight → sign); revocation endpoint.
- **SHARE‑401**: Viewer (read‑only tri‑pane) with watermark overlay; cache‑busting on revocation.
- **SEC‑410**: Single‑use tokens, domain allow‑list, optional mTLS; anomaly traps + throttling.
- **GOV‑420**: Ethics gate integration; HTTP 451 denials with reason codes; audit JSONL sink.
- **RT‑430**: Red‑team harness runner + baseline scenarios (cadence spoof, coordination motifs, PII traps).
- **OBS‑440**: Share analytics (aggregate) + capsule health dashboard.

### OKRs (Sprint 5)

- KR1: 100% capsules cryptographically signed and policy‑clean; zero unauthorized exports.
- KR2: Red‑team harness blocks at least **3** classes of adversarial failures in CI.
- KR3: Revocation works within **≤5s** and invalidates cached tokens.

---

**The Committee stands ready to advise further. End transmission.**
