# AI-Era OSINT + Contested ISR Tradecraft Platform

## Capability Map: AI-Era OSINT + Contested ISR Tradecraft Evolution (v1)

### Mission outcome

**Fast, scalable, deception-resilient intelligence production** that treats OSINT as “INT of first resort,” fuses it with classified ISR, and preserves analytic integrity under AI-generated noise and adversary counter-collection. ([ODNI][1])

---

## A. Operating model (org + roles)

### 1) Enterprise OSINT & AI Enablement Cell (hub)

**Owns standards + platforms + training + evaluation** across the enterprise.

* **Open Data Acquisition & Sharing** (contracts, licensing, data partnerships, dissemination controls) ([ODNI][1])
* **Collection Management for OSINT** (requirements, tasking, priority alignment, “open sensors” coverage) ([ODNI][1])
* **AI/Automation Integration** (triage, enrichment, translation, entity extraction, multimedia forensics, search) ([ODNI][1])
* **Tradecraft Standards & Workforce** (common standards, refresh cadence, training paths) ([CIA][5])
* **Provenance & Sourcing Compliance** (citation conventions, audit readiness, retention rules) ([ODNI][3])

### 2) Mission “Fusion Pods” (spokes)

Cross-functional teams aligned to targets/problems, using the hub’s tooling and standards:

* OSINT collectors + all-source analysts + data/AI engineers + forensics + red team liaison
* Output: assessments + datasets + evidence bundles ready for downstream consumers

---

## B. Skill taxonomy (workforce literacy → mastery)

### Tier 0 — Baseline (everyone)

* “AI-literate” operating hygiene: prompt discipline, model limits, hallucination awareness, secure use
* “OSINT-literate” sourcing: credibility assessment, chain-of-custody mindset, licensing/ethics basics ([ODNI][1])

### Tier 1 — Practitioners (most analysts/collectors)

* OSINT collection planning + hypothesis-driven search
* Verification basics: cross-source corroboration, temporal/geospatial checks, basic media authenticity
* Structured reporting + standardized citations / references ([ODNI][3])

### Tier 2 — Specialists

* **OSINT tradecraft specialists** (advanced collection, multilingual/cultural nuance, adversary ecosystem mapping)
* **Digital forensics / media integrity** (synthetic media detection, provenance analysis)
* **AI engineers for intel** (entity resolution, deduplication, ranking, weak-signal detection, eval harnesses)

### Tier 3 — Leads (cadre)

* Tradecraft standards authors, curriculum owners, evaluation leads (benchmarking + QA gates) ([CIA][5])

---

## C. End-to-end workflow (how work gets done)

1. **Question → Requirements**

* Translate decision needs into collection + analytic requirements (open + classified) ([ODNI][1])

2. **Open collection + enrichment**

* Acquire, normalize, enrich (entities, geo/time, language, media) using AI assist where appropriate ([ODNI][1])

3. **Verification & deception stress**

* Multi-source corroboration
* Forensic checks for synthetic/manipulated content
* Adversary D&D hypotheses: “how would they fake this?” (structured red-team injection)

4. **Fusion**

* Integrate OSINT with SIGINT/GEOINT/HUMINT/ISR where available; explicitly track confidence + gaps

5. **Production**

* Deliver product + **evidence bundle**: sources, transformations, assumptions, caveats, reproducibility hooks

---

## D. Governance gates (the “quality and trust” layer)

### Gate 1 — Provenance & Citation (mandatory)

* Every PAI/CAI/OSINT object cited per standard; AI-enabled services handled explicitly ([ODNI][3])

### Gate 2 — Integrity checks

* Manipulation/synthetic screening for high-impact claims
* Confidence scoring policy: what must be corroborated before dissemination

### Gate 3 — Model risk & security

* Approved model list, data-handling rules, logging, prompt/response retention policy

### Gate 4 — Continuous standards refresh

* Quarterly/biannual refresh cycle for OSINT tradecraft standards and training content ([CIA][5])

---

## E. Metrics (what “good” looks like)

* **Time-to-first-insight** (hours/days) and **time-to-validated-assessment**
* **Corroboration ratio** for key claims (single-source vs multi-source)
* **Reversibility / reproducibility**: % of products with complete evidence bundles
* **Deception resilience**: red-team “break rate” (how often planted/false signals survive the pipeline)
* **Workforce readiness**: certification completion by tier; exercise performance

---

## PRD: AI-Era OSINT + Contested ISR Tradecraft Platform

*(PRD section set you can paste into Summit/IntelGraph docs; aligns with enterprise OSINT strategy + standardized sourcing/provenance like ICS-206-01.)*

### 1) Problem statement

The intelligence production pipeline is stressed by:

* **Pervasive OSINT** volume/velocity (multilingual, multimedia, “always on”)
* **AI-generated noise/obfuscation** (synthetic media, automated narrative churn)
* **Contested ISR** (collection gaps, adversary deception and counter-collection)
* **Governance pressure** (sourcing, provenance, reproducibility, defensibility)

Result: slower validation, higher risk of error, and brittle trust in analytic outputs.

### 2) Users and primary jobs-to-be-done

**All-source analysts**

* Fuse OSINT with other INTs and publish defensible products with evidence bundles.
  **OSINT collectors / researchers**
* Plan, execute, and document collection; manage licensing/constraints and reliability.
  **Forensics / integrity specialists**
* Screen media authenticity; provide integrity attestations and confidence signals.
  **Mission leads / decision-makers**
* Get faster, deception-resilient insights with clear confidence and gaps.
  **Compliance / governance / auditors**
* Verify sourcing, access controls, and lineage for high-impact products.

### 3) Goals (what success means)

* **Open-first fusion**: OSINT integrated by default into all-source workflows.
* **Evidence-first outputs**: every product ships with a structured evidence bundle.
* **Deception resilience**: systematic stress-testing before dissemination.
* **Workforce scale**: Tiered training/certification supported by embedded tools.
* **Standard-aligned provenance**: citations and references conform to policy/standards.

### 4) Non-goals (explicitly out of scope for v1)

* Full automation of analytic judgment / final assessments.
* Creating or operating covert capabilities.
* A universal “truth detector”; we aim for *risk reduction + traceability*.

### 5) Key product requirements

**R1 — Unified OSINT ingestion + normalization**

* Connectors, scheduled pulls, manual uploads, metadata capture.
* Normalization into a common schema (time, geo, entities, media type, source).

**R2 — Provenance and citation (mandatory gate)**

* Every datum carries provenance fields (origin, access path, time acquired, transforms).
* Product-level citations conform to standardized referencing guidance (incl. AI-enabled services where applicable).

**R3 — Verification & integrity checks**

* Corroboration workflows (cross-source, temporal, geo).
* Media integrity screening (hashing, manipulation flags, synthetic risk scoring).
* Confidence model: claim-level confidence and “what would change our mind”.

**R4 — Fusion workspace**

* Analyst “fusion notebook” that binds: claims ↔ evidence ↔ reasoning ↔ caveats.
* Link analysis / graph integration (entities, relationships, provenance edges).

**R5 — Evidence bundles (exportable)**

* Deterministic artifact pack: sources, transforms, citations, notes, red-team results.
* Repro hooks: queries, filters, versions, model IDs, timestamps.

**R6 — Deception stress testing (red-team injection)**

* Scenario harness: seeded false narratives + synthetic media test sets.
* Track break rate: which gates catch which deception patterns.

**R7 — Workforce enablement**

* Tier 0–2 training modules embedded into workflow (checklists, prompts, examples).
* Role-based UI: baseline users see guided flows; specialists see deep controls.

### 6) Constraints & assumptions

* Content licensing and access restrictions must be honored end-to-end.
* Logging/retention and security policies apply to both raw sources and AI outputs.
* AI models are fallible; outputs must be treated as *untrusted until verified*.
* The platform must function under partial data / contested collection conditions.

### 7) Risks and mitigations

* **Risk: False confidence from AI summaries**

  * Mitigation: claim-evidence binding + mandatory corroboration gates for key claims.
* **Risk: Provenance drift**

  * Mitigation: immutable lineage records; evidence bundle export is canonical.
* **Risk: Overhead slows analysts**

  * Mitigation: progressive disclosure; auto-capture provenance; templates.
* **Risk: Adversary adapts**

  * Mitigation: continuous red-team test sets; quarterly standards refresh.

### 8) Success metrics

* Time-to-first-insight; time-to-validated assessment
* % products with complete evidence bundles
* Corroboration ratio on key claims
* Deception break rate (caught pre-dissemination)
* Training completion and exercise performance by tier
* Audit pass rate (provenance/citation completeness)

### 9) MVP definition (what ships first)

MVP = (Ingest + Provenance + Evidence Bundles + Basic Verification + Red-team harness v0)

* Must support: at least 3 OSINT source types (web article, social post, image/video)
* Must export: evidence bundle with standardized citations + transforms
* Must run: one seeded deception exercise and report break rate

---

## Reference Architecture (text diagram)

```
[Data Sources]
  - Web/PAI/CAI feeds, vendor datasets, docs, media, social, forums
  - Classified ISR feeds (optional integration boundary)
          |
          v
[Ingestion & Capture Layer]
  - Connectors / Scrapers / Upload API
  - Metadata capture (time acquired, access path, license, locale)
  - Content hashing + object IDs
          |
          v
[Normalization & Enrichment]
  - Schema mapping (entities, geo, time, media type)
  - NLP (NER, translation, topic tags)
  - Media fingerprints (perceptual hash, EXIF extraction)
          |
          v
[Provenance & Lineage Store] <--------------------+
  - Immutable lineage events (origin -> transforms -> usage)
  - Citation records (standard-aligned)             |
  - Model usage records (model id, prompt class)    |
          |                                        |
          v                                        |
[Verification & Integrity Services]                |
  - Corroboration engine (cross-source checks)      |
  - Media authenticity signals                      |
  - Claim graph + confidence scoring                |
          |                                        |
          v                                        |
[Fusion Workspace / Analyst Notebook]              |
  - Claims ↔ Evidence binding                        |
  - Graph exploration (entities/relationships)       |
  - Caveats, assumptions, counter-hypotheses         |
          |
          v
[Deception Stress Harness]
  - Seeded narratives / synthetic media test sets
  - Red-team results attached to product + evidence
          |
          v
[Production & Dissemination]
  - Finished intel product
  - Evidence Bundle Export (sources, transforms, citations, checks, metrics)
  - Audit & governance dashboards
```

[1]: https://www.dni.gov/files/ODNI/documents/IC_OSINT_Strategy.pdf?utm_source=chatgpt.com "The IC OSINT Strategy 2024-2026"
[2]: https://www.dia.mil/Portals/110/Documents/OSINT-Strategy.pdf?utm_source=chatgpt.com "OSINT Strategy 2024–2028"
[3]: https://www.dni.gov/files/documents/ICD/ICS-206-01.pdf?utm_source=chatgpt.com "ICS 206-01"
[4]: https://www.dni.gov/files/documents/ICD/ICD-206.pdf?utm_source=chatgpt.com "ICD 206 – Sourcing Requirements for Disseminated ..."
[5]: https://www.cia.gov/resources/csi/static/Unclassified-Extracts-Studies-68-3-September-2024.pdf?utm_source=chatgpt.com "Unclassified Extracts Studies 68-3-September-2024"
