# Battlecards (one-pager each)

Each battlecard includes: **positioning hook**, **when you win/lose**, **trap questions**, and a **demo path**.

---

## 1) ShadowDragon — battlecard

**What they are:** OSINT investigations platform emphasizing ethical collection, OPSEC (“unattributed searches”), and enterprise controls (SOC 2 Type II). ([ShadowDragon][1])
**Who buys:** Gov/LE, financial crime, corporate security teams. ([ShadowDragon][1])
**Compete vs complement:** **Compete** when buyer wants “single OSINT platform.” **Complement** when ShadowDragon is a data/capability layer you can orchestrate.

### Their strengths

* Enterprise trust posture (SOC 2 Type II) and “ethical intelligence” messaging. ([ShadowDragon][1])
* Credible leadership bench shown publicly (CEO Jonathan Couch, CTO Jason Herren, SVP Eng Nico Dekens; founder Daniel Clemens). ([ShadowDragon][1])

### Their weaknesses vs Summit (the wedge)

* Tool/platform-first; not naturally framed as **playbooks-as-code** with **evidence bundles**, **replay + diff**, and **CI-governed investigative procedures**.

### What they’ll say (and your counter)

* “We do OSINT end-to-end with OPSEC + compliance.” → “Great. Show reproducibility and provenance: can you replay an investigation run and prove every claim with captured artifacts and a deterministic bundle?”

### Trap questions (ask early)

1. “Show a run that is reproducible: evidence capture, replay, and change-diff.”
2. “How do you version and approve investigative procedures?”
3. “How do you fuse OSINT outputs with internal systems into a single entity model?”

### Demo path (10–12 minutes)

* Run **one investigation playbook** → show **evidence bundle** (captured sources + hashes + citations).
* Re-run the same playbook → show **diff** (what changed, why, and what policy gate fired).

### Win conditions / lose conditions

* **Win** if buyer cares about auditability, standardization, repeatability, SOC2/ISO style governance.
* **Lose** if buyer only wants “OSINT searches + monitoring UI” and already standardized on ShadowDragon’s workflow.

---

## 2) Social Links (Crimewall / Professional / API) — battlecard

**What they are:** OSINT platform + integrations and API. Crimewall claims “full-cycle OSINT investigation platform” with **500+ open sources** and graph/table/map views. ([Social Links][2])
**SL API pricing:** **$0.40 → $0.15 per call** depending on volume. ([Social Links][13])
**Who buys:** Investigation teams; orgs already anchored in Maltego/i2.

### Their strengths

* Strong “investigation workspace” story: case management + multi-view analysis + report export (PDF/CSV). ([Social Links][2])
* API is explicitly priced (rare in this market). ([Social Links][13])

### Their weaknesses vs Summit

* They sell **data access + UI + automation features**, but they are not natively positioned as a **governed investigation runtime** where playbooks are treated like software (versioned, gated, drift-checked).

### What they’ll say (and your counter)

* “We have automation + AI + 500+ sources.” → “Perfect. Now: can you **standardize** and **govern** investigations like software? Versioned playbooks, approvals, evidence bundles, replay + diff.”

### Trap questions

1. “Can you export an audit-ready evidence bundle with reproducible replay instructions?”
2. “How do you handle policy: who can run which automated searches, with what logs?”
3. “How do you fuse repeated investigations into a persistent intelligence graph?”

### Demo path

* Show: **playbook orchestration** calling Social Links as a tool → normalizing results into Summit graph → generating an evidence bundle and a case report.

### Best posture in real deals

* If they’re entrenched: **don’t displace**. Treat Social Links as a **connector/data source**; sell Summit as the **governed automation + evidence graph** above it.

---

## 3) Maltego — battlecard

**What they are:** Link-analysis OSINT workbench + credits. Entry plan is **€149/year** (Entry Lite). ([Maltego][3])
**Who buys:** Analysts, small teams, sometimes enterprise as a “workbench layer.”

### Their strengths

* Ubiquitous analyst familiarity; fast pivots; huge ecosystem effect.
* Low entry price makes it easy for teams to standardize on it early. ([Maltego][3])

### Weaknesses vs Summit

* It’s a **tool**, not a **platform runtime**. Scaling standardized investigations across teams becomes “people process,” not “governed execution.”

### What they’ll say (and your counter)

* “We already have Maltego.” → “Keep it. Summit is what you add when you need repeatable playbooks, provenance, approvals, and cross-domain fusion.”

### Trap questions

1. “How do you ensure two analysts get the same result following the same SOP?”
2. “Where is your evidence bundle + reproducibility standard?”
3. “What’s your governance story when audits/regulators ask ‘why this claim’?”

### Demo path

* “Maltego is the microscope.” Show Summit as the “lab”: run playbook → evidence bundle → replay + diff → policy gate.

---

## 4) IBM i2 Analyst’s Notebook — battlecard

**What they are:** Enterprise visual analysis for investigators; claims “relied upon for more than 30 years by over 2,000 organizations” and offers perpetual/SaaS/subscription. ([i2 Group][4])
**Who buys:** Large gov and enterprise fraud/crime units.

### Their strengths

* Deep enterprise adoption, procurement trust, strong visual charting. ([i2 Group][4])
* Flexible licensing options. ([i2 Group][4])

### Weaknesses vs Summit

* i2 is a **visual analysis endpoint**; autonomy and governance are usually *external* (custom integration + process discipline).

### Trap questions

1. “Where is the investigation runtime—automated playbooks, provenance, replay?”
2. “How quickly can you ship new investigative methods without heavy services work?”
3. “How do you unify OSINT + internal systems into a durable graph model?”

### Demo posture

* If i2 is entrenched: Summit is **upstream**: ingestion + normalization + evidence + automation; i2 remains a charting tool.

---

## 5) Blackdot (Videris) — battlecard

**What they are:** Enterprise OSINT investigations platform; positions Videris as “leading OSINT solution” for public/private investigators. ([Blackdot Solutions][5])
**Recent direction:** Videris “Automate” AI capability reported in 2025 coverage. ([Help Net Security][14])
**Who buys:** Gov/LE and regulated enterprise investigations.

### Strengths

* Direct “OSINT investigations platform” fit; strong casework framing. ([Blackdot Solutions][5])
* “AI automation” narrative now credible in market coverage. ([Help Net Security][14])

### Weaknesses vs Summit

* Typically judged on “platform features.” Summit should reframe the evaluation around **governance**, **provenance**, **repeatability**, and **playbooks-as-code**.

### Trap questions

1. “Can you replay an investigation run end-to-end and generate a deterministic evidence bundle?”
2. “How do you version and gate investigative procedures (approvals, drift checks)?”
3. “How do you fuse OSINT and internal data into a persistent graph model?” (They claim OSINT can be combined with internal data in at least one procurement listing; you still want to probe depth.) ([Apply to Supply][15])

### Demo path

* Use a buyer-relevant scenario (fraud ring / insider / impersonation). Run playbook → evidence → replay/diff → policy gate.

---

## 6) Skopenow — battlecard

**What they are:** OSINT platform for fraud and threat detection; markets “event-based insights,” “powerful link analysis,” and usage by Fortune 500 + government. ([Skopenow][6])
**Who buys:** Corporate security, fraud units, investigations teams.

### Strengths

* Clear story: models + situational awareness + link analysis. ([Skopenow][6])
* Good for “dashboard + alerts + rapid context” motion.

### Weaknesses vs Summit

* Often evaluated as an **insights platform**; weaker on “defensible casework outputs” and repeatable investigative method governance.

### Trap questions

1. “Show audit-ready evidence packs and reproducibility.”
2. “How do you standardize investigations across teams and time?”
3. “Can your system run a governed playbook across OSINT + internal systems?”

### Demo path

* Show Summit as the “casework and governance layer” that can ingest Skopenow outputs and turn them into repeatable investigative runs.

---

## 7) OSINT Industries — battlecard (utility competitor / connector)

**What they are:** “lookup” tool across email/phone/username/wallet with published subscription tiers (£19/£49/£99 per month). ([OSINT Industries][7])
**Who buys:** Individual investigators, journalists, small teams; sometimes enterprise for quick lookups.

### Strengths

* Clear value: fast identity-linking lookups; transparent pricing. ([OSINT Industries][7])

### Weaknesses vs Summit

* Narrow scope; not a full investigations platform; no deep governance runtime.

### How to position

* Treat as a **connector** inside Summit playbooks. Don’t “compete” unless a buyer thinks it’s a full platform (then reframe quickly).

---

## 8) Cyabra — battlecard (disinfo / narrative)

**What they are:** Disinformation/narrative manipulation detection. Narrative Alerts positioned as real-time early warning; page dated Feb 5, 2026. ([Cyabra][8])
**Who buys:** Public sector, comms, security teams.

### Strengths

* Strong “coordinated manipulation + narrative intelligence” story.

### Weaknesses vs Summit

* Often campaign/narrative-focused; doesn’t naturally extend to cross-domain corporate espionage investigations unless fused with other evidence sources.

### Trap questions

1. “Can you fuse non-social OSINT + internal data into the same case model?”
2. “Can you produce an evidence bundle that survives adversarial scrutiny?”
3. “Can you run playbooks (not just alerts) with approvals and audit trails?”

### Best posture

* **Complement**: ingest Cyabra signals → Summit runs the broader investigation playbook (attribution hypotheses, corroboration, evidence capture, reporting).

---

## 9) Recorded Future — battlecard (CTI “OSINT at scale”)

**What they are:** Threat intelligence platform; Intelligence Graph claims continuous indexing from **1M+ sources**; platform page names open web, dark web, technical feeds, customer telemetry. ([Recorded Future][9])
**Who buys:** CTI, SecOps leadership, risk teams.

### Strengths

* Massive external intelligence + operationalization in security workflows. ([Recorded Future][16])

### Weaknesses vs Summit

* Threat-intel-first: investigations outside CTI (exec impersonation, insider narrative ops, cross-domain fraud) can be awkward if the buyer expects full casework + provenance + playbook governance.

### Trap questions

1. “Can you run non-cyber investigations end-to-end with case lifecycle and evidence packs?”
2. “Where is replayability + deterministic output?”
3. “How do you manage approvals/policy for autonomous actions?”

### Sales posture

* Often **coexist**: RF as intelligence feed; Summit as **governed investigation runtime** that fuses RF with internal + OSINT + other tools.

---

## 10) Orpheus Cyber — battlecard (insurance/TPRM ratings)

**What they are:** Cyber risk scoring used in insurance contexts. Their insurer case study states use for **rate-quote-bind** and **continuous monitoring** post-bind, plus a hybrid “SaaS + analyst-led support” model. ([Orpheus][10])
They also claim CVE exploit-likelihood scoring with “94% accuracy” in that case study. ([Orpheus][10])
**Who buys:** Cyber insurers/brokers, TPRM leaders.

### Strengths

* Clear “underwriting workflow” narrative (prospects + portfolio monitoring). ([Orpheus][10])
* External validation exists via Gallagher Re study (47,000 companies, 1,000+ claims). ([Gallagher][17])

### Weaknesses vs Summit

* Ratings/reporting orientation; limited in true investigative casework beyond cyber-risk scoring.

### Trap questions

1. “Do you support investigative case lifecycle (who/what/why) or primarily scoring/monitoring?”
2. “Can you fuse narrative/disinfo and corporate intel into the same evidence graph?”
3. “Can you run governed playbooks beyond cyber ratings?”

### Best posture

* **Complement** for insurance deals: Summit handles investigations + evidence; Orpheus can remain a rating/monitoring signal source.

---

## 11) Graphistry — battlecard (graph viz accelerator)

**What they are:** Graph visualization for investigations; their “About” page lists investors (Bloomberg Beta, In-Q-Tel, Nvidia, Greylock). ([Graphistry][11])
**Who buys:** Security/data teams who already have graph-shaped data and want exploration.

### Strengths

* Powerful exploratory visualization and investigation acceleration.
* Strong investor signal for credibility in investigations markets. ([Graphistry][11])

### Weaknesses vs Summit

* Viz-first: needs an upstream data plane (entity model, provenance, ingestion, governance, playbooks).

### Best posture

* **Integrate**: Summit graph + evidence → Graphistry UI for specific analyst personas.

---

## 12) Palantir (Gotham/Foundry/AIP) — battlecard (enterprise fusion heavyweight)

**What they are:** Enterprise platforms for operations and decision-making:

* Gotham: “make informed decisions… in dynamic operational environments.” ([Palantir][12])
* Foundry: integration tools “extend far beyond typical ETL/ELT.” ([Palantir][18])
* AIP Agent Studio: build “AIP Agents” with enterprise info/tools and deploy via APIs/SDKs. ([Palantir][19])

**Who buys:** Large gov + enterprise ops with big budgets and long deployment cycles.

### Strengths

* Scale + procurement footprint + platform breadth. ([Palantir][12])
* Agent tooling exists in-platform. ([Palantir][19])

### Weaknesses vs Summit

* General-purpose + heavyweight; long time-to-value; often services-intensive.
* You can out-focus them on **investigations + OSINT + evidence governance**, and out-ship.

### Trap questions

1. “How fast can you deploy a new investigative playbook with approvals and evidence capture?”
2. “Can you guarantee reproducibility and drift detection across environments?”
3. “What does a ‘case’ look like in your ontology—how is evidence preserved?”

### Win conditions / lose conditions

* **Win** when buyer wants a sharp investigation runtime and faster adoption.
* **Lose** when buyer has already committed to Palantir as the enterprise substrate and is only “adding an app.”

---

## Appendix battlecards (adjacent encroachers you will see)

### A1) Glean — “enterprise graph + agents” adjacency

Glean’s Enterprise Graph page explicitly says: “With Enterprise Graph actions, anyone can create agents that leverage organizational knowledge and context.” ([Glean][20])
**Risk:** buyers say “We already have enterprise agents.”
**Counter:** “Glean is enterprise work AI; Summit is **investigation-grade**: adversarial environments, evidence provenance, repeatability, and case defensibility.”

### A2) Streamline AI — internal investigations workflow adjacency

Streamline describes itself as “intake, triage, and workflow automation platform built for in-house legal teams,” and pricing is “Contact Sales / Custom Quote.” ([Streamline AI][21])
**Risk:** legal/compliance buyers see them as “the investigations platform.”
**Counter:** “Streamline is *legal intake + matter workflow*. Summit is *investigative intelligence + OSINT fusion + evidence graph + agentic playbooks*.”

[1]: https://shadowdragon.io/company/ "About us - ShadowDragon"
[2]: https://sociallinks.io/products/sl-crimewall "OSINT investigation platform | SL Crimewall"
[3]: https://www.maltego.com/pricing/?utm_source=chatgpt.com "Maltego Pricing"
[4]: https://i2group.com/solutions/i2-analysts-notebook?utm_source=chatgpt.com "i2 Analyst's Notebook - Discover and deliver actionable ..."
[5]: https://blackdotsolutions.com/?utm_source=chatgpt.com "Blackdot Solutions Videris - Home"
[6]: https://www.skopenow.com/?utm_source=chatgpt.com "Skopenow - Unlock the Power of Open-Source Intelligence"
[7]: https://www.osint.industries/pricing?utm_source=chatgpt.com "OSINT Platform Pricing Plans"
[8]: https://cyabra.com/solutions/intelligence-osint-analysts/?utm_source=chatgpt.com "Disinformation Detection for Intel & OSINT Teams"
[9]: https://www.recordedfuture.com/platform/intelligence-graph?utm_source=chatgpt.com "Intelligence Graph"
[10]: https://orpheus-cyber.com/wp-content/uploads/2025/01/Case-Study-Cyber-Liability-Insurer.pdf "Cyber Liability Insurer"
[11]: https://www.graphistry.com/about-us?utm_source=chatgpt.com "About Us"
[12]: https://www.palantir.com/platforms/gotham/?utm_source=chatgpt.com "Gotham"
[13]: https://sociallinks.io/products/sl-api?utm_source=chatgpt.com "Social Media API"
[14]: https://www.helpnetsecurity.com/2025/09/23/blackdot-solutions-videris-automate/?utm_source=chatgpt.com "Blackdot Videris Automate uses AI to speed OSINT, risk ..."
[15]: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/355600507879698?utm_source=chatgpt.com "Blackdot Videris OSINT Investigations Software accessed ..."
[16]: https://www.recordedfuture.com/platform?utm_source=chatgpt.com "Intelligence Platform"
[17]: https://www.ajg.com/gallagherre/-/media/files/gallagher/gallagherre/news-and-insights/2025/june/gallagherre-cyber-tide-analysis.pdf?utm_source=chatgpt.com "Gallagher Re - TIDE Analysis"
[18]: https://palantir.com/docs/foundry/data-integration/overview/?utm_source=chatgpt.com "Overview • Data integration"
[19]: https://palantir.com/docs/foundry/agent-studio/overview/?utm_source=chatgpt.com "AIP Agent Studio • Overview"
[20]: https://www.glean.com/product/enterprise-graph?utm_source=chatgpt.com "Enterprise Graph: Powering AI with Deep Organizational ..."
[21]: https://www.streamline.ai/?utm_source=chatgpt.com "Streamline AI: Your Legal Front Door & Intake Automation"
