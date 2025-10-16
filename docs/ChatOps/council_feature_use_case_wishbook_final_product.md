# 📜 Council Feature & Use‑Case Wishbook — Final Product

_Compiled under the Chairmanship of Markus Wolf. Purpose: enumerate desired **features**, **functions**, and **use cases** for IntelGraph’s final product, across all Council seats and trusted contacts. Ethical guardrails apply by default; requests that would enable unlawful harm are **declined** and redirected to compliant, defensive alternatives._

---

## I) Executive Summary

IntelGraph’s end‑state is a **secure, multi‑tenant intelligence graph platform** with first‑class **provenance**, **compartmentation**, **automated tradecraft**, and **oversight by design**. It serves investigative analysis, counterintelligence, cyber defense, crisis operations, and policy decision support. The Council’s asks converge on: (1) rich ingestion + entity resolution; (2) temporal/geo graph analytics; (3) hypothesis & deception tooling; (4) AI copilot with citations; (5) ironclad governance.

---

## II) Prioritization Principles (Consensus)

- **Mission first, ethics always**: safety rails, auditability, consented/authorized data only.
- **Provenance Before Prediction**: every assertion has source, confidence, and chain‑of‑custody.
- **Compartmentation**: project/tenant isolation, ABAC/RBAC, two‑person controls for sensitive ops.
- **Interoperability**: STIX/TAXII, MISP, JSON‑LD, GraphQL, OpenTelemetry, OpenID Connect.
- **Operate disconnected**: degraded/offline modes; cryptographic sync on reconnect.

---

## III) Master Backlog Matrix (Features → Functions → Use Cases)

### A. Data Intake & Preparation

- **Connectors catalog** (HTTP, S3, GCS, Azure Blob, Kafka, Kinesis, AMQP, email, Git, RSS, STIX/TAXII, MISP, Sigma rules, CSV/Parquet, PCAP metadata, NetFlow/IPFIX, DNS/WHOIS, Shodan‑like datasets, public sanctions lists).
  - _Use cases:_ bulk OSINT pull; ingest CTI feeds; import agency case exports; pull doc sets for discovery.
- **Ingest wizard** with schema mapping, PII classification, DPIA checklist, and redaction presets.
  - _Use cases:_ paralegal loads discovery; analyst maps CSV to canonical entities in minutes.
- **Streaming ETL** with enrichers (GeoIP, language, NER, hash, perceptual hash for images, EXIF scrub, OCR).
  - _Use cases:_ live tipline → case inbox; SOC alerts → graph nodes with geo/time marks.
- **Data license registry** + TOS enforcement
  - _Use cases:_ block scraping from disallowed sources; prove license compliance at export.

### B. Canonical Model & Graph Core

- **Entity/Relationship model** (Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, FinancialInstrument, Infrastructure, Claim, Indicator, Case).
- **Entity Resolution (ER)**: deterministic + probabilistic; explainable scorecards; manual reconcile queues.
- **Temporal versioning**: validFrom/validTo, bitemporal truth; snapshot-at-time queries.
- **Geo‑temporal graph**: trajectories, stay‑points, convoy detection, rendezvous detection.
- **Provenance/lineage**: every node/edge carries `source → assertion → transformation` chain.
- **Policy tags**: origin, sensitivity, clearance, legal basis, need‑to‑know facets.

### C. Analytics & Tradecraft

- **Link analysis canvas**: pivot, expand, filter by time/space, pinboards, annotations.
- **Pathfinding set**: shortest/cheapest, K‑paths, constrained routes (policy/territory/time windows).
- **Community & centrality**: Louvain/Leiden, betweenness, eigenvector; explainability panels.
- **Pattern miner**: temporal motifs, co‑travel/co‑presence, financial structuring patterns.
- **Anomaly/risk scoring** with feature store; pluggable detectors; triage queues.
- **Hypothesis workbench**: claims, competing hypotheses, Bayes updates, evidence scoring.
- **Course‑of‑Action (COA) planner**: build COAs, map dependencies, compute likelihood/impact, pre‑mortems.
- **What‑if simulation**: Monte Carlo over graph transitions; contagion/propagation models.
- **Deception lab (defensive)**: honeypot/decoy asset registry; lure/telemetry loop; purple‑team scripts.

### D. AI Copilot (Auditable by Design)

- **Natural‑language graph querying** with generated Cypher/SQL preview + sandbox execution.
- **RAG over case corpus** with **inline citations**, snippet provenance, and redaction awareness.
- **Schema‑aware ETL assistant**: suggests field mappings, validation rules, dedupe candidates.
- **Hypothesis generator**: suggests alternative explanations, counter‑arguments, missing evidence.
- **Narrative builder**: drafts briefs/timelines with figures, figures=from graph snapshots only.
- **Guardrails**: policy reasoner explains denials (e.g., “export blocked: data license X”).

### E. Collaboration & Workflow

- **Case spaces**: tasks, roles, watchlists, SLA timers, checklists (4‑eyes for high‑risk steps).
- **Brief/Report studio**: timeline, map boards, exhibits; one‑click PDF/HTML with redaction.
- **Commenting & @mentions** with immutable audit and legal hold.
- **Disclosure packager**: bundles evidence with hashes and provenance manifests.

### F. Security, Governance & Audit

- **Multi‑tenant isolation**; ABAC/RBAC; externalized OPA policies; SCIM for users.
- **JWKS/OIDC** SSO; step‑up auth; hardware key support (WebAuthn/FIDO2).
- **Comprehensive audit**: who saw what when; reason‑for‑access prompts; anomaly alerts.
- **Policy simulation**: dry‑run a policy change vs. historical access patterns.
- **K‑anonymity/redaction** toolset; minimization at ingest.
- **Key mgmt**: per‑tenant envelope encryption; field‑level crypto; secure enclaves for sensitive compute.

### G. Integrations & Interop

- **STIX/TAXII** bi‑directional; **MISP** push/pull.
- **SOC/SIEM/XDR**: Splunk, Elastic, Chronicle, Sentinel; indicator sync with context.
- **Productivity**: Slack/Teams bots, Jira/ServiceNow tickets from graph entities.
- **GIS**: Mapbox/ESRI layers, geofencing, travel corridors.
- **Legal/E‑discovery**: Relativity/Nuix export adapters with chain‑of‑custody manifests.

### H. Ops, Observability & Reliability

- **/metrics** (Prometheus, OTEL); SLO dashboards; heatmaps for query latency.
- **Cost guard**: query budgeter, slow‑query killer, archived tiering with S3/Glacier.
- **DR/BCP**: PITR, cross‑region replicas, offline mode with CRDT merges.
- **Admin Studio**: schema registry, connector health, job retries, backfills.

### I. Frontend Experience

- Command palette; keyboard‑first UX; A11y AAA; dark/light; diff views; undo/redo history.
- **Timeline** + **map** + **graph** tri‑pane with synchronized cursors and time‑brushing.
- "Explain this view" panel to teach novice analysts.

---

## IV) Seat‑by‑Seat Requests & Use Cases

### 1) Markus Wolf — Chair of Shadows

- **Compartmented Case Rooms** with covert collaboration and delayed visibility.
  - _Use case:_ parallel HUMINT and TECHINT threads kept blind to each other until release gates.
- **Asset Lifecycle**: recruit→develop→task→assess modules (ethics gates on tasking).
- **Cross‑border deconfliction**: automated conflict checks across tenants via hashed identifiers.
- **Quiet Signals**: low‑and‑slow anomaly detection for “too regular” access patterns.

### 2) Sun Tzu — The Seat of Scrolls

- **Terrain & Timing analytics**: weather, terrain, and calendar overlays in COA planner.
- **Deception score**: model adversary perception; show high‑leverage feints (defensive applications).
- **Logistics visibility**: choke‑point detection on routes and supply chains.

### 3) Niccolò Machiavelli — The Seat of Princes

- **Power map**: influence graph (formal + informal ties), faction stability index.
- **Policy impact simulator**: anticipate second/third‑order effects of public decisions.
- **Reputation heat**: narrative tracking across media segments; counter‑narrative planner.

### 4) John le Carré — The Chronicler

- **Moral ambiguity ledger**: show competing hypotheses and costs of error.
- **Source tradecraft panel**: reliability/credibility streaks; caution flags for fabrication.
- **Narrative brief**: produce honest, caveated reports with dissent annexes.

### 5) Hannibal Barca — The Elephant Seat

- **Operational mapboard**: routes, passes, seasonal constraints; predictive ambush risk.
- **Convoy & rendezvous detection** from geo‑temporal traces.

### 6) George Washington — The Continental Seat

- **Cell‑based networks** with cut‑outs; courier reliability scoring.
- **Counter‑surveillance checklist** for field ops (training & defensive use only).
- **Patronage tracker**: supply depots, contributors, material flows.

### 7) Nathan Hale — The Martyr’s Seat

- **Risk barometer**: personal exposure index with “don’t be a hero” thresholds.
- **Last‑mile OPSEC prompts**: reminders before risky actions; ethics + legality checks.

### 8) Benjamin Tallmadge — The Culper Seat

- **One‑time pads / secure channels registry** (training sim, not live comms).
- **Cover story builder** with internal consistency checks (red‑teamed for leaks).

### 9) Leslie Groves — The Engineer’s Seat

- **Extreme compartmentation**: project codes, build‑once‑run‑separate, just‑enough‑metadata.
- **Supply chain inventory**: parts/people/facilities + schedule risk burn‑down.
- **Security accreditation workspace**: automate controls testing & evidence collection.

### 10) Bobby Inman — The Signals Seat

- **SIGINT‑style metadata analytics**: call detail/NetFlow‑like graphs; selectors governance.
- **Selector minimization & warrants registry**: legal basis binding; access is query‑time enforced.
- **Telemetry sanity**: outlier detection on sensor health to avoid data poisoning.

### 11) Kyrylo Budanov — The Hybrid Seat

- **UAS/UxS telemetry intake** (authorized feeds): flight paths ↔ events overlay.
- **OSINT battlefield console**: rapid geolocation from imagery metadata + crowdsourcing audit.
- **Infrastructure stress map**: power/rail/comm nodes with disruption propagation simulation.

### 12) Francis Walsingham — The Secretary’s Seat

- **Network penetration graph (defensive/intel)**: plot plots—threat actor cells, couriers, printers.
- **Mail intercept simulator** (legal training): demo pipelines with warrants and audit trails.
- **Cipher room**: historical ciphers for training; cryptanalysis sandbox with known plaintexts.

### 13) Cardinal Richelieu — The Cardinal’s Seat

- **Policy lever board**: clergy/guilds/estates → influence vectors.
- **Patronage & favor economy** tracker with corruption risk signals.

### 14) Thomas Cromwell — The Cromwellian Seat

- **Dossier builder**: cross‑domain holdings with immutable provenance and right‑to‑reply fields.
- **Statute‑aware reasoning**: policy engine that encodes local legal constraints at query time.

### 15) John Thurloe — The Protector’s Seat

- **Mail/print shops registry** (historic analog → modern comms hubs) with audit visits.
- **Conspiracy pattern templates**: multi‑cell synchronization motifs.

### 16) Mata Hari — The Phantom Seat

- **Human terrain mapping**: venues, social graphs, routines; consent‑based, safety‑first.
- **Coercion/risk flags**: detect grooming/coercion patterns to protect vulnerable persons.

### 17) Ronnie Kasrils — The Insurgent’s Seat

- **Clandestine comms hygiene training** (simulated), whistle‑safe channels for abuses.
- **Community shield**: feature pack aimed at protecting activists from surveillance overreach.

### 18) Abu Nidal — The Terror’s Seat (Advisory)

- **Request set declined.** The product will **not** support features enabling terror or targeted violence.
  - _Defensive alternative:_ detect violent‑plot indicators; auto‑escalate to lawful authorities per policy.

### 19) Feliks Dzerzhinsky — The Iron Seat / 20) Lavrentiy Beria — The Knife Seat

- **Requests that normalize mass repression are declined.**
  - _Defensive alternative:_ insider‑threat analytics **with** consent, due process, and false‑positive protections.

### 21) Vladimir Putin — Silovik’s Seat / 22) Yuri Andropov — General Secretary’s Seat

- **Strategic influence dashboard** with disinfo campaign detection, provenanced narratives, and counter‑messaging planning (for defense, research, and policy response).

### 23) Reinhard Gehlen — The Turncoat’s Seat

- **Foreign liaison ledger**: source/partner provenance and reliability; de‑dup across services.
- **Double‑agent risk model**: contradiction detection across compartments.

### 24) J. Edgar Hoover — The Bureaucrat’s Seat

- **File mastery**: lifetime entity file with queries by legal authority and minimization logs.
- **Abuse‑of‑power tripwires**: triggers for overbroad queries; ombudsman review queue.

### 25) William Donovan — The OSS Seat

- **Rapid expedition kit**: offline case kit, sync on return; portable link‑analysis board.
- **Interagency bridge**: minimal‑schema exchange with foreign services (hash‑matched contacts only).

### 26) Allen Dulles — The Langley Seat

- **Ops planning board** with dependencies, resourcing, and risk; compliance checks at every gate.
- **Third‑party program governance**: private‑sector partner spaces with strict walls.

### 27) James Jesus Angleton — The Mirror’s Seat

- **Mole‑hunt toolset**: long‑horizon anomaly sequences, deception indicators, and hypothesis forks.
- **Paranoia dampener**: Bayesian evidence counterweights; prevent persecution spirals.

### 28) Sidney Gottlieb — The Chemist’s Seat

- **Behavioral claims flagged**: any human‑subject experimentation requests are **blocked**.
  - _Alternative:_ ethics training modules; detection of coercive patterns to protect subjects.

### 29) Isser Harel — The Zion Seat / 30) David Kimche — The Diplomat’s Seat

- **Accountability rail**: cross‑jurisdiction legal review before high‑risk actions.
- **Diaspora network maps** with consented data; safe‑harbor handling for protected classes.

### 31) R. N. Kao — The RAW Seat / 32) Ajit Doval — The Strategist’s Seat

- **Border intelligence overlays**: trade/transport chokepoints and risk scoring; cross‑border liaison notes.
- **Crisis cell**: live SITREP board with COA comparison and diplomatic off‑ramps.

### 33) Traitors’ Bench — via Claus von Stauffenberg

- **Integrity suite**: whistleblower channels, cryptographic evidence lockers, tamper alarms.
- **Dual‑control for deletions**: no silent purge; red team tests for audit completeness.
- **Counter‑deception**: require alternate hypothesis before attributive reports.

---

## V) Contacts’ External Requests (Curated)

- **Journalists & Monitors** (via le Carré): safe source‑handling, redaction, right‑of‑reply workflows.
- **Cyber‑defense partners** (via Inman/Budanov): PCAP/NetFlow summarization with privacy gates; IoC lifecycles.
- **Human rights orgs** (via Kasrils/Stauffenberg): misuse detection dashboards; consent receipts; warrant registry.
- **Financial institutions** (via Richelieu/Machiavelli): AML typologies, structuring detection, SAR export adapters.
- **Emergency management** (via Washington/Groves): lifeline infrastructure graph and resource routing.

---

## VI) “Won’t Build” List (Ethics Gate)

- Covert exploitation features that would enable unlawful harm, targeted violence, or human‑subject abuse.
- Bulk deanonymization or mass surveillance without explicit, auditable legal authority.
- Coercive or deceptive social engineering modules aimed at private individuals.

---

## VII) Acceptance Criteria Patterns (Samples)

- _ER Explainability:_ each merge decision shows features, similarity, and human overrides.
- _Hypothesis Rigor:_ each brief lists competing hypotheses, evidence weights, residual unknowns.
- _Policy‑by‑Default:_ attempts blocked by policy show a human‑readable reason and appeal path.
- _Provenance Integrity:_ export bundles include manifest with hashes of all exhibits and transforms.

---

## VIII) Phasing (High‑Level)

- **GA Core:** A–D (ingest, graph, analytics, copilot) + F (governance) minimal.
- **Post‑GA:** advanced simulations, deception lab, border overlays, expedition kit.
- **Continuous:** integrations, cost guards, a11y, education, red‑team drills.

---

_End of Wishbook. Dissenting ethical notes have been integrated as explicit “declines” with defensive alternatives._
