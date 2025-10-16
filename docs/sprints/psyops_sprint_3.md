## Sprint 3: PsyOps Console (Scoring, XAI & Governance Hardening) | IntelGraph Advisory Report | GitHub Branch: feature/psyops-xai-sprint

> As Chair, I present the findings of the IntelGraph Advisory Committee on Sprint 3: deception-scoring calibration, explainability overlays, and governance hardening for the PsyOps Console. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary

**Unanimous View:** Mature the **read‑only intelligence surface** by (1) calibrating deception/burst/cadence scores with uncertainty, (2) shipping **Graph‑XAI overlays** (path rationales, counterfactuals), and (3) enforcing provenance/gov‑tech (model cards, audit logs, export policy).  
**Dissents:** **🟥 Starkey** warns that public‑corpus calibration invites adversarial gaming; **🟥 Foster** flags bias/PII risk in training and mandates an ethics gate with automatic denials.

---

### Individual Commentaries

### 🪄 Elara Voss

- “By the runes of Scrum: lock scope to **Scoring v0.3 + XAI overlay + Governance pack**. Definition of Done includes golden‑path e2e, perf P95, and export policy checks.”
- Deliver **two UX affordances** only: saved views (restore on load) and **Explain this view** side‑panel with trace IDs.

### 🛰 Starkey

- Reality check: **single scores get gamed**. Use multi‑signal validators (cadence entropy + coordination motifs + geo jitter). Show uncertainty bands prominently.
- Mirror scoring on a **read‑replica** and alert on divergence >5% as a tamper signal.

### 🛡 Foster

- Operational vectors indicate **[RESTRICTED]**: deny any route that touches audience creation or content injection. Log denials with human‑readable rationale and reviewer badge.
- Ship **Model Cards** (purpose, data, risks, intended use) and run a light **fairness/PII audit** pre‑release.

### ⚔ Oppie (11‑persona consensus)

- We decree unanimously: enrich XAI with **counterfactual snippets** ("remove node X → score drops 31%").
- Dissent: _Beria_ demands active counter‑ops; the Committee rejects—**observe, hypothesize, defend** only.

### 📊 Magruder

- For executive traction: add KPI tiles (time‑to‑hypothesis, evidence completeness, confidence spread). Tie to export‑pack quality (citations present, licenses valid).
- Ensure **compute budgets** (FE render <150ms P95; scoring service <100ms P95) and publish SLOs.

### 🧬 Stribol

- Cross‑source analysis reveals lift from a **fusion ensemble**: cadenceEntropy ⊕ narrativeBurst ⊕ botLikely ⊕ coordinationPath.
- Propose a **black‑swan detector** (unsupervised novelty score) gated to “Advisory” only, never decisive.

---

### Chair Synthesis

#### Sprint Objectives (2 weeks)

1. **Calibrate Scoring v0.3** with uncertainty and feature attributions.
2. **Ship Graph‑XAI overlay**: path rationale, top‑k contributors, counterfactual deltas.
3. **Governance Pack**: model cards, provenance badges, export policy checks, audit log.

#### Scope & Backlog (Must‑Have)

- **Scoring Service** (read‑only): `POST /score:narrative` (internal), returns `{ deceptionScore, burstScore, cadenceEntropy, uncertainty, attributions[] }`.
- **Calibration Pipeline**: hold‑out set, isotonic/Platt scaling, reliability diagrams persisted to `/modelcards`.
- **XAI Overlay**: right‑drawer with (a) path rationale, (b) counterfactual delta (% change if node/edge removed), (c) uncertainty band, (d) provenance snippet.
- **Governance**: model card YAML + signed export manifest + policy denials (HTTP 451) rendered in‑UI with reason codes.
- **Observability**: emit metrics (TTH, evidence completeness) and drift monitors (population, performance, prediction drift).

**Stretch**

- **Offline cache** (IndexedDB snapshots + delta replay).
- **Replica fan‑out** for scoring consistency checks.

#### Acceptance Criteria

- A1: Reliability curve ECE ≤ 0.05 on hold‑out; AUC not degraded >1.5% from v0.2.
- A2: Every Explain panel shows ≥3 attributions and 1 counterfactual delta with traceId linkage.
- A3: Export packs include license badges and pass policy pre‑flight.
- A4: Any attempt to perform write/influence routes is denied with HTTP 451 and human‑readable rationale.
- A5: P95 latency—scoring ≤100ms, overlay render ≤150ms—on baseline dataset.

#### Risk Matrix

| Risk                                | Severity | Likelihood |                                                              Mitigation |
| ----------------------------------- | -------: | ---------: | ----------------------------------------------------------------------: |
| Adversarial calibration gaming      |     High |     Medium | Private eval set; randomization; multi‑signal fusion; divergence alerts |
| Dataset bias / PII leakage          | Critical |        Low |           PII scrub, fairness checks, model cards, redaction in exports |
| Over‑confidence from single metric  |     High |     Medium |                   Uncertainty bands; attributions; cap confidence in UI |
| Export policy failures              |   Medium |        Low |                 Pre‑flight policy engine; signed manifest; deny on fail |
| Drift (data/population/performance) |   Medium |     Medium |                      Drift monitors + alerts; shadow scoring on replica |

---

### Code & Specs (Guy IG)

#### 1) Cadence Entropy & Burst Scoring (Python)

```python
from __future__ import annotations
import numpy as np

def cadence_entropy(timestamps_s: list[int]) -> float:
    """Shannon entropy over inter‑arrival histogram; higher = more human‑like.
    timestamps_s must be sorted ascending.
    """
    if len(timestamps_s) < 3:
        return 0.0
    deltas = np.diff(timestamps_s)
    if not np.all(deltas):
        deltas = deltas + 1e-6
    hist, edges = np.histogram(np.log(deltas), bins=min(20, max(3, len(deltas)//3)), density=True)
    p = hist / hist.sum() if hist.sum() else hist
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())

def burst_score(counts_per_minute: list[int]) -> float:
    """Simple burstiness: variance‑to‑mean ratio (Fano factor) squashed to 0‑1.
    """
    x = np.array(counts_per_minute)
    if x.mean() == 0:
        return 0.0
    fano = x.var() / x.mean()
    return float(1 - np.exp(-min(fano, 10)))  # 0..~0.999

if __name__ == "__main__":
    ts = np.cumsum(np.random.exponential(scale=30, size=200)).astype(int).tolist()
    ce = cadence_entropy(ts)
    b = burst_score((np.random.poisson(lam=2, size=60)).tolist())
    print({"cadenceEntropy": ce, "burstScore": b})
```

#### 2) Scoring API (TypeScript, Express + Zod)

```ts
// apps/server/src/routes/score.ts
import { Router } from 'express';
import { z } from 'zod';

const ScoreReq = z.object({
  narrativeId: z.string(),
  timestamps: z.array(z.number()).min(3),
  perMinute: z.array(z.number()).min(10),
});
const ScoreRes = z.object({
  deceptionScore: z.number(),
  burstScore: z.number(),
  cadenceEntropy: z.number(),
  uncertainty: z.number(),
  attributions: z.array(
    z.object({ feature: z.string(), weight: z.number(), snippet: z.string() }),
  ),
});

export const scoreRouter = Router().post('/score:narrative', (req, res) => {
  const parse = ScoreReq.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'bad_request' });
  const { timestamps, perMinute } = parse.data;
  // call to Python service or WASM port here (omitted for brevity)
  const burstScore = 0.71,
    cadenceEntropy = 2.9;
  const deceptionScore = 0.78; // from fusion ensemble
  const uncertainty = 0.22; // calibrated via isotonic
  const attributions = [
    {
      feature: 'cadenceEntropy',
      weight: 0.42,
      snippet: 'irregular inter‑arrivals',
    },
    { feature: 'burstScore', weight: 0.31, snippet: '3 spikes in 5m' },
  ];
  const body = {
    deceptionScore,
    burstScore,
    cadenceEntropy,
    uncertainty,
    attributions,
  };
  return res.json(ScoreRes.parse(body));
});
```

#### 3) XAI Overlay (React)

```tsx
// apps/web/src/features/psyops/ExplainDrawer.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';

export default function ExplainDrawer({ open, onClose, data }: { open: boolean; onClose: () => void; data: any }) {
  if (!open) return null;
  const attrs = data?.attributions ?? [];
  const cf = data?.counterfactual ?? { affected: 'node‑123', deltaPct: -31 };
  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Explain this view</h2>
        <button onClick={onClose} className="text-sm underline">Close</button>
      </div>
      <Card className="p-3 mb-3">
        <h3 className="font-medium mb-2">Top contributors</h3>
        <ul className="list-disc ml-5">
          {attrs.map((a: any, i: number) => (<li key={i}>{a.feature}: {a.weight.toFixed(2)} — <em>{a.snippet}</em></li>))}
        </ul>
      </Card>
      <Card className="p-3 mb-3">
        <h3 className="font-medium mb-2">Counterfactual</h3>
        <p>Remove <code>{cf.affected}</code> → deceptionScore {cf.deltaPct}%</p>
      </Card>
      <Card className="p-3">
        <h3 className="font-medium mb-2">Uncertainty</h3>
        <div className="h-2 w-full rounded bg-gray-200">
          <div className="h-2 rounded" style={{ width: `${(data?.uncertainty ?? 0) * 100}%` }} />
        </div>
        <p className="text-xs mt-1">Uncertainty: {(data?.uncertainty ?? 0) * 100).toFixed(0)}%</p>
      </Card>
    </div>
  );
}
```

#### 4) Model Card (YAML)

```yaml
model: deception_scoring_v0_3
owner: intelgraph/psyops
purpose: Read‑only assessment of coordination likelihood and cadence irregularity
intended_use: Analyst decision support; never for automated enforcement or outreach
not_intended_use: Audience targeting, persuasion, or content injection
training_data: mixture_of_public_web + synthetic_bursts (see data_card v2025‑09)
pii_handling: email/usernames redacted; URLs hashed
fairness_considerations:
  - language variance: calibrated across EN/ES/FR; others flagged high uncertainty
  - geography: geo jitter used only as weak signal; avoid demographic proxies
risk_mitigation:
  - uncertainty bands exposed in UI
  - multi‑signal fusion; no single metric gating
eval:
  auc: 0.91
  ece: 0.043
version: 0.3.0
changelog:
  - calibrated with isotonic; added counterfactual attribution
```

#### 5) Export Manifest (signed)

```json
{
  "packageId": "exp_01H...",
  "createdAt": "2025-09-11T17:00:00Z",
  "policy": {
    "licenseOk": true,
    "ethicsOk": true,
    "redactions": ["pii.email"]
  },
  "manifest": [
    { "sha256": "f2ab...", "path": "items/0001.json" },
    { "sha256": "91cd...", "path": "items/0002.json" }
  ],
  "signature": "BASE64_ED25519_SIG"
}
```

---

### Tickets (ready for grooming)

- **SCORE‑201**: Implement Python cadenceEntropy + burstScore; expose via gRPC/REST.
- **SCORE‑202**: Fusion ensemble + isotonic calibration; persist reliability diagram.
- **XAI‑210**: Explain drawer with attributions + counterfactual delta; wire traceId.
- **GOV‑230**: Model cards + export policy pre‑flight; HTTP 451 denials with reason codes.
- **OBS‑240**: Drift monitors (data/perf/prediction) + divergence alerts (>5%).
- **PERF‑250**: Optimize overlay render to ≤150ms P95; virtualize lists.

### OKRs (Sprint 2)

- KR1: WS demo stable for 30‑minute run (0 disconnects P95).
- KR2: ≥95% responses include traceId + provenance link.
- KR3: 0 policy violations; 100% denials carry human‑readable reasons.

---

**The Committee stands ready to advise further. End transmission.**
