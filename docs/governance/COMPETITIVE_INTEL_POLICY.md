**Owner**: Governance
**Last-Reviewed**: 2026-01-31
**Evidence-IDs**: EVID-GOV-COMP-POLICY-001
**Status**: active
**ILSA-Level**: 4
**IBOM-Verified**: true

# Competitive Intelligence Subsumption Policy

## 1. Purpose

This policy defines the ethical, legal, and technical boundaries for harvesting and subsuming competitive intelligence into the Summit platform. It ensures that all competitive analysis is evidence-backed, lawful, and directed toward architectural transcendence.

## 2. Hard Constraints (Non-Negotiable)

- **Public Information Only**: Use ONLY publicly available information (repos, docs, blog posts, papers).
- **No Verbatim Copying**: Do not copy non-trivial text or code. Summarize concepts and reimplement independently.
- **License Respect**: Adhere strictly to the target's license. Propose clean-room reimplementation when ambiguous.
- **No Gray-Hat Actions**: No scraping behind auth/paywalls, no social engineering, no doxxing.
- **Evidence-First**: Every claim must be linked to an Evidence Item (EVID-###) with source URL and snippet.

## 3. The CISTP Protocol

All competitive intelligence activities must follow the **Competitive Intelligence Subsumption & Transcendence Protocol (CISTP)**.

### Phase 1: Deep Extraction
- Output: Target Intel Dossier + Evidence Index.
- Gate: 90% of Key Claims have EVID support.

### Phase 2: Integration & Enhancement
- Output: Summit module mapping + PR stack (Patch-First).
- Gate: PRs include tests, evals, and rollback plans.

### Phase 3: Innovation & Transcendence
- Output: Superior architecture proposals + benchmark plans.
- Gate: Defined measurable KPIs (latency/cost/quality/devx).

### Phase 4: Obsolescence & Moat Building
- Output: Hard control points, certification policies, and provenance hooks.
- Gate: Tie features to enforcement points in code/CI.

## 4. Enforcement (CI/CD)

- The `gate_competitive_intel.py` gate validates that all files in `docs/competitive/` follow the evidence rules.
- Competitive intel dossiers failing to meet the 90% evidence threshold or containing verbatim code snippets will block the merge.
