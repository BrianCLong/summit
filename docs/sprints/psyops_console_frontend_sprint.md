## Sprint: PsyOps Console (Frontend) | IntelGraph Advisory Report | GitHub Branch: feature/psyops-ui-sprint

> As Chair, I present the findings of the IntelGraph Advisory Committee on a new sprint focused on psyops (defensive counter-deception, disinformation analysis) and its frontend. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary

**Unanimous View:** Build a **PsyOps Console** that operationalizes defensive counter-deception: disinformation network mapping, narrative heat/impact, COA planning, and explainable evidence—delivered in the tri-pane UI (graph / timeline / map) with “explain this view” overlays and ethics rails.  
**Dissents:** **🟥 Starkey** warns the console itself may become a target of adversary perception-hacking; **🟥 Foster** flags coercive psyops features as out-of-bounds per the Ethics Gate.

---

### Individual Commentaries

### 🪄 Elara Voss

- “By the runes of Scrum, keep the sprint lean: ship **R3 Disinformation Network Mapping** as the core user journey, with saved views and time-brushing.”
- Add command palette actions for “Seed Narrative → Burst Detect → Influence Paths → COAs.”

### 🛰 Starkey

- Reality check: the UI’s metrics (reach/heat) can be gamed; integrate **deception score** signals and show uncertainty bands to prevent over-confidence.
- Include **defensive deception lab** tie-ins only (honeypots/decoys) to validate narratives, never to manipulate.

### 🛡 Foster

- Operational vectors indicate we must hard-gate anything that looks like influence ops tooling: **analysis and defensive counter-messaging planning only**, no coercive modules—per “Won’t Build.”
- Every view needs provenance tooltips and legal/authority tags surfaced.

### ⚔ Oppie (11-persona consensus)

- We decree unanimously: fuse **Strategic Influence Dashboard** elements (provenanced narratives, campaign detection) into the console’s top bar.
- Dissent within Oppie bloc: _Beria_ demands “active counter-ops”; the Committee rejects—analysis only.

### 📊 Magruder

- For executive traction: ship an **Impact/Reach heatmap** next to narrative timelines; tie to **COA planner** for options with likelihood/impact/bands.
- Bake in KPI panels aligned to accepted runbook KPIs (time-to-hypothesis, confidence).

### 🧬 Stribol

- Cross-source analysis reveals value in **Graph-XAI overlays** (path rationales, counterfactuals) to explain why a narrative appears coordinated.
- Wire an experiment hook for **war-gamed decisions** (safe simulations), but lock behind ombuds/ethics guard.

---

### Chair Synthesis

**Sprint Goal (2 weeks):** Deliver **PsyOps Console v0.1 (read-only analysis)** that lets analysts: (1) seed narratives, (2) see burst/cadence, (3) visualize influence paths on graph/timeline/map, (4) view provenance and policy labels, (5) compare COAs for defensive response.

#### Scope & Backlog (Must-Have)

1. **Tri-pane shell** with synchronized brushing, saved views, and “Explain this view.”
2. **R3 Runbook UI**: Seed narratives → detect bursts → show influence paths → surface bot-like cadence.
3. **Provenance & Policy overlays**: source→transform chain, license/authority badges, redaction hints.
4. **COA mini-panel (read-only)**: list defensive options with likelihood/impact bands; no actioning.
5. **Ethics rails**: block coercive features; show reason-for-denial with appeal path.

**Nice-to-Have (stretch):** Narrative heatmap widget and uncertainty bands tied to **deception score**.

#### Acceptance Criteria

- UI loads tri-pane and maintains sync brushing across graph/timeline/map; “Explain this view” renders contextual rationale.
- R3 flow completes on sample dataset; KPIs visible (time-to-hypothesis, precision with citations).
- Every narrative node shows provenance tooltip and license/authority badges.
- Any attempt to create/manipulate audiences is blocked with human-readable policy reason.

#### Risk Matrix

| Risk                                        | Severity | Likelihood |                                                                   Mitigation |
| ------------------------------------------- | -------: | ---------: | ---------------------------------------------------------------------------: |
| Metric gaming / perception-hacking          |     High |     Medium | Show uncertainty bands; cross-validate via provenance & cadence diagnostics. |
| Ethics breach (coercive tooling creep)      | Critical |        Low |         Enforce “Won’t Build”; guardrails with denial reasons & ombuds flow. |
| Policy/license violations in evidence views |     High |        Low |                License/TOS engine at query time; badges and export blockers. |
| Over-attribution (“mole-hunt” spiral)       |   Medium |     Medium |                              CH tables + “paranoia dampener” cues in briefs. |

#### Code Snippet (Guy IG) — React Frontend Shell (tri-pane + overlays)

```tsx
// apps/web/src/features/psyops/PsyOpsConsole.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Narrative = { id: string; title: string; confidence: number };

export default function PsyOpsConsole() {
  const [selected, setSelected] = useState<Narrative | null>(null);

  return (
    <div className="h-full w-full grid grid-cols-12 grid-rows-12 gap-3 p-4">
      {/* Top bar */}
      <div className="col-span-12 row-span-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold">PsyOps Console</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => explain()}>
            Explain this view
          </Button>
          <Button onClick={() => saveView()}>Save View</Button>
        </div>
      </div>

      {/* Graph */}
      <Card className="col-span-6 row-span-7 p-3 rounded-2xl shadow">
        <h2 className="font-medium mb-2">Influence Graph</h2>
        <div
          id="graph-pane"
          className="h-full"
          aria-describedby="provenance-help"
        />
      </Card>

      {/* Timeline */}
      <Card className="col-span-6 row-span-4 p-3 rounded-2xl shadow">
        <h2 className="font-medium mb-2">Burst & Cadence Timeline</h2>
        <div id="timeline-pane" className="h-full" />
      </Card>

      {/* Map */}
      <Card className="col-span-6 row-span-4 p-3 rounded-2xl shadow">
        <h2 className="font-medium mb-2">Geo Spread Map</h2>
        <div id="map-pane" className="h-full" />
      </Card>

      {/* COA (read-only) */}
      <Card className="col-span-6 row-span-3 p-3 rounded-2xl shadow">
        <h2 className="font-medium mb-2">Defensive COAs</h2>
        <ul className="list-disc ml-5">
          <li>Evidence bundle & citation pack</li>
          <li>Public rebuttal with uncertainty bands</li>
          <li>Platform reporting with provenance</li>
        </ul>
      </Card>

      {/* Provenance tooltip target */}
      <div id="provenance-help" className="sr-only">
        Each node shows source→transform chain and license/authority badges.
      </div>
    </div>
  );
}

function explain() {
  // opens a right-drawer with rationale (paths, counterfactuals, guardrails)
}

function saveView() {
  // persists synchronized brushing state & filters
}
```

_Notes:_ This shell implements the **tri-pane** with explainability & provenance affordances; the R3 flow and overlays connect to existing web app patterns.

#### Sprint Wiring to Backlog & Runbooks

- Route **R3 Disinformation Network Mapping** into a sidebar “Runbook” drawer (read-only execution & audit log).
- Surface **Strategic Influence Dashboard** metrics (reach/heat) as compact widgets in the top bar.
- Connect to **Provenance & Claim Ledger** for per-node tooltips and disclosure bundles.

---

### Attachments (Optional)

- **OKR Table (Sprint):**
  - KR1: Analysts complete R3 flow end-to-end on sample set in ≤10 minutes (P95).
  - KR2: 100% narrative nodes show provenance and policy badges.
  - KR3: 0 violations of “Won’t Build” lint—policy denials render with reasons.

---

**The Committee stands ready to advise further. End transmission.**
