# Summit Competitive Intelligence Subsumption Protocol v1.1

## Core Philosophy
This protocol establishes a clean-room, evidence-first competitive intelligence system that is:
* **Operationally executable**: Generates code and strategy, not just "insights".
* **Governance-native**: Enforces determinism, CI verification, and GA posture.
* **Legally defensible**: Strictly public-only signals, license-safe, and verifiable.
* **Agent-orchestrated**: Prevents cross-contamination between extraction and implementation.
* **PR-stack oriented**: Small blast radius, reversible, and auditable.

## The PR Stack Recipe
Value is delivered through a strict sequence of Pull Requests to prevent speculative over-engineering:

1.  **PR-0: Docs & Dossier**
    *   Establish the `docs/competitive/<target>/` folder.
    *   Fill `EVIDENCE_MAP.md` (claims) and `DOSSIER.md` (concepts).
    *   No runtime code.
2.  **PR-1: The Hook**
    *   Implement data structures or extraction logic (e.g., `scouts/`).
    *   Define the interface without the implementation.
3.  **PR-2: The Slice**
    *   Implement a narrow, end-to-end vertical slice of functionality.
    *    Prove viability.
4.  **PR-3: The Leap**
    *   Expand to full feature parity or superiority ("Subsumption").
5.  **PR-4: The Gates**
    *   Add regression tests, benchmarks, and security gates.

## Governance & Refinements

### 1. Separation of Extraction vs. Implementation
*   **Extraction**: Concept harvesting only. Output is Markdown artifacts.
*   **Implementation**: Clean-room re-implementation. No code copying.

### 2. Evidence Map & Claim Expiry
All competitive claims must be logged in `EVIDENCE_MAP.md`.
*   **Confidence**: `CONFIRMED`, `HIGH`, `MEDIUM`, `LOW`.
*   **Expiry**: Use `revalidate_by: YYYY-MM-DD | next_major_release | never` to flag stale assumptions.

### 3. Negative Space
Explicitly document what the target *does not* do in `DOSSIER.md`.
*   **Section**: `## 1. Executive Extraction > Negative Space`
*   **Purpose**: Identifies opportunities for Transcendence Design.

### 4. Clean-Room Assurance
Every PR related to competitive intelligence must include a "Clean-Room Assurance" note:
*   **Source boundary respected**: yes/no
*   **Copied code**: none
*   **Derived ideas only**: confirmed

### 5. Determinism
*   No timestamps in primary artifacts (except `stamp.json` or equivalent).
*   CI will fail if non-deterministic elements (dates, random seeds) are found in `DOSSIER.md`.

## Artifacts
*   `DOSSIER.md`: The master narrative and strategic synthesis.
*   `EVIDENCE_MAP.md`: The database of verified claims and sources.
*   `BACKLOG.md`: Extracted features mapped to Summit tickets.
*   `PR_STACK_PLAN.md`: The execution roadmap.
