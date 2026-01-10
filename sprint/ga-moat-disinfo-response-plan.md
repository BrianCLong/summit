# GA Moat Sprint — Disinfo Response-as-Code

## CEO Daily Dispatch — Day 1

- **Yesterday**: Kickoff only; validated governance constraints (defensive-only posture, provenance-first).
- **Today**: Establish wedge selection framework, define two-week value slice, stub Maestro/IntelGraph runs, capture competitor gaps, and lock Day 1 tasks.
- **Blockers**: None yet; watch npm registry access (use local workspace packages only). Data sources must be public and license-cleared.
- **Risk Heat (D1)**: Safety/ethics (med), Delivery scope (med-high), Integration stability (low-med), Compliance evidence completeness (med).

## Two-Week Value Slice (end-to-end proving loop)

- **Goal**: Deliver a defensible disinformation incident-response packet demonstrating provenance-first evidence, policy-as-code gates, and automated disclosure.
- **Slice**:
  1. Ingest + normalize 3 sources (RSS, X/Bluesky public feed, fringe forum dump) into `EvidenceItem` with hashes and labels.
  2. Narrative clustering + claim extraction with IntelGraph nodes, counterevidence links, and provenance edges.
  3. Maestro runs for scoring + response playbook producing ticket, comms draft, export guardrailed by OPA.
  4. Automated “Incident Packet” export including Disclosure Pack (hashes, SBOM/SLSA pointer, risk memo, rollback triggers).
- **Success Metric**: Time-to-first audited incident packet ≤ 10 days with reproducible Maestro run IDs and export hashes.

## Day 1 Task Stack

- Lock wedge hypothesis and outline decision memo (due Day 2).
- Draft narrative risk model factors and scoring rubric.
- Define OPA gates (export control, PII redaction, evidence sufficiency) for playbook steps.
- Author demo talk track skeleton tied to tri-pane view.
- Draft Disclosure Pack template fields and auto-fill mapping from Maestro/IntelGraph runs.

## Day 2 Wedge Decision Memo Outline

1. **Context**: Regulatory pressure (DSA systemic risk), enterprise comms risk, public-sector counter-disinfo.
2. **Options**: (A) DSA systemic-risk pack, (B) Enterprise narrative attack IR, (C) Public-sector counter-disinfo.
3. **Evaluation Criteria**: Auditability, policy-as-code fit, data availability, time-to-value, competitive gap, revenue path.
4. **Evidence to Gather (Day 2)**: Source availability, policy hooks, export/report expectations, sample narratives.
5. **Decision + Rationale**: Selected wedge, why now, reversibility, risks, owner.
6. **Next Steps**: Adjust plan, lock demo script, define day-by-day proof points.

## 10-Day Plan (owners, proof, success metric)

| Day | Owner      | Proof by EOD                                                      | Success Metric                         |
| --- | ---------- | ----------------------------------------------------------------- | -------------------------------------- |
| 1   | PM/Eng     | Dispatch + wedge memo outline, risk heatmap                       | Scope + risks recorded                 |
| 2   | PM/Eng     | Wedge decision memo (A/B/C) with evidence                         | Option chosen with risks/mitigations   |
| 3   | Eng        | Implementation plan + runbook draft                               | Maestro plan skeleton committed        |
| 4   | Eng        | Ingest/normalize runs producing EvidenceItems w/ hashes           | 3 source ingest artifacts              |
| 5   | Eng/ML     | Narrative clustering + claim extraction run with provenance edges | Claims linked to evidence              |
| 6   | Eng        | Risk scoring factors + explainability output                      | Scores with top contributors           |
| 7   | Eng/Policy | OPA policies + playbook automation gated                          | Policy checks blocking unsafe exports  |
| 8   | Eng        | GA readiness checklist + disclosure pack auto-fill                | Checklist approved                     |
| 9   | Eng        | Demo dry-run artifacts, competitor matrix final                   | End-to-end rehearsal                   |
| 10  | PM/Eng     | Final tri-pane demo + disclosure pack export                      | Demo within 7 min, reproducible hashes |

## Wedge Decision Memo (Draft) — **Option B: Enterprise Narrative Attack IR Pack**

- **Context**: Enterprises face brand/reputation attacks; need audit-ready evidence + policy-governed response. DSA/DSC ideas transferable but less dependency on regulator-specific templates, enabling faster GA.
- **Why Option B**: Highest immediacy for design partners (brand risk teams), clear automation hooks (tickets, comms), data sources accessible, and strong differentiation via provenance/policy gates.
- **Evidence**:
  - Existing Maestro + IntelGraph assets for provenance, claim ledger, and policy-as-code fit directly into IR workflows.
  - Enterprise teams already use Jira/Slack integrations → fast automation validation.
  - Export needs (risk memos, rollback plans) align with Disclosure Pack.
- **Risks**: Over-claiming attribution (mitigate via evidence vs hypothesis separation), data licensing for social feeds, playbook overreach without human gate, scope creep into misinformation grading.
- **Decision**: Pursue Option B while keeping DSA-flavored reporting as modular export; reassess on Day 4 if blocked.
- **Reversibility**: Two-way; exports templated to allow DSA/Public-sector overlays.
- **Owners**: PM (wedge), Eng Lead (pipeline), Policy Lead (OPA gates).

## Competitor Matrix (snapshot)

| Competitor         | Core Promise               | Data Sources                      | Explainability/Auditability          | Automation Depth     | Governance Posture         | Gap We Exploit                                  |
| ------------------ | -------------------------- | --------------------------------- | ------------------------------------ | -------------------- | -------------------------- | ----------------------------------------------- |
| Graphika           | Network maps of narratives | Social platforms, public datasets | Visual graphs, limited provenance    | Limited playbooks    | Basic compliance messaging | Lacks chain-of-custody + policy-as-code exports |
| Blackbird.AI       | Narrative risk scoring     | Social/web                        | Risk scores, some provenance visuals | Workflow suggestions | Trust/safety framing       | No audit-ready disclosure pack                  |
| NewsGuard-like     | Source credibility ratings | News/RSS                          | Scoring methodology docs             | Minimal automation   | Editorial policies         | No incident playbooks or provenance chains      |
| Open bot/CIB tools | Bot detection              | Social APIs                       | Stats/ML explanations                | Signals only         | Varies                     | Missing narrative ledger + governance gates     |
| Generic dashboards | Monitoring/alerts          | Mixed                             | Limited transparency                 | Basic alerts         | Weak                       | No provenance-first response automation         |

**Why We Win**

- **Provenance-first**: Hashes + transformation logs per run → defensible chain-of-custody.
- **Policy-as-code**: OPA gates for export, PII minimization, evidence sufficiency.
- **Audit-ready exports**: Disclosure Pack with SBOM/SLSA pointers, risk memos, rollback criteria.
- **Response-as-code**: Maestro playbooks triggering tickets/comms with human-in-loop.
- **Explainable scoring**: Factors surfaced alongside scores; counterevidence captured.

## Demo Script (Tri-Pane, 5–7 minutes)

1. **Pane 1 — Signal Intake**: Show Maestro ingest run pulling RSS + social + fringe dump → normalized EvidenceItems with hashes and sensitivity labels.
2. **Pane 2 — Claim Ledger & Provenance**: Display Narrative node with clustered items, extracted Claims, SUPPORTS/CONTRADICTS links, provenance chain (hashes, tool versions).
3. **Pane 3 — Response-as-Code**: Execute playbook: risk score → OPA gate check → Jira ticket + Slack comms draft → export Incident Packet + Disclosure Pack.
4. **Narration**: Emphasize facts vs hypotheses, policy gates blocking unsafe actions, reproducible run IDs/hashes, and auto-generated appendix.

### Acceptance Checklist

- Ingest produces hashed EvidenceItems with license/terms flags.
- Claim Ledger shows claims + counterevidence and confidence.
- Provenance chain lists transformations (tool/version/params/time/run_id).
- Risk scoring outputs top contributors and “what would change the score.”
- Playbook blocked if OPA fails (PII/export/evidence sufficiency).
- Incident Packet export includes timeline, actions taken/pending, hashes, and Disclosure Pack attachments.

## Disclosure Pack Template

1. **Summary**: Incident context, scope, timestamp, run IDs.
2. **Sources & Hashes**: EvidenceItem table (url, capture_time, hash, license, sensitivity).
3. **Claim Ledger**: claims, modality, stance, confidence, supporting/counter evidence.
4. **Provenance Log**: transformation steps with tool_version, parameters, input/output hashes, operator/run_id.
5. **Risk Memo**: risk score, top contributing factors, assumptions, “what would change the score.”
6. **Policy Checks**: OPA decisions (export/PII/step-up auth), reason codes, overrides (if any).
7. **Actions**: tickets raised, comms drafts, mitigations triggered, pending approvals.
8. **SBOM/SLSA**: pointers to build artifacts, dependency list, attestation links.
9. **Rollback Plan**: triggers, steps, data retention, responsible owner.
10. **Limits**: known gaps, confidence caveats, required human review items.

### Auto-Generated Fields

- EvidenceItem hashes, capture_time, collector_id, sensitivity label.
- Provenance entries (tool version, params, timestamps, run_id).
- Risk score and factor weights from scoring run.
- OPA decision logs with policy version and input summary.
- Artifact hashes for exports (Incident Packet, Disclosure Pack) with storage pointer.

## Risk Heatmap, Controls, Rollback

- **High (Delivery Scope)**: Tight scope to Option B; enforce daily proof checkpoints. _Control_: lock backlog to value slice, daily burn-down.
- **Med (Safety/Ethics)**: Defensive-only posture. _Control_: OPA policies + human approval for labels, strict fact/hypothesis separation.
- **Med (Compliance Evidence)**: Risk of missing artifacts. _Control_: Maestro run templates auto-emit provenance + hashes; nightly audit check.
- **Low-Med (Integration Stability)**: External feeds variability. _Control_: cache representative datasets; retries with hashing to ensure idempotence.
- **Rollback Criteria**: Block rollout if OPA gates fail, provenance chain missing, or Incident Packet cannot be reproduced from run IDs; revert to previous stable plan and freeze exports until fixed.
