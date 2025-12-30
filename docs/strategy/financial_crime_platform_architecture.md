[ARCHITECT] For **financial crime investigations**, differentiation comes from being the system that (1) **closes cases faster**, (2) **survives audits**, and (3) **adapts to regulatory change** without endless rework. Here’s the moat stack I’d build and sell.

## The 8 moats that matter in AML/FCC investigations

### 1) Evidence-grade **Case Graph** (not “RAG with a graph”)

Turn every alert/investigation into a **versioned, queryable case graph**:

* entities (customer, counterparty, UBO, employee, merchant, device), events, accounts, transactions
* links + confidence + timestamps
* every edge backed by evidence pointers + provenance hashes

**Why it wins:** investigations are *graph problems* (relationships + time + uncertainty). This becomes your durable system of record and switching cost.

### 2) “Regulator-proof” provenance + audit trail as a first-class artifact

Every step produces an **audit bundle**: sources → transforms → model/tool decisions → analyst actions → final narrative.
This is especially valuable as frameworks evolve (e.g., FATF Recommendations were amended in **Oct 2025**). ([FATF][1])

### 3) Policy enforcement that executes (OPA/ABAC across the whole pipeline)

Enforce access + handling rules at:

* ingest (PII/PCI), retrieval, tool-use, output (e.g., SAR narrative redaction rules)
* case-level entitlements and “Chinese wall” controls

This is the difference between “cool demo” and “bankable deployment.”

### 4) UBO + entity resolution as a *core algorithmic product*

Make **entity resolution + beneficial ownership inference** a proprietary engine:

* probabilistic matching across KYC, payments, devices, filings, sanctions/adverse media
* “explainable link” outputs (why we think X controls Y)
* produce *human review tasks* when uncertainty is high

Also: data availability is moving. FinCEN’s BOI landscape changed materially in **March 2025** via an interim final rule affecting BOI reporting for U.S. companies/U.S. persons, with different treatment for foreign reporting companies. Build your system to **ingest BOI when available** but remain robust when it’s not. ([FinCEN.gov][2])

### 5) Typology-native investigation playbooks (LLM as a “plan compiler”)

Encode typologies (layering, mule networks, trade-based laundering, romance scams, bust-out fraud, etc.) as **graph query templates + next-best-action plans**:

* what evidence to pull next
* what contradictions to test
* what threshold to escalate

Your LLM generates **executable investigation plans** + structured outputs, not free-form chat.

### 6) SAR drafting that’s “citation-complete” + consistent with bank policy

Make SAR creation a *product*, not an export:

* auto-draft narrative with citations to case graph edges and source artifacts
* consistent reason codes / typology mapping
* “defensibility checks” (missing evidence, inconsistent timelines, unsupported claims)

### 7) Asset tracing + recovery workflows (investigation → action)

Don’t stop at “suspicious.” Provide operational outputs:

* funds-flow graphs, peel-chain/layering detection, beneficiary clustering
* evidence packet generation for escalation / legal / recovery

FATF has been pushing more detailed thinking on asset recovery and “follow the money” practices (see 2025 asset-recovery guidance). ([FATF][3])

### 8) Change-resilient compliance (rules + models) across jurisdictions

Ship a “regulatory diff” layer:

* EU: AMLA exists legally since **June 2024** and began operations around **July 2025**; the AMLA regulation has already been amended (EU **2025/2088**). ([AML/CFT Authority][4])
* US: investment adviser AML rule timing has seen proposals to **postpone** effective dates (Sept 2025). ([FinCEN.gov][5])

**Why it wins:** buyers hate re-platforming when rules shift—make “adaptation” your product.

---

## What I’d ship as the flagship “killer wedge”

**Investigation Copilot that produces an Evidence Bundle**

* 1-click: *Alert → Case Graph → Investigation Plan → Evidence Checks → SAR-ready Narrative*
* KPIs: time-to-closure, false positive burn-down, audit exception rate, analyst throughput

## The eval moat (how you prove you’re better)

Build a private benchmark suite:

* **Time-to-decision** per alert (median + p95)
* **Evidence completeness score** (are key facts cited?)
* **Graph false-link rate** (bad entity resolution kills trust)
* **SAR consistency** (policy + typology alignment)
* **Audit replay** success (can you reproduce why a decision happened?)

## Patentable primitives (high-enforceability)

1. **Provenance-signed case graph updates** (every edge has lineage + policy context)
2. **Typology-to-plan compiler** (LLM → executable graph queries + tasks + thresholds)
3. **Entity/UBO inference with “explainable uncertainty”** (outputs are reviewable, not opaque)

---

* [Reuters](https://www.reuters.com/legal/us-supreme-court-allows-anti-money-laundering-law-take-effect-2025-01-23/?utm_source=chatgpt.com)
* [AP News](https://apnews.com/article/80c4b7348a50df073d6128d42bbac716?utm_source=chatgpt.com)
* [AP News](https://apnews.com/article/8ea0bfa5e915779b2c659e3c7d8d18a1?utm_source=chatgpt.com)

[1]: https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html?utm_source=chatgpt.com "The FATF Recommendations"
[2]: https://www.fincen.gov/boi?utm_source=chatgpt.com "Beneficial Ownership Information Reporting"
[3]: https://www.fatf-gafi.org/en/publications/Methodsandtrends/asset-recovery-guidance-best-practices-2025.html?utm_source=chatgpt.com "FATF releases detailed guidance to help practitioners ..."
[4]: https://www.amla.europa.eu/about-amla_en?utm_source=chatgpt.com "About AMLA - Authority for Anti-Money Laundering and ..."
[5]: https://www.fincen.gov/news/news-releases/fincen-issues-proposed-rule-postpone-effective-date-investment-adviser-rule?utm_source=chatgpt.com "FinCEN Issues Proposed Rule to Postpone Effective Date ..."
