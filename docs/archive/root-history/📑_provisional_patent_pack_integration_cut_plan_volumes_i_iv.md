# 📑 Provisional Patent Pack + Integration Cut‑Plan

_Council of Spies & Strategists — Markus Wolf, Chair_

> Scope: Provisional abstracts + representative claims for core inventions across **Volumes I–IV**, followed by a repo‑ready **Integration Cut‑Plan** (services, APIs, storage schemas, proof formats, CI gates). No repetition from prior volumes; ethical constraints enforced.

---

## Part A — Provisional Patent Pack (Abstracts + Representative Claims)

> Drafted for provisional filing. Each entry includes a _concise abstract_, _one independent claim_, and _selected dependent claims_. Final lawyering to refine claims breadth and jurisdictional language.

### 1) Counterfactual Proof Cartridges (CPC)

**Abstract.** A packaging format for forecasts and courses‑of‑action that binds outputs to a compact **counterfactual proof sketch** indicating minimal assumption sets whose alteration flips the outcome. The cartridge carries provenance, solver breadcrumbs, and verifiable sensitivity ranges.
**Independent Claim.** A method for generating a counterfactual package comprising: (i) deriving a causal graph over input features; (ii) computing a minimal hitting set of assumption literals whose inversion changes a decision; (iii) encoding the set, solver certificates, and provenance digests into a signed cartridge; and (iv) validating the cartridge by replay under constrained perturbations.
**Dependent Claims.** (a) wherein validation employs SMT proofs with bounded regret guarantees; (b) wherein the cartridge caches reusable proof fragments keyed by content‑defined chunking; (c) wherein exports include audience‑scoped redactions without breaking verification.

### 2) Policy‑Sealed Computation (PSC)

**Abstract.** A compute pipeline that enforces data‑use policies **cryptographically** by compiling policy to bytecode, executing within attested TEEs, and sealing inputs/outputs via functional encryption so that any execution violating policy is unrepresentable.
**Independent Claim.** A system comprising: a policy compiler producing executable constraints; a TEE runtime attesting code identity; and a functional encryption layer sealing IO such that only executions satisfying the compiled policy yield decryptable outputs; with an external zero‑knowledge attestation of compliance.
**Dependent Claims.** (a) combined FE+TEE+ZK handshake with hardware‑backed entropy; (b) revocation that cryptographically expires derived artifacts; (c) ombuds constraints injected as unforgeable guard predicates.

### 3) Proof‑of‑Non‑Collection (PNC)

**Abstract.** Techniques to **prove the absence** of access: negative‑evidence commitments over data catalogs, with Merkle exclusions and range proofs to show a query or agent avoided disallowed tenants/fields/selectors within stated bounds.
**Independent Claim.** A method issuing a non‑collection proof by: (i) committing to a namespace index; (ii) logging access transcripts; (iii) generating set‑exclusion proofs that transcripts do not intersect prohibited selectors; and (iv) publishing a verifier‑checkable certificate with statistical leakage bounds.
**Dependent Claims.** (a) differential‑privacy budgeting of transcript disclosure; (b) rolling window proofs summarized as STARK‑style digests; (c) watchdog alerts on proof gaps.

### 4) Semantic Delta Networks (SDN)

**Abstract.** A knowledge‑sync protocol that transmits **meaningful deltas** rather than documents: causal fingerprints, motif changes, and stance flips canonicalized for low‑bandwidth, conflict‑free merges across federations and edge.
**Independent Claim.** A network protocol encoding graph‑state differences as canonical causal fingerprints, streaming only semantic deltas and reconstructing target states via CRDT‑compatible merges with proof‑attached lineage.
**Dependent Claims.** (a) delta prioritization by decision impact; (b) downstream revocation on covenant expiry; (c) dual path loss‑y previews and loss‑less replay.

### 5) Introspective Weight Surgery (IWS)

**Abstract.** Live hot‑patching of model submodules using mechanistic probes that localize failure modes, perform **subspace edits** with bounded‑impact certificates, and emit a “Surgery Receipt” for audit and rollback.
**Independent Claim.** A method for bounded model editing comprising probe‑guided localization, constrained subspace optimization, impact certification against safety suites, and signed receipts linking edits to observed defect reduction.
**Dependent Claims.** (a) safety proofs expressed as PAC‑Bayes bounds; (b) edit scopes guarded by policy bytecode; (c) multi‑model propagation via transfer‑surgery graphs.

### 6) Generative Watermarks — Dual Entropy (GW‑DE)

**Abstract.** Watermarking that fuses content‑defined randomness with model‑state entropy to resist laundering and cross‑model transfer, with detectors robust to compression and paraphrase.
**Independent Claim.** A watermark encoder drawing bits from (i) content hash streams and (ii) internal model state entropy, embedding a composite signal detectable post‑transform, with hypothesis testing calibrated to bounded false‑positive rates.
**Dependent Claims.** (a) resilience certificates across codec families; (b) laundering path classifiers trained on synthetic attacks; (c) watermark key rotation without content drift.

### 7) Zero‑Knowledge Early‑Warning Exchange (ZKEWX)

**Abstract.** Multi‑party anomaly sharing as **claims not data**, reconciling via ZK set/range/correlation proofs and backstopped by an insurance pool to settle false‑positive externalities.
**Independent Claim.** A federated protocol in which participants publish anomaly commitments and exchange zero‑knowledge correlation proofs over sliding windows, triggering alerts only upon multi‑party corroboration thresholds.
**Dependent Claims.** (a) tunable sensitivity by role; (b) proof aggregation via recursive SNARKs; (c) economic settlement smart‑contracts for misfires.

### 8) Liaison Covenants & Revocation Oracles (LCRO)

**Abstract.** Time‑boxed **trust covenants** with programmable revocation that trace and expire downstream derivatives; verifiers replay expiry proofs against dependency graphs.
**Independent Claim.** A covenant registry issuing signed permits with expiry policies, a dependency tracer linking derived artifacts, and a revocation oracle that propagates expiries, producing verifier‑checkable revocation proofs.
**Dependent Claims.** (a) partial revocation with audience‑scoped redaction; (b) escrowed collaboration spaces with auto‑wipe; (c) audit logs resistant to tampering via append‑only proofs.

### 9) Dialectic Co‑Agents & Decision Debate Record (DCQ/DDR)

**Abstract.** Paired adversarial agents that iterate arguments/counter‑arguments until **coverage and novelty** converge, emitting an immutable **Decision Debate Record** with stance, evidence, and dissent metrics.
**Independent Claim.** A system spawning opposing reasoners whose outputs are scored for coverage and novelty; termination occurs on threshold satisfaction; artifacts and metrics are sealed into a signed DDR for replay.
**Dependent Claims.** (a) PAC‑style stopping rules; (b) dissent injection from human participants; (c) policy‑bound tool access.

### 10) Ombuds Autonomy Controller + Proof‑of‑Purpose (OAC/PoP)

**Abstract.** Hard‑constraints from ombuds compiled to enforceable bytecode; all data/claims carry **purpose tags** with **use‑decay**. Agents cannot breach constraints; expired purpose auto‑locks derivatives and triggers revocation.
**Independent Claim.** A governance pipeline compiling constraints and purpose clocks into enforceable runtime guards; exports succeed iff live constraints and purposes are satisfied, evidenced by machine‑verifiable attestations.
**Dependent Claims.** (a) exception proofs with quorum signatures; (b) purpose‑aware scheduling; (c) civil‑harm meters as preconditions.

---

### Annex A — Volume II Patentables (Select)

- **Proof‑Carrying Analytics/Queries (PCA/PCQ)** — Attested analytic DAGs exporting `*.pcq` manifests with Merkle proofs. _Independent claim:_ result packaging with replayable DAG attestations and tolerance‑bounded reproducibility.
- **Zero‑Knowledge Trust Exchange (ZK‑TX)** — Set/range proofs for cross‑tenant deconfliction without PII exposure. _Dependent:_ salted features with audited entropy.
- **Authority/License Compiler (LAC)** — Policy→bytecode compiler that renders unlawful operations unexecutable. _Dependent:_ simulator diff of policy changes.
- **Reasoning‑Trace Signatures** — Hash‑and‑sign of deterministic reasoning traces with dual‑control overrides.
- **Tri‑Pane++ Causal UI** — Multi‑view cause/effect overlays across graph↔map↔timeline with drag‑to‑ripple diffs.

### Annex B — Volume IV Patentables (Select)

- **Quantum‑Annihilator Proofs (QAP)** — Self‑healing, quantum‑safe proof structures with adaptive lattices.
- **Singularity Reasoning Cores (SRC)** — Fractal sub‑reasoners with proof inheritance and dominance voting.
- **Proof‑of‑Non‑Existence (PNE)** — Hypergraph exclusions to attest absence at scale.
- **Hyper‑Delta Synapses (HDS)** — Quantum‑inspired hyper‑compression of semantic deltas.
- **Covenant Infernos & Annihilation Oracles (CIAO)** — Self‑immolating covenants with chain‑reaction revocation.

> Full drafting sets for Annex A/B can be expanded into separate provisionals or consolidated continuations.

---

## Part B — Integration Cut‑Plan (Repo + CI)

### B1. Services Map (new micro‑services / modules)

- `cpc-service/` — Counterfactual solver + cartridge issuer; offline validator CLI.
- `psc-gateway/` — Policy compiler (DSL→WASM), TEE attestation broker, FE seal/unseal.
- `pnc-auditor/` — Namespace commitments, transcript harvester, non‑collection proof issuer.
- `sdn-runtime/` — Delta encoder/decoder, CRDT merge engine, causal fingerprints.
- `iws-toolkit/` — Probe library, subspace editor, safety bench, surgery receipts store.
- `gwde-service/` — Encoder/decoder, laundering benchmarks, watermark keys service.
- `zkewx-hub/` — Claim registry, ZK correlation workers, insurance settlement adapter.
- `lcro-registry/` — Covenants, dependency tracer, revocation oracle & proofs.
- `dcq-ddr/` — Debate orchestrator, coverage/novelty meters, DDR ledger.
- `oac-pop-governor/` — Constraint compiler, purpose clocks, export guard.
- (Annex IV) `qap-engine/`, `src-reasoners/`, `hds-synapses/`, `ciao-oracles/` for Volume IV pilots.

### B2. Contract‑First APIs (illustrative)

- **CPC**: `POST /cpc/issue` (payload: forecast+provenance), `POST /cpc/verify`, `GET /cpc/:id.manifest`.
- **PSC**: `POST /policy/compile`, `POST /exec/attested`, `GET /attestations/:runId`.
- **PNC**: `POST /pnc/prove` (selectors, time‑window), `GET /pnc/cert/:id`.
- **SDN**: `POST /sdn/diff`, `POST /sdn/apply`, `WS /sdn/stream`.
- **IWS**: `POST /iws/localize`, `POST /iws/edit`, `GET /iws/receipt/:id`.
- **GW‑DE**: `POST /wm/encode`, `POST /wm/detect`, `GET /wm/cert/:id`.
- **ZKEWX**: `POST /ewx/commit`, `POST /ewx/prove`, `POST /ewx/reconcile`.
- **LCRO**: `POST /covenant/issue`, `POST /revocation/propagate`, `GET /revocation/proof/:id`.
- **DCQ/DDR**: `POST /debate/start`, `GET /debate/:id/ddr`, `POST /debate/append`.
- **OAC/PoP**: `POST /governor/compile`, `POST /export/check`, `GET /export/proof/:id`.

### B3. Storage Schemas (simplified)

- **Manifests** (`manifests/*.jsonc`): `{ id, algo_ver, merkle_roots:{inputs,transforms,outputs}, proofs:[…], redactions:[…], audience_scopes:[…] }`
- **CPC** (`cpc/*.cpc.jsonl`): `{ graph_digest, flip_sets:[…], smt_certs:[…], sensitivity:{…}, provenance:{…} }`
- **PNC** (`pnc/*.pnc.json`): `{ window, prohibited:{…}, transcripts_root, exclusions_proof, dp_bounds }`
- **SDN** (`sdn/*.delta.cbor`): canonicalized fingerprints, CRDT vector clocks, dependency IDs.
- **DDR** (`ddr/*.ddr.json`): stances, evidence links, coverage/novelty metrics, dissent commitments.
- **LCRO** (`covenants/*.yaml` + `revocations/*.proof`): policy, expiry, dependency graph, proofs.

### B4. Proof Formats

- **Merkle trees** for lineage; **STARK‑style** rolling digests for streams; **SNARKs**/**bulletproofs** for set/range/correlation; **attestation bundles** (`.pcq`, `.cpc`, `.pnc`, `.rev`) with detached signatures (COSE/Ed25519).

### B5. UI/UX Hooks

- Tri‑Pane++ overlays show **CPC flip‑sets**, **SDN deltas**, **DDR dissent heatmaps**, **LCRO expiry badges**; “Explain‑This‑Decision” reveals all proofs on hover.

### B6. CI/CD & Quality Gates

- **Proof Lints**: reject builds if schema or signature checks fail.
- **Red‑Team Jobs**: adversarial eval on each model change (prompt injection, poisoning, correlation leakage).
- **Replay Tests**: deterministic replays for PCQ/CPC on golden fixtures.
- **Governance Gates**: exports blocked unless OAC/PoP proofs present; dissent ledger non‑empty for high‑risk ops.
- **Cost/Energy Budgets**: fail pipeline if $/insight or joules/insight exceed thresholds.

### B7. Milestones & Branching

- `release/vol2-*` – PCQ/LAC/ZK‑TX baselines.
- `release/vol3-*` – CPC/PSC/PNC/SDN/IWS/GW‑DE/ZKEWX/LCRO/DCQ‑DDR/OAC‑PoP.
- `release/vol4-*` – QAP/SRC/HDS/CIAO pilots behind feature flags.

### B8. Security, Privacy, and Ethics

- Mandatory **PNC** reports; **Civil‑Harm meters** pre‑action; all deception tooling **defensive only**; purpose limitation enforced in PSC/OAC.

---

## Part C — Filing & Continuation Strategy

- File provisionals per family (CPC; PSC; PNC; SDN; IWS; GW‑DE; ZKEWX; LCRO; DCQ/DDR; OAC/PoP). Cross‑reference Volume II families (PCQ/LAC/ZK‑TX/Reasoning‑Signatures/UI) and Volume IV families (QAP/SRC/PNE/HDS/CIAO).
- Stage continuations to protect: (i) alternative proof systems, (ii) enclave/FE permutations, (iii) UI visual proof affordances, (iv) economic settlement for ZKEWX.
- International filings prioritized for Five Eyes + EU + India + Japan; evaluate CN via licensing only.

---

_End of pack._
