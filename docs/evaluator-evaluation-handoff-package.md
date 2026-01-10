# Performer → Evaluator Handoff Package

This appendix packages the standard handoff contract, patent-portfolio filing plan, and filing-grade figure captions for evaluator-executable components.

## 1. Performer → Evaluator Handoff Contract

### 1.1 Purpose

A standard evaluation handoff enabling a DARPA-appointed Evaluator to run components, reproduce metrics deterministically, validate artifacts/proofs, and exercise conformance and adversarial tests without relying on proprietary infrastructure beyond declared interfaces.

### 1.2 Roles

- **Performer:** Provides evaluator-executable components, artifacts, and a conformance suite.
- **Evaluator:** Supplies evaluation datasets (optionally escrowed), task schedules, and the scoring harness; runs components and verifies artifacts/proofs.

### 1.3 Interface Surfaces (normative)

All evaluation interactions use versioned, stable interfaces.

#### Control Plane API (Evaluator ↔ Component)

- `POST /v1/eval/register` — Registers capability manifest.
- `POST /v1/eval/configure` — Submits run config, budgets, and scope tokens.
- `POST /v1/eval/run` — Starts a run; returns `run_id`.
- `GET /v1/eval/status/{run_id}` — Progress and budget usage.
- `GET /v1/eval/results/{run_id}` — Outputs, metrics, and proof objects.
- `GET /v1/eval/artifacts/{run_id}` — Artifact bundle (capsule, receipts, witnesses).
- `POST /v1/eval/verify` — Optional verifier endpoint for proofs/manifests (offline verifier acceptable).

#### Data Plane (Inputs/Outputs)

- Inputs provided as either a `DatasetSnapshot` (opaque ID + schema descriptor) or streamed batches with per-batch hashes.
- Outputs emitted as a `ResultSet` (typed) + `MetricReport` + `ProofObject` + `ReplayToken`.

### 1.4 Required Artifacts per Run (Evaluation Artifact Bundle)

1. **Capability Manifest:** Component name/version, supported tasks, resource requirements, interface version(s).
2. **ReplayToken (determinism):** `snapshot_id`, `time_window_id` (if applicable), `seed`, `schema_version`, `index_version_set`, `component_version_hash`, `policy_version` (if used).
3. **ProofObject (verification):** Commitments to inputs/outputs/metrics (Merkle root(s) or hash commitments), policy decision identifiers, optional attestation quote (if TEE used).
4. **WitnessChain (step trace):** Per-stage commitments with `stage_id`, `in_commit`, `out_commit`, `budget_stats`, `policy_decision_id`.
5. **EgressReceipt (if any network egress):** Destination class labels, counts, bytes, block/allow events, halt events (if triggered).
6. **Shard/Tier Manifest (if multi-performer sharing):** Scope token(s), shard IDs, commitments, TTLs, disclosure budgets.
7. **Conformance Test Report:** Interface compliance, determinism checks, and negative test results.

### 1.5 Determinism & Reproducibility

Given identical `ReplayToken` and `DatasetSnapshot`, the component must reproduce identical `MetricReport` values (within tolerance), identical `ProofObject` commitments, and identical `WitnessChain` structure (stage IDs and ordering). Any non-deterministic behavior must be declared and bounded (e.g., stochastic but seed-controlled).

### 1.6 Budgeting & Guardrails (Evaluator-controlled)

Evaluator may set budgets in `RunConfig`: `max_runtime`, `max_memory`, `max_edges/expansions`, `max_egress_bytes`, `max_calls_per_endpoint`, `rate_limits`. Components must enforce budgets, report usage in the `WitnessChain`, and halt gracefully with partial artifacts that include an explicit halt reason when a budget is exceeded.

### 1.7 Conformance Suite (required)

Performer provides an IDL/OpenAPI spec and golden conformance tests covering endpoint presence, schema validation, version negotiation, determinism (repeat run), budget enforcement, and negative cases (invalid token/scope, over-budget, disallowed egress). Include a synthetic smoke dataset for evaluator bring-up.

### 1.8 Proprietary Elements Treatment

Proprietary components must be isolated behind declared interface boundaries. Provide an evaluator stub when needed, and record the boundary and insertion points in the Capability Manifest as “proprietary boundary.”

### 1.9 Verification Workflow (Evaluator)

1. Run component via Control Plane API.
2. Retrieve the Evaluation Artifact Bundle.
3. Verify `ProofObject`, `WitnessChain`, and optional attestation quote.
4. Validate conformance report and determinism rerun.
5. Score metrics; archive the bundle and replay token.

## 2. Portfolio-Efficient Filing Plan

### 2.1 Strategy

Use one core family with two continuation branches to maximize claim coverage while preserving unity/cohesion. The shared spine across **IEAP + VCEC + MPEP** is an evaluator-executable deterministic component that emits proof objects.

### 2.2 Core Independent Claim Set

- **Method:** Compile/serve an evaluator-executable component implementing a versioned evaluator interface; execute under a determinism token; output metrics, a proof object, and a replay token.
- **System:** Processors and memory implementing the method.
- **CRM:** Medium storing instructions implementing the method.

#### Core Dependents (covering IEAP/VCEC/MPEP primitives)

- Interface version negotiation and conformance tests.
- Witness chain with per-stage commitments.
- Budget enforcement and graceful halt artifact.
- Transparency log of digests.
- Optional TEE attestation binding run digest.
- Egress receipt generation and compliance decision.
- Output partitioning into shards per scope token.

### 2.3 Continuation 1 (OA/MOSA Branch)

Machine-generated ICD + rights assertions + insertion testing attached to the core by deriving the evaluator-executable component from an architecture spec that emits OA/MOSA artifacts.

**Dependent branches:**

- Generating versioned ICD/IDL from architecture specification.
- Producing conformance test suite for third-party plug-ins.
- Designating proprietary boundaries and open insertion points.
- Emitting rights assertion artifact mapping deliverables to asserted rights/markings.
- Technology insertion plan with counterfactual module replacement simulation.

### 2.4 Continuation 2 (Label Escrow Branch)

Escrowed labels and commitment manifests for evaluator scoring attached to the core by computing metrics/proofs against committed label bundles without revealing raw sensitive evidence.

**Dependent branches:**

- Label bundle and label manifest with Merkle proofs.
- Selective disclosure/redaction preserving verification hashes.
- Drift alarms on label distribution shifts.
- Counterfactual “remove feed/source” scoring deltas.
- Confidence bounds and noisy label handling.

### 2.5 Claim Dependency Map (checklist)

- **Reproducibility / Evaluator-run:** Replay token (core indep + dep), deterministic rerun requirement (dep), containerized evaluator bundle (dep).
- **Open Architecture / MOSA scoring:** ICD/IDL generation (continuation dep), conformance suite & plug-in ABI (continuation dep), proprietary boundary + insertion points (continuation dep), rights assertion artifact (continuation dep).
- **Governance & audit:** Witness chain (core dep), transparency log (core dep), attestation quote (core dep).
- **Multi-performer safe collaboration:** Scope tokens + shard manifests (core dep), egress receipts + halting (core dep).
- **Outcome-based benchmarking:** Label escrow + manifest verification (continuation dep), drift alarms + counterfactuals (continuation dep).

### 2.6 Filing Packaging Recommendation

- **P0 filing (core family):** Broad filing; include OA/MOSA and escrow elements as dependents to avoid unity friction.
- **CIP 1 (OA/MOSA):** Deepen ICD/rights/insertion/conformance embodiments with diagrams.
- **CIP 2 (Escrow/labels):** Deepen manifested labels, selective disclosure, and drift/counterfactual scoring embodiments.

## 3. FIG. 1–8 Captions and Drawing Notes

Use the following reference numerals across drawings: 100 (evaluation system), 110 (evaluator environment), 120 (performer component), 122 (interface adapter), 124 (stage pipeline), 126 (budget enforcer), 128 (policy/scope enforcer), 130 (determinism token manager), 140 (proof object generator), 150 (witness chain generator), 160 (transparency log client), 170 (attestation module), 180 (egress monitor), 190 (artifact bundle builder), 200 (dataset snapshot), 210 (input batch stream), 220 (metric contract), 230 (result set), 240 (metric report), 250 (proof object), 260 (witness chain), 270 (egress receipt), 280 (shard/tier manifest), 300 (OA/MOSA package generator), 310 (ICD/IDL), 320 (conformance test suite), 330 (proprietary boundary/insertion points), 340 (rights assertion artifact), 400 (label bundle), 410 (label manifest), 420 (selective disclosure policy), 430 (drift detector), 500 (cache), 600 (replay service/verifier).

### FIG. 1 — System architecture for evaluator-executable, deterministic assessment with proof objects

Depict an evaluation system **100** where evaluator environment **110** connects to performer component **120** via versioned interface **122**. Inside **120**, show modular stage pipeline **124**, determinism token manager **130**, budget enforcer **126**, proof object generator **140**, witness chain generator **150**, attestation module **170**, egress monitor **180**, and artifact bundle builder **190** producing result set **230**, metric report **240**, proof object **250**, witness chain **260**, and optional egress receipt **270**.

### FIG. 2 — Performer→Evaluator handoff protocol message sequence

Show a sequence diagram between evaluator environment **110** and performer component **120** covering registration, configuration, run initiation, status polling, results retrieval, artifact retrieval, and verification. Each call flows through versioned interface **122**, generating a replay token via determinism token manager **130** and commitments via proof object generator **140**.

### FIG. 3 — Determinism and replay binding for metrics and artifacts

Illustrate determinism token manager **130** generating a token from dataset **200**, seed, and version identifiers. Proof object generator **140** binds the token to metric report **240**, witness chain **260**, and result set **230**, enabling verifier **600** to reproduce or verify the evaluation using the same token.

### FIG. 4 — Proof object and witness chain structures with commitments and policy decisions

Diagram data structures where witness chain **260** contains stage identifier, input commitment, output commitment, budget usage, and policy decision identifier per record; proof object **250** includes Merkle commitment(s) and optional attestation quote from module **170**.

### FIG. 5 — Budgeting, egress monitoring, and graceful halt behavior

Depict budget enforcer **126** gating pipeline **124** and egress monitor **180** intercepting outbound calls. Show a branch to a HALT state on budget violations that still emits a partial artifact bundle **190** with a halt reason and egress receipt **270**.

### FIG. 6 — OA/MOSA package generation: ICD/IDL, conformance tests, proprietary boundaries, and rights assertions

Show OA/MOSA package generator **300** deriving an interface control document **310**, conformance test suite **320**, proprietary boundary and insertion point declaration **330**, and rights assertion artifact **340** from an architecture specification, all associated with performer component **120**.

### FIG. 7 — Label escrow and selective disclosure for evaluator scoring

Depict label bundle **400** and label manifest **410** governed by selective disclosure policy **420**. Evaluator environment **110** scores using manifest proofs without sensitive evidence, while drift detector **430** tracks label distribution shifts.

### FIG. 8 — Multi-performer evaluation plane: scope tokens, shard manifests, transparency log, and third-party verification

Illustrate policy enforcer **128** validating scope tokens to partition outputs into shards and generate shard/tier manifest **280**. Digests of proof object **250**, egress receipt **270**, and shard manifest **280** record via transparency log client **160** to an append-only log, enabling verifier **600** to validate without accessing unshared shards.
