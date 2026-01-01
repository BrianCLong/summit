# Summit innovation intake and provisional docket (2026)

## Purpose

Create a lightweight path to capture new ideas, link them to roadmap epics, and fast-track provisional filings for graph+copilot and federation features.

## Intake form (lightweight)

Use this template for each submission. Keep responses concise (1–3 bullets per field).

| Field                                 | Guidance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Request title / submitter / date      | Example: `Graph-aware copilot traversal hardening` / `Jane Doe` / `2025-12-19`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Epic alignment (check all that apply) | ☐ [Epic 1 – Air-gapped deployable baseline](../../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-612-months) · ☐ [Epic 2 – Secure LLM copilot and retrieval layer](../../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-612-months) · ☐ [Epic 3 – Federation + cross-domain ingestion mesh](../../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-612-months) · ☐ [Epic 5 – Offline-first/mobile field kit](../../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-612-months) · ☐ [Epic 6 – Investigations UI 2.0](../../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-612-months). |
| Novelty signals                       | Why it is non-obvious vs. existing roadmap or prior art (e.g., risk-budgeted traversal, sealed installer, HE+ZK training loop).                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Deployment context                    | Air-gapped enclave, disconnected edge kit, classified network, or connected SaaS; list GPU/CPU constraints and data sensitivity.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| User/job-to-be-done                   | Analyst, operator, or partner scenario; inputs, decision, and measurable win.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Safety/ethics/security                | Abuse/failure modes, auditability, policy controls needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Dependencies                          | Data, models, connectors, or infra prerequisites; note any blocked epics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Artifacts                             | Diagrams, prompt flows, PoCs, benchmarks, or prior tickets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Invention-harvest workshops

Schedule and capture notes/action items in the table below. Use the intake form for pre-reads and attach draft claims.

| Session         | Date (target) | Facilitator | Leads / attendees                              | Objectives                                                                                                     |
| --------------- | ------------- | ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Graph/copilot   | 2026-01-07    | Patent ops  | Graph lead, Copilot lead, Security lead, Legal | Validate graph-aware traversal with risk budgets; map to Epic 2 & 6; enumerate offline/air-gapped constraints. |
| Federation mesh | 2026-01-09    | Patent ops  | Federation lead, Data platform, Privacy, Legal | Validate HE+ZK training loop and sealed installer flows; map to Epics 1, 3, & 5; capture deployment caveats.   |

### Candidate claim sets (draft)

- **Graph-aware LLM copilot traversal with risk budgets (Epic 2/6):**
  - Independent: A method where a copilot generates graph traversals constrained by per-query risk budgets, enforcing policy checks before execution and adjusting prompts based on budget consumption.
  - Dependent: The method of claim 1, wherein the budget couples to GPU scheduling and offline cache hit rates to maintain a 5-minute response window.
- **HE + ZK federated training loop (Epics 3/5):**
  - Independent: A federated learning workflow that applies homomorphic encryption to gradient updates and attaches zero-knowledge attestations proving policy-compliant participation without exposing raw data.
  - Dependent: The workflow of claim 1, wherein aggregation nodes rotate keys per cohort and emit signed lineage proofs consumable by air-gapped auditors.
- **Sealed, offline 5-minute installer with attestations (Epics 1/5):**
  - Independent: A sealed installer that boots an offline deployment, verifies supply-chain attestations, hydrates GPU-aware artifacts from a local cache, and completes provisioning within five minutes.
  - Dependent: The installer of claim 1, wherein attestation manifests are persisted in an append-only ledger and replayed on reconnect for compliance.
- **Federated model context exchange with trust translation (Epics 2/3):**
  - Independent: A zero-trust MCP federation workflow that packages model context into capsules carrying provenance, invariant attestations, trust envelopes, and repair lineage; a verification gateway applies local policy before import.
  - Dependent: The workflow of claim 1, wherein trust translation attenuates upstream trust scores into bounded local semantics and re-anchors imported context into the receiver’s provenance graph without inheriting upstream trust.

## Provisional drafting queue (3–5 filings)

| Working title                                                       | Scope & claim coverage                                                                                                                   | GPU/offline variations                                                             | Drafter                      | Status   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- | -------- |
| Graph-aware copilot traversal with risk budgets                     | Independent + dependent claims for policy-bound graph prompts, budgeted traversal, and UI safeguards for analysts.                       | GPU-aware prompt routing; offline cache fallback; air-gapped log replay.           | Legal (Copilot)              | Drafting |
| HE+ZK federation control loop                                       | Independent + dependent claims for encrypted gradient exchange, ZK attestations, and privacy budget enforcement.                         | GPU/CPU adaptive aggregation; offline sync packages for enclave sites.             | Legal (Federation)           | Drafting |
| Sealed offline installer with attestations                          | Independent + dependent claims for sealed media, attestation verification, and 5-minute provisioning.                                    | GPU driver pinning; air-gapped package mirrors; checksum-only upgrades.            | Legal (Platform)             | Drafting |
| Optional: GPU-aware execution planner                               | Continuation set covering scheduler that prioritizes secured graph/coplanar workloads under risk budgets.                                | Offline-first executor; bounded-energy modes for edge GPUs.                        | Legal (Platform)             | Backlog  |
| Optional: Air-gapped copilot federation bridge                      | Continuation set linking copilot outputs to federated ingestion with sealed evidence chains.                                             | Delayed-sync envelopes; GPU-light inference tier.                                  | Legal (Cross-team)           | Backlog  |
| Federated model context exchange with trust translation (FMCP-TPCE) | Independent + dependent claims for capsuleized context export, policy-negotiated import, trust translation, and provenance re-anchoring. | Applies to both online and air-gapped exchanges; supports delayed envelope replay. | Patent ops + Federation lead | Drafting |

## Filing tracker and 12-month docket

_Assuming filings target **2025-12-19**; update if the actual priority date differs._

| Provisional                                                         | Owner                        | Priority date (target) | 12-month conversion due | Next actions                                                                                       |
| ------------------------------------------------------------------- | ---------------------------- | ---------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Graph-aware copilot traversal with risk budgets                     | Patent ops + Copilot lead    | 2025-12-19             | 2026-12-19              | Finalize workshop notes; circulate draft for security review; assign claim numbers.                |
| HE+ZK federation control loop                                       | Patent ops + Federation lead | 2025-12-19             | 2026-12-19              | Validate HE/ZK stack with privacy; prep figures showing key rotation and attestation flow.         |
| Sealed offline installer with attestations                          | Patent ops + Platform lead   | 2025-12-19             | 2026-12-19              | Lock installer steps; capture attestation chain and GPU artifact staging diagrams.                 |
| Federated model context exchange with trust translation (FMCP-TPCE) | Patent ops + Federation lead | 2026-01-01             | 2027-01-01              | Finalize capsule schema, trust translation policies, and provenance anchoring diagrams for filing. |

- Start the docket in the IP tracker with reminders at +6, +9, and +11 months; include PCT vs. non-provisional decision gates.
- Store priority-date evidence (coversheets, receipts, assignor agreements) alongside workshop records and intake forms.
- Update the intake table for any continuation filings or claim refinements emerging from the workshops.
