# Summit patent intake form (lightweight)

Use this form to gather the minimum details needed to evaluate patentable ideas while keeping them aligned to the Summit roadmap and deployable constraints.

**Traceability note:** The competitor “surpass-by-sidestep” method set is cataloged in [docs/patents/competitor-surpass-sidestep-methods.md](patents/competitor-surpass-sidestep-methods.md) to accelerate claim drafting and cross-epic alignment.

## Submission basics

- Idea title:
- Submitter(s) and contact:
- Date submitted:
- Related repositories / components:
- Problem this idea solves (1–2 sentences):

## Epic alignment and traceability

Mark every applicable epic and add a short note on how the idea advances it.

| Epic (link)                                                                                                      | Alignment check | Notes |
| ---------------------------------------------------------------------------------------------------------------- | --------------- | ----- |
| [Epic 1 – Air-gapped deployable baseline](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)           | [ ]             |       |
| [Epic 2 – Secure LLM copilot and retrieval layer](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)   | [ ]             |       |
| [Epic 3 – Federation + cross-domain ingestion mesh](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months) | [ ]             |       |
| [Epic 5 – Offline-first/mobile field kit](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)           | [ ]             |       |
| [Epic 6 – Investigations UI 2.0](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)                    | [ ]             |       |

## Novelty and deployment context

- What is novel vs. prior art (technique, workflow, architecture)?
- Deployment context: cloud, on-prem, disconnected/air-gapped, field kit, or mixed?
- Dependencies (GPU availability, data sources, OPA/policy, attestations, etc.).

## Invention-harvest workshops (schedule both)

Capture outcomes from two workshops: one with graph/copilot leads and one with federation leads.

| Workshop focus                                    | Lead(s) | Target date | Outcomes and candidate claims |
| ------------------------------------------------- | ------- | ----------- | ----------------------------- |
| Graph-aware copilot + traversal risk budgets      |         |             |                               |
| Federation and cross-domain ingestion/HE+ZK loops |         |             |                               |

### Candidate claim captures

- (a) Graph-aware LLM copilot traversal with configurable risk budgets (coverage of graph nodes/edges, budget enforcement, safety fallbacks):
  - Core claim elements:
  - Variations (GPU-aware scheduling, offline/air-gapped execution):
- (b) Homomorphic encryption + zero-knowledge federated training loop (aggregation, proofs, policy gates):
  - Core claim elements:
  - Variations (GPU-aware execution, offline batching):
- (c) Sealed, offline 5-minute installer with signed attestations (images, manifests, integrity checks):
  - Core claim elements:
  - Variations (GPU driver/toolkit handling, air-gapped updates):

## Provisional drafting checklist

- Target 3–5 provisional applications; ensure each item above has at least one claim set plus GPU-aware and offline/air-gapped variants.
- Draft summary, claims, and diagrams per item (a)–(c) and any combinational embodiments.
- Confirm export-control and publication constraints before sharing drafts.

### Claim set tracker

| Workstream                                  | Draft owner | Claim set status | GPU-aware variant | Offline/air-gapped variant | Notes |
| ------------------------------------------- | ----------- | ---------------- | ----------------- | -------------------------- | ----- |
| (a) Graph-aware copilot traversal           |             |                  |                   |                            |       |
| (b) HE + ZK federated training loop         |             |                  |                   |                            |       |
| (c) Sealed offline installer + attestations |             |                  |                   |                            |       |

## Filing and docketing

- File provisionals and record priority dates and owners below; open a 12-month docket for non-provisional/PCT conversions.

| Filing                   | Jurisdiction | Priority date | Owner | Docket opened? (Y/N) | Next conversion deadline |
| ------------------------ | ------------ | ------------- | ----- | -------------------- | ------------------------ |
| Provisional 1            |              |               |       |                      |                          |
| Provisional 2            |              |               |       |                      |                          |
| Provisional 3            |              |               |       |                      |                          |
| Provisional 4 (optional) |              |               |       |                      |                          |
| Provisional 5 (optional) |              |               |       |                      |                          |

## Approvals and next steps

- Legal/Patent counsel review:
- Product/engineering sign-off:
- Planned next actions (experiments, prototypes, partner demos):
