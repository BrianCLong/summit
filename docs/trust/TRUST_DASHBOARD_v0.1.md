# Trust Dashboard v0.1 Requirements

## 1. Core UX Screens (MVP)

1.  **Timeline**
2.  **Receipt Detail**
3.  **Skills**
4.  **Policies**
5.  **Costs**
6.  **Export**

---

## 2. Timeline (Default Landing)

**Purpose**: "What did my agent do?" with immediate confidence.

**Components**

*   Filters: `Time range`, `Channel`, `Skill`, `Mode`, `Outcome (allowed/blocked/needs approval)`
*   Each item shows:
    *   Title: `Skill • action summary`
    *   Outcome chip: `Completed / Blocked / Awaiting approval`
    *   Quick facts: `capabilities used`, `artifacts created`, `cost`, `duration`
    *   Trust signals: `Signed`, `Verified skill`, `Sandboxed`

**Minimum Fields per Entry**

*   `receipt_id (short)`, `timestamp`, `skill_id`, `intent summary`, `outcome`, `cost`, `signature status`

---

## 3. Receipt Detail View

**Purpose**: Full auditability + replay confidence.

**Tabs**

*   **Summary**: intent → outcome → costs → approvals
*   **Plan**: step list with statuses
*   **Tools**: tool calls, inputs/outputs hashes, timings
*   **Policy**: allow/deny decisions with rule IDs and explanations
*   **Artifacts**: hashes + sensitivity + links
*   **Replay**: "simulate replay" (no side effects) + "re-run" (requires approvals)

**Key UI Affordances**

*   "Share redacted receipt" (creates shareable URL/export)
*   "Export evidence bundle" (zip/json)
*   "Report anomaly" (flags receipt for review)

---

## 4. Skills Screen

**Purpose**: Show installed skills and why they’re safe.

**Per-skill Card**

*   Name + publisher + Verified badge
*   `Installed version` + `bundle digest`
*   Permissions summary (capabilities + scopes)
*   Sandbox status (pass/fail + suite version)
*   Provenance (repo, commit, build system)
*   Buttons:
    *   View manifest
    *   View permissions
    *   View provenance
    *   Uninstall (requires confirmation)
    *   "Lock version" toggle (enterprise-friendly)

---

## 5. Policies Screen

**Purpose**: Make governance legible.

**Policy Stack**

*   `Base policy set` (Switchboard)
*   `User overrides`
*   `Tenant overlays` (white-label/enterprise)

**Features**

*   Human-readable policy summaries:
    *   "Email send: disabled"
    *   "Network egress: allowlist only"
    *   "Autopilot: only for workflows A/B"
*   "Policy diff" between versions
*   Policy simulation: paste a hypothetical plan → see allow/deny outcomes

---

## 6. Costs Screen

**Purpose**: Reinforce "cheaper by default."

**Views**

*   Spend over time
*   Cost by skill
*   Cost by channel
*   Model routing breakdown (local vs hosted; model names)
*   Budget caps + alerts

---

## 7. Export (Evidence Bundle)

**Export Formats**

*   **Receipt JSON** (raw)
*   **Redacted Receipt JSON**
*   **Evidence Bundle ZIP**

**Evidence Bundle Contents (zip)**

```
evidence-bundle/
  bundle_manifest.json
  receipts/
    *.json
  skills/
    <skill_id>/<version>/
      manifest.json
      permissions.json
      attestations/
  policies/
    policyset.json
    policyset_digest.txt
  artifacts/
    index.json           # hashes + uris (payload optional)
```

`bundle_manifest.json` includes: range of receipts, policy versions, exporter identity, hash list.
