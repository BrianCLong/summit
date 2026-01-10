# Project #19 UX Sweep Tracker

## Inventory (local Project #19 items)

The environment is offline from github.com, so this inventory is derived from the local Project #19 issue files under `project_management/issues/`. Titles are taken from the first heading of each file to preserve canonical naming.

- 113: Causal Discovery & Intervention Simulator (CDIS)
- 114: Complex Event Processing & Stream Rules (CEP)
- 115: Accessibility & Inclusive UX Lab (A11Y-Lab)
- 116: Classification & Handling Markings (CHM)
- 117: Confidential Compute Enclave Runner (CCE)
- 118: Supply Chain Security & License Governance (SCA/SBOM)
- 119: Data Producer Contracts & Ingest Certification (DPIC)
- 120: Device Trust & Posture Enforcement (DTPE)
- 121: Navigation & Route Coherence Hardening
- A1: Canonical Schema & Policy Labels
- A2: Bitemporal Model + Time Travel
- A3: ER v1 (Service + Queue + Explain)
- A4: Provenance & Claim Ledger Integration
- A5: Connectors (10 GA)
- ATSH: Adaptive Triage Safety Harness
- ATSH: Autonomous Test Safety Harness
- B1: NL→Cypher with Preview & Sandbox
- B2: GraphRAG (Evidence-First)
- B3: Guardrails & Model Cards
- C1: Link/Path/Community/Centrality Suite
- C2: Pattern Miner Templates
- D1: Tri-pane Shell
- D2: XAI Overlays & Explain This View
- D3: ER Adjudication UI
- E1: ABAC via OPA + Field/Edge-level Authz
- E2: License/TOS & Export Controls
- F1: Observability & SLO Dashboards
- F2: Cost Guardrails
- F3: DR/BCP & Offline Kit v1
- FF1: QA ATSH Safety Harness
- FF2: Platform Saga Orchestration
- FF3: AI Prompt Registry Hardening
- Prompt Registry: Governed Prompt Store
- Prompt Registry: Governed Prompt Lifecycle
- SAGA: Orchestrated Platform Resilience
- SAGA: Workflow Orchestration Platform
- Adaptive behavioral DNA correlation network
- Autonomous OT/ICS digital twin red team
- Cross-domain adversary simulation cognitive twins
- Deepfake cognitive manipulation sentinel
- Errata unified error taxonomy initiative — Jira ticket plan
- Mission-critical service continuity orchestrator
- Quantum-resistant threat modeling engine

## Sweep Mapping Table

| Sweep                                            | Candidate Project Items                                                                                                    | Clarity                                                                    | Size                     | Impacted UI Surfaces                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Sweep 1 — Broken Flow & Navigation               | 121: Navigation & Route Coherence Hardening; D1: Tri-pane Shell; D3: ER Adjudication UI; FF3: AI Prompt Registry Hardening | Clear (121), Ambiguous (D1/D3 due to sparse AC), Ambiguous (FF3 nav paths) | 121=S, D1=M, D3=M, FF3=M | Router shell, tri-pane workspace, ER queue, registry flows |
| Sweep 2 — Loading / Empty / Error State          | Errata unified error taxonomy; F1: Observability & SLO Dashboards; DPIC; SAGA                                              | Ambiguous                                                                  | M                        | Error overlays, dashboards, ingest queues                  |
| Sweep 3 — Accessibility (A11y)                   | 115: A11Y Lab; 121: Navigation labels; D1/D3 shells                                                                        | Clear (115/121), Ambiguous (D1/D3)                                         | S–M                      | Route announcer, focus states, pane sync                   |
| Sweep 4 — Design Consistency & Component Hygiene | D1/D2 visual shells; Prompt Registry UI; Observability dashboards                                                          | Ambiguous                                                                  | M                        | Shared layout, charts, registry tables                     |
| Sweep 5 — Onboarding & Docs UX                   | Prompt Registry docs; ATSH delivery docs; Connectors 10 GA                                                                 | Ambiguous                                                                  | M                        | README/setup flows, feature flag guides                    |

## Sweep 1 Queue (top four navigation/flow items)

1. 121: Navigation & Route Coherence Hardening — resolve "Unknown" headers and missing route labels in the router shell (selected for immediate implementation).
2. D1: Tri-pane Shell — ensure synchronized pane navigation, saved view routing, and consistent labels.
3. D3: ER Adjudication UI — verify queue filters, decision flows, and reversible actions route correctly.
4. FF3: AI Prompt Registry Hardening — validate registry navigation and auth redirects for gated UX.

## Current WIP

- None (starting Sweep 1 with Item 121).

## Completed Since Last Report

- None yet (initial sweep kickoff).

## Next Up

- Finish Sweep 1 Item 121 and proceed to D1 and D3 once nav shell is green.
