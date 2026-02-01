# InfoOps Endurance & Ambiguity Plan (IOEA 1.0)

**Status**: Draft (Intentionally constrained until validation gates pass)
**Goal**: Integrate endurance- and ambiguity-centered narrative analysis primitives into Summit while preserving determinism, multi-tenant isolation, and governance alignment.
**Readiness Reference**: Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) governs readiness gates and evidence posture.

## 1.0 ITEM intake summary

- **ITEM**: Daily research synthesis on narrative analysis and information operations (InfoOps).
- **Core thesis**: Modern InfoOps optimize for **endurance and ambiguity** (frame persistence, frame migration, indirect insinuation) rather than pure reach/virality.
- **Detection shift**: from claims/spikes/bots to **frames, persistence, roles, and baseline drift**.

## 1.1 Evidence bundle (UEF)

- **EVIDENCE-C1**: Indirect influence without explicit falsifiable claims is a detection gap (USENIX Security 2025 SoK).
- **EVIDENCE-C2**: Reframing that preserves facts degrades detectors (AdSent, arXiv 2026).
- **EVIDENCE-C3**: Disinformation explicitly pursues normalization of previously unacceptable ideas (US Army War College 2025).
- **EVIDENCE-C4**: Cross-platform/fringe-platform seeding is operationally real (CSET report).
- **EVIDENCE-C5**: Frame representations can be embedding-stable beyond surface wording (FrameAxis; moral embedding literature).
- **EVIDENCE-C6**: Baseline-vs-excitation modeling formalizes baseline manipulation (Hawkes IO survey).
- **EVIDENCE-C7**: Human–LLM mixed authorship and style-change detection are established domains (LLM authorship attribution survey; stylometry studies).
- **EVIDENCE-C8**: Long-horizon narrative structural shift detection is feasible (persistent homology on co-occurrence graphs).

## 1.2 Assumptions (Deferred pending validation)

- **A1**: Persistence under moderation pressure is the primary operational objective.
- **A2**: Frame swapping (stance preserved, frame changes) is a reliable coordination marker.
- **A3**: Role-stability features outperform timing-based coordination signals for low-and-slow campaigns.
- **A4**: Stylometric inconsistency within an account is a top detection signal for blended human–AI operations.

Validation gates for A1–A4 are defined in §1.8.

## 1.3 Subsumption strategy

Add new detection primitives as independent modules with deterministic evidence outputs:

- **Frame Embedding Service (FES)**
- **Narrative Graph Builder (NGB)**
- **Persistence & Migration Analyzer (PMA)**
- **Indirect Rhetoric Detector (IRD)**
- **Role & Diffusion Engine (RDE)**
- **Baseline Drift Monitor (BDM)**
- **Stylometry & Author-Switch Monitor (SAM)**
- **Evidence Harness (EVH)**

## 1.4 Architecture slice

**Dependency flow**: FES → NGB → PMA, IRD → (NGB, PMA), RDE ← NGB + temporal events, BDM ← FES time windows, SAM ← account streams, EVH wraps all runs.

**Core schema targets** (initial):

- `frame_embedding`, `narrative`, `narrative_event`, `actor_role`, `baseline_window`, `stylometry_signature`.

## 1.5 Evidence and determinism wiring

**EvidenceID**: `EVID-` + `sha256(git_sha + dataset_digest + config_digest)[:16]`.

Each module run produces:

- `evidence/<EvidenceID>/report.json`
- `evidence/<EvidenceID>/metrics.json`
- `evidence/<EvidenceID>/stamp.json`

## 1.6 PR sequence (scaffold-first)

- **PR0**: Evidence harness + determinism gates.
- **PR1**: FES (frame vectors + axes projections).
- **PR2**: NGB (narrative linking + stitching).
- **PR3**: PMA (survivability + migration metrics).
- **PR4**: IRD (claimless influence signals).
- **PR5**: RDE (role labeling + stability).
- **PR6**: BDM (baseline drift detection).
- **PR7**: SAM (stylometry + author-switch detection).

## 1.7 MAESTRO security alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: adversarial reframing, data poisoning, cross-tenant inference, model supply-chain tampering, prompt injection, tool abuse.
- **Mitigations**: signed weight verification, tenant-scoped storage and keys, deterministic evidence gates, rate-limited graph expansion, provenance hashing at ingestion, and audit logging of narrative linking operations.

## 1.8 Go/no-go validation gates (A1–A4)

- **G1 (A1)**: Survivability metrics explain incremental variance in coordination labels over engagement metrics.
- **G2 (A2)**: Frame swap detector meets precision threshold and false-positive ceiling on organic controls.
- **G3 (A3)**: Role-stability AUC exceeds timing-synchrony baseline for low-and-slow subset.
- **G4 (A4)**: SAM reduces blended-op miss rate without exceeding false-positive ceiling on multilingual/editorial controls.

## 1.9 Rollback posture

- Feature flags per module; default-off until gates pass.
- Revert path: disable module, remove evidence artifacts, and update DecisionLedger entry status.

## 1.10 Next steps

- Register ENDURE-FRAME benchmark harness (evals/ENDURE_FRAME/).
- Extend evidence harness to enforce offline/no-network constraint checks.
- Prepare FrameOps analyst workflow draft for governance review.
