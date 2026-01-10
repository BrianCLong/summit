# IntelGraph Master Orchestration Blueprint (v12)

This blueprint operationalizes the IntelGraph threat intelligence and fraud risk orchestration program across ingestion, normalization, analytics, response, and compliance. It encodes the SLO, security, privacy, and cost guardrails required for production readiness while mapping to the 11 parallel execution epics.

## Platform Guardrails and KPIs

- **Latency SLOs**: API/GraphQL reads p95 ≤ 350 ms; writes p95 ≤ 700 ms; subscriptions p95 ≤ 250 ms. Graph operations: 1-hop ≤ 300 ms, 2–3 hops ≤ 1,200 ms. Ingest ≥ 1,000 ev/s per pod with p95 ≤ 100 ms.
- **Availability & Error Budgets**: 99.9% monthly availability with 0.1% error budget; alert at 50%/80% burn. Synthetic probes cover API, GraphQL, identity graph, enrichment, and queue lag.
- **Cost Controls**: Unit caps ≤ $0.10 / 1k ingested events and ≤ $2 / 1M GraphQL calls; cost-of-goods dashboards alert at 80% of monthly budget with automated throttling per connector.
- **Security & Privacy Defaults**: OIDC + JWKS SSO, ABAC via OPA, mTLS everywhere, field-level encryption with envelope keys, immutable provenance ledger, 365d standard retention, 30d PII retention unless legal hold, warrant/authority binding for sensitive reveals.
- **Data Residency & Purpose**: Residency labels enforced at ingest and during ER/analytics; purpose tags drive access and workflow routing.

## System Architecture

- **Control Plane**: Meta-orchestrator coordinates source onboarding, data contracts, schema versioning, and backout switches. OPA policies gate access, purpose, residency, and linkability. Provenance ledger signs all events and schema transitions.
- **Data Plane**:
  - **Ingest Layer**: Source registry + data contracts drive connector generation (S3/CSV, HTTP, webhook, bus). Quarantine and detonation paths protect malware-bearing feeds. Provenance attachments (signer/hash/time/claim) are enforced at source entry.
  - **Normalization Layer**: Canonical TI/fraud schema with IOC/entity maps, validators, confidence/severity scales, and purpose/residency labels. Schema linter and diff gate PRs; rollback playbook covers migration reversals.
  - **Entity Resolution Layer**: Blocking + similarity libraries, provenance-preserving merges, OPA-based residency/purpose gates, unmerge tooling, and audit trails for human-in-the-loop adjudication.
  - **Enrichment Layer**: DNS/WHOIS/passive DNS, GeoIP/ASN/Tor/VPN, malware verdicts, payment/banking signals, device fingerprints, and knowledge packs with cost and latency budgets plus vendor backout toggles.
  - **Analytics Layer**: Rule engine + supervised/unsupervised graph models, score fusion, explainability surfaces, precision/recall drift monitors, and abuse/adversarial red-team tests.
  - **Response Layer**: Alert schema, triage queues, workflow engine, evidence binder, takedown/blocking actions with safe-block simulator, rollback/grace modes, partner adapters, and audit trails.
  - **Intel Production Layer**: Claims model, citation engine, report authoring UI, export formats (PDF/JSON/STIX 2.1), redaction for multi-tenant sharing, and backout for report retraction.
- **Observability**: OpenTelemetry traces from ingest through response; Prometheus metrics for throughput, latency, freshness, ER precision/recall, detection lift, block FP rate, and cost burn; Grafana dashboards per epic with release-time evidence snapshots.
- **Data & Storage**: Neo4j for identity and threat graphs; Postgres for cases, workflow, and audit; Redis/Kafka for caching/streaming; immutability via append-only provenance chain.

## Epic-to-Artifact Execution Map

| Epic | Goal Alignment | Primary Artifacts | Backout/Controls |
| --- | --- | --- | --- |
| 1 — Sources & Intake | Governed source onboarding with lawful purpose | `sources.csv`, `contracts/*.json`, `tags.yaml`, `sop.md`, `retention.map`, `scoring.md`, `plan.md`, `holds.md`, `evidence/index.json`, `binding.yml`, `dpia.md`, `scan pipeline`, `golden/`, `costs.csv`, `backout.md`, `dashboards`, `change.md` | Feed disable switch + cost throttles |
| 2 — Canonical Model | Normalized schema for IOCs/entities | `entities.csv`, `ioc.yaml`, `validators/`, `scales.md`, `prov.yml`, `labels.yaml`, `schema-lint`, `maps/*.yaml`, `golden.cypher`, `rollback.md`, `docs/model`, dashboards | Schema rollback + PR linter gate |
| 3 — Entity Resolution | High-precision identity linking | `er.yml`, block/sim libs, `merge.cql`, HIL UI, `prov-merge.cql`, evals/monitors, rego gates, unmerge tool, audit cfg, `docs/er` | Unmerge + policy gate |
| 4 — Enrichment | Low-latency enrichment with cost control | `topo.md`, enrichers (dns/net/mal/pay/device), packs, `budgets.cfg`, dashboards, backout toggles, evidence packs, `docs/enrich` | Vendor disable + budget cap |
| 5 — Analytics & Detections | Explainable detections and scoring | `signals.yaml`, `models/`, `gds pipeline`, `rules/`, `fuse.md`, `xai/`, golden evals, `thresholds.md`, `cq.md`, drift dashboards, redteam, backout, `docs/detect` | Rule/model disable switches |
| 6 — Alerts & Case Mgmt | Actionable triage and audit trails | `alert.yaml`, queues UI, `case.sql`, workflow service, binder, collab UI, `escalate.md`, `comms.md`, timers dashboards, runbooks, privacy modes, backout, `docs/case` | Queue pause + SLA timers |
| 7 — Takedown & Blocking | Safe blocking and takedowns | `actions.md`, control plane, simulator, `rollback.md`, partner adapters, `anti-abuse.md`, export spec, comms templates, DR, audit cfg, dashboards, backout, `docs/takedown` | Soft-block + fast revert |
| 8 — Intel Production | Claims→evidence reporting | `claims.yaml`, intel editor, templates, citations, exporters, redaction cfg, review checklist, out-feeds, usage dashboards, backout, evidence packs, `docs/intel` | Report retract + tenancy gates |
| 9 — Compliance & Ethics | Lawful processing and minimization | `policy.md`, authority binding, DPIA cadence, rego rules, `rtbf.md`, records/retention, cross-border checks, transparency reports, audit chain, freeze, bundles, `docs/comp` | Freeze sensitive features |
| 10 — Customer Integrations | Verticalized integrations | blueprints, bridges, decision svc, hooks, XAI UI, `sla.md`, runbooks, case studies, ROI metrics, evidence packs, backout, `docs/verticals` | Disable risky hooks |
| 11 — Release & Evidence | Predictable releases with proofs | `cadence.md`, PDV jobs, training, signed evidence bundles, migration guides, KPI rollups, benchmarks, SLA boards, changelog automation, acceptance packs, EOL policy, freeze | Kill switch for detections |

## Operational Flows

1. **Source Onboarding**: Registry entry → contract validation → license/purpose tagging → retention/residency matrix → quarantine scans → golden feed sampling → provenance attach → ingestion with cost/throughput guardrails.
2. **Normalization & ER**: Source-to-canonical mapping templates apply validators; ER blocking + similarity compute candidates; OPA gates residency/purpose; provenance-preserving merge emits audit events; unmerge tooling enabled by immutable lineage.
3. **Enrichment**: Async fan-out per IOC/transaction with per-vendor latency/cost budgets, fallback caches, and automated vendor backout on SLO breach.
4. **Analytics & Detections**: Features logged to signal catalog; rule engine + models scored with score fusion; explainability paths attached; precision/recall drift dashboards track health with red-team adversarial suites.
5. **Response & Cases**: Alerts routed to triage queues by severity/purpose; workflow engine drives playbooks; evidence binder signs artifacts; takedown actions simulate then execute with rollback/grace modes; partner APIs invoked with audit trails.
6. **Intel Production**: Claims model ties evidence to narrative templates; citation engine enforces ≥95% evidence linkage; exports produce PDF/JSON/STIX 2.1 with redaction policies enforced per tenant.
7. **Release & Backout**: PDV smoke + SLO checks gate releases; changelog automation links tests and evidence; freeze/kill switches provide safe rollback across ingest, enrichment, analytics, and response layers.

## Testing, Observability, and Evidence

- **Tests**: Unit (validators, mapping templates, ER similarity), integration (ingest→normalize→ER→enrich), performance (ingest throughput, 1-hop/2-hop graph latency), adversarial red-team suites, and deterministic golden graph evaluations.
- **Observability**: End-to-end traces with provenance IDs, metrics for throughput/latency/freshness/precision/recall/cost burn, logs with warrant binding IDs, and dashboards for lag, drift, FP rate, and ROI.
- **Evidence Protocol**: Cryptographic manifests per epic, immutable audit chain entries for schema changes and actions, checksumed evidence/eval packs, and rollback drills recorded as artifacts.

## Rollout and Backout Strategy

- **Progressive Delivery**: Canary per connector and per detection rule/model; feature flags for enrichment vendors, rules, and workflows; rate-limiters aligned to cost budgets.
- **Backout**: Feed disable switches, schema rollback scripts, ER unmerge, vendor disable toggles, rule/model/queue pause controls, takedown soft-block/grace modes, and freeze switches for sensitive features.
- **Post-Deploy Validation**: PDV jobs validate ingest SLOs, graph latency, detection lift on golden slices, and case workflow integrity; any SLO or cost violation triggers automated rollback.

## Forward-Leaning Enhancements

- **Cost- and SLO-Aware Orchestrator**: Multi-armed bandit routing across enrichment providers to minimize cost while meeting latency/quality targets; supports per-tenant policy and residency constraints.
- **Provable ER & Detections**: Zero-knowledge-friendly provenance attestations for merges and detections so that sensitive attributes remain hidden while enabling audit.
- **Adaptive Risk Sandboxes**: WASM-based policy evaluation for takedown simulations, enabling rapid partner-specific safety checks without redeploys.

