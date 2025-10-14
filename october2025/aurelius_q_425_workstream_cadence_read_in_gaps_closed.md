# AURELIUS — Q4’25 Workstream & Cadence (Read‑In + Gaps Closed)

**Scope of read‑in**: Local zips reviewed (`summit-main` repo snapshot; October 2025 pack) including: `docker-compose.yml` (Postgres, Neo4j, Redis, OPA, OTEL, API @4000, UI @3000, Worker @4100), Makefile golden‑path targets, and sprint/cadence docs in the October pack (Q4’25 cadence lock; security/edge/data governance sprints). The plan below integrates with those anchors.

---

## 1) Mission Decomposition (AURELIUS Workstream)

**Mission**: Ship a *Policy‑Provenance Fabric* and *Eval/Assurance Harness* that (a) enforces ABAC/OPA consistently across API/UI/Workers, (b) notarizes critical events to a tamper‑evident provenance ledger, and (c) provides measurable safety/quality signals (evals, red‑team, SLAs). This becomes a defensible IP surface + compliance accelerator.

**Why now**: The stack already includes OPA, OTEL, Neo4j, Redis, Postgres, Graph API, worker pool, and a Golden Path. October sprints prioritize security/governance/edge hardening—AURELIUS converts those into *algorithmic* and *protocol* moats with measurable advantages.

**Objectives (Q4’25)**
- **Unified Policy Plane**: Request‑time ABAC with OPA/Rego + usage‑justification + step‑up auth hooks; cached policy decisions with audit proofs.
- **Prov‑Ledger v1**: Append‑only, hash‑chained, Merkle‑anchored event ledger with selective disclosure (PII‑safe), cross‑store attestation (PG/Neo4j/Blob).
- **Assurance Harness**: Evals for:*authz correctness*, *graph query safety*, *RAG provenance*, *cost/latency SLOs*; seeded canaries & chaos.
- **Golden‑Path Guardrails**: `make smoke` extended to verify policy/ledger/evals. CI gates on SLO/eval budgets.

KPIs: p95 authz decision < **12ms**; ledger write < **15ms** (local), < **35ms** (edge); false‑negative policy rate **=0** (on suite); provenance coverage **>95%** of privileged ops; red‑team escape rate **<1%** per release.

---

## 2) Novelty Hunt Plan (hypotheses)

- **H1 — Zero‑Copy Policy Proofs**: Embed *decision receipts* (OPA input hash + policy version + Merkle path) into trace context → *verifiable* down‑stream actions.
- **H2 — Dual‑Graph Attestation**: Cross‑check entity/edge mutations (Postgres write set ↔ Neo4j subgraph) with succinct proofs; reject on divergence.
- **H3 — Selective Disclosure Ledger**: Range proofs + salt/pepper strategy enabling audit without sensitive payload exfiltration.
- **H4 — E2E Safety Evals for Graph‑AI**: Synthetic datasets + attack taxonomies (prompt injection, graph traversal exfil, entity conflation) → standardized “GraphAI‑SAFETY‑v0”.
- **H5 — Cache‑Coherent ABAC**: Edge cache of allow/deny with revocation windows + key‑grace; formalize stale‑read safety bounds.

Success if ≥2 of the above demonstrate measurable deltas and patentable claims.

---

## 3) Prior‑Art Shortlist (delta notes)

> Tracked in `/ip/prior_art.csv` (to be committed). High‑level buckets:

- OPA/Rego ABAC patterns (engineering, not protocol‑grade receipts). **Delta**: signed decision‑receipts + trace‑binding.
- Tamper‑evident logs (AWS QLDB, immudb, Sigstore/Rekor). **Delta**: *selective disclosure* for mixed PG/Neo4j ops + graph‑aware sealing.
- Graph provenance (W3C PROV, Neo4j APOC). **Delta**: cryptographic linking across OLTP + GDB + object store, with audit queries.
- LLM eval harnesses (HELM, RAGAS, LangChain evals). **Delta**: *GraphAI‑specific* jailbreak/poisoning/PII‑leak tests + cost/latency budgets as first‑class gates.

---

## 4) Architecture Sketch

```
[Client/UI]───┐              ┌─────[OPA/Policy]───[Rego bundles]
               ├─HTTP/gRPC──▶│[API@4000]───┬───▶[PG]
[Workers@4100]─┘             │             └───▶[Neo4j]
                               │  ▲
                               │  │(decision receipt: {input_hash, policy_ver, allow, sig, merkle_path})
                               ▼  │
                         [Prov‑Ledger svc]──▶[Append‑only store + Merkle anchor + blob]
                               │
                            [OTEL/Trace]  (receipts, audit ids)
```

**Key flows**
- *AuthZ*: API/Worker calls `opa_decide()` → receives allow/deny + signed receipt → attach to OTEL span + persist minimal receipt to ledger for privileged ops.
- *Ledger*: Batched writes (micro‑Merkle) → anchored per N ops; anchor hash emitted to traces & optional external notary.
- *Dual‑graph attestation*: After mutation, compute digests for PG rows + Neo4j subgraph; ledger records both digests and linkage.
- *Selective disclosure*: Auditors query receipts + digests; payloads fetched only via scoped rehydration.

---

## 5) Experiment Plan

**Datasets**: Synthetic investigation graphs (1e5 nodes/5e5 edges), seeded PII fields; mutation streams; adversarial prompts & traversal probes.

**Metrics**
- Latency: p50/p95/p99 for authz, ledger commit, read amplification (UI/API/Worker paths).
- Correctness: policy oracle agreement, dual‑graph divergence rate, ledger tamper detect rate.
- Safety: jailbreak success, PII leak rate, prompt‑injection capture.
- Cost: CPU‑ms/op, storage bytes/op, dollars/op under target infra.

**Ablations**: receipts on/off; cache TTL; batch size; anchor cadence; selective disclosure enabled/disabled.

**CI Hooks**: `make smoke` invokes `./assurance/run_evals.sh` + latency taps; PRs blocked if budgets breached.

---

## 6) Patent Angles (candidate claims)

1. **Method**: Generating cryptographically verifiable policy decision receipts bound to trace context and persisting only minimal attestations to a ledger while enabling selective disclosure.
2. **System/CRM**: A runtime that cross‑attests OLTP and graph mutations using digest pairs and rejects on divergence beyond a tunable bound.
3. **Dependent**: cache‑coherent ABAC with revocation windows; micro‑Merkle anchoring; graph‑scoped redaction; eval‑gated deployment; privacy‑preserving audits.

Artifacts: `/ip/draft_spec.md`, `/ip/claims.md`, `/ip/figs/*.drawio`.

---

## 7) Commercialization Hooks

- **Licensable units**: Policy‑Receipt SDK; Prov‑Ledger service; GraphAI‑SAFETY eval suite; OTEL policy‑enricher; audit workbench.
- **Targets**: Gov, fin‑crime, trust & safety, cyber threat intel, healthcare; SSO/standards tie‑ins (W3C PROV, OpenTelemetry, CNCF policy WG).
- **Pricing**: per‑seat (audit), per‑op (receipt/ledger), per‑eval‑run; OEM runtime for partners.

---

## 8) Risks & Mitigations

- **Perf regressions**: Receipts/ledger add overhead → mitigate via micro‑Merkle batching, async commit, edge caches.
- **Key management**: Receipt signing/rotation → HSM or KMS integration + attest bundles versioned.
- **Data privacy**: Ledger payloads → minimal fields + salts + field‑level encryption + purge hooks.
- **Adoption friction**: Developer DX → thin SDKs, code‑mods, golden‑path demos + smoke.

---

## 9) Delivery Plan & Milestones (two sprints + cadence)

**Sprint A (2 weeks)** — *Policy Receipts & Harness Bootstrap*
- [ ] Policy Receipt library (`/policy/receipt`): input hashing, signing, OTEL span enricher.
- [ ] API integration: wrap authz calls; attach receipts to privileged ops; unit & load tests.
- [ ] Assurance Harness v0: latency taps; policy oracle tests; seed synthetic datasets.
- [ ] CI: add `assurance` job; budgets: authz p95<12ms, ledger off.
- [ ] Docs: Golden Path addendum; examples; runbooks.

**Sprint B (2 weeks)** — *Prov‑Ledger v1 & Dual‑Graph Attestation*
- [ ] Prov‑Ledger service: append‑only store, micro‑Merkle, anchor endpoint, selective disclosure API.
- [ ] API/Worker emit ledger entries for privileged ops; batch & anchor.
- [ ] Dual‑graph digests for CRUD; divergence detection; kill‑switch.
- [ ] CI budgets: ledger p95<15ms local; divergence rate 0% on suite.
- [ ] Red‑team pack v0 (GraphAI‑SAFETY): traversal exfil, prompt injection, entity conflation tests.

**Cadence (fits your Q4 lock)**
- **Daily**: AURELIUS stand‑up note (yesterday/today/blockers/risks + KPI deltas).
- **Weekly**: Portfolio/Risk update with eval/latency charts; FTO/IP delta; policy/ledger adoption.
- **Monthly**: Strategy/metrics: adoption %, SLOs, cost/unit; release notes; customer‑ready demo.
- **Release gate**: Canary + rollback criteria tied to assurance budgets + policy coverage.

---

## 10) Integration Contract (defaults)

- **Lang/Packaging**: Python 3.11 SDK + Node bindings; Apache‑2.0 only. Wheels via manylinux; npm pkg.
- **CI**: GH Actions matrix; provenance (SLSA), SBOM (SPDX), cosign on images; JSONL telemetry.
- **Interfaces**: `POST /receipts/anchor`, `GET /receipts/:id`, `POST /digests`, `GET /audit/query`.
- **Telemetry**: OTEL spans tagged: `authz.receipt_hash`, `policy.version`, `ledger.anchor_hash`.

---

## 11) Gap Closure vs Existing Sprints

**Found gaps**
- *Decision verifiability*: current OPA use lacks *receipts*; add cryptographic proof path.
- *Cross‑store integrity*: no formal digest/attestation between PG↔Neo4j after mutations.
- *Provenance coverage*: privileged ops not universally notarized; add minimal, privacy‑safe ledger.
- *Release gating*: eval/latency budgets partially defined; make them blocking in CI.
- *Threat‑model depth*: GraphAI‑specific jailbreaks/exfil not in standard suites; add targeted pack.

**Remediations (this plan)** provide concrete services, SDKs, and CI wiring to turn the governance aspirations into mechanical guarantees.

---

## 12) Repro Pack Tree (to be added to repo)

```
/design/
/spec/   (Rego policies, receipt spec, ledger API)
/impl/   (python sdk, node bindings, ledger svc)
/experiments/ (configs, datasets, scripts)
/benchmark/   (latency+cost harness)
/ip/      (draft_spec.md, claims.md, prior_art.csv, fto.md)
/compliance/ (LICENSES, SBOM, SLSA, data governance)
/integration/ (API stubs, SDK examples, PR plan)
```

---

## 13) Next‑Steps Kanban (time‑boxed)

- [ ] T+0: Wire AURELIUS workspace; create `/impl/policy-receipt` scaffold; smoke tests (Day 1–2).
- [ ] T+3: API integration behind feature flag; latency bench; CI job (Day 3–5).
- [ ] T+7: Prov‑Ledger MVP; micro‑Merkle; anchor; OTEL enricher (Week 2).
- [ ] T+10: Dual‑graph digests; divergence kill‑switch; evals v0 (Week 3).
- [ ] T+14: CI gates live; red‑team pack v0; release notes & demo (Week 4).

---

### Appendices

- **Data governance**: PII scanners + field policy tags; retention/purge hooks; dual‑control deletes; audit evidence export.
- **Safety**: rate‑limiters, policy backoff, anomaly alerts; privacy budgets for eval corpora; governance hooks.
- **Inventorship log**: kept under `/ip/logs/aurelius_lab_notes.md` (timestamps, diffs, seeds).

