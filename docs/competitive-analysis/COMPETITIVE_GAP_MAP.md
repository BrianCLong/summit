Here’s the competitive gap map I’d use for **CompanyOS + Switchboard**, based on what adjacent “best-in-class” platforms already ship.

## Who we’re really competing with (by buyer/job-to-be-done)

### 1) Enterprise workflow + service ops platforms (the “default buy”)

**ServiceNow** (plus Jira Service Management, etc.) wins when an org wants a single workflow platform with huge breadth, low-code tooling, and lots of prebuilt business apps + automation. ServiceNow explicitly positions “workflow automation” as cross-org productivity + GenAI-assisted building. ([servicenow.com][1])

**Gap risk for us:** buyers compare us to their out-of-box catalog of workflows, forms, queues, approvals, SLAs, reporting, and integrations—not to our architecture.

---

### 2) Data/ontology + governance platforms (the “enterprise data brain”)

**Palantir Foundry** and the data-governance stack (Collibra/Alation/Databricks Unity Catalog) win on *deep, productized governance*—lineage, access controls, discovery, and enterprise-grade admin UX.

* Foundry emphasizes data protection/governance and automatic provenance concepts. ([Palantir][2])
* Databricks Unity Catalog provides lineage visualization and access control constructs (incl. ABAC concepts). ([Databricks Documentation][3])
* Collibra sells end-to-end lineage + catalog as a polished business/technical bridge. ([Collibra][4])

**Gap risk for us:** we may have the *right primitives* (graph + policy + provenance), but not the *enterprise-grade “governance product”* UX and packaged outcomes.

---

### 3) Developer/Platform engineering portals (the “internal platform console”)

**Backstage ecosystem + Port/OpsLevel/Cortex** win on service catalog maturity, scorecards, self-service actions, and a marketplace of plugins.

* Backstage has a large plugin directory/ecosystem. ([Backstage][5])
* Port highlights self-service actions with approvals and RBAC patterns; it also markets scorecards and dashboards. ([Port][6])
* OpsLevel/Cortex emphasize scorecards/maturity frameworks and operational readiness visibility. ([OpsLevel][7])

**Gap risk for us:** if Switchboard isn’t already a *best-in-class portal experience* (catalog, scorecards, actions, templates, ownership), platform teams will reach for these first.

---

### 4) Workflow orchestration engines (the “reliability core”)

**Temporal** and **Camunda** win on “durable execution,” long-running workflows, retries, visibility tooling, and auditable process history.

* Temporal positions durability and ships a Web UI for workflow state/metadata visibility. ([Temporal Docs][8])
* Camunda emphasizes BPMN/DMN + operational analytics and historical/audit information. ([Camunda 8 Docs][9])

**Gap risk for us:** if our workflow engine doesn’t match this reliability/visibility/auditability bar, we’ll leak “mission critical” flows to dedicated orchestrators.

---

### 5) Compliance automation + trust centers (the “get audited fast” wedge)

**Vanta/Drata/Secureframe** win because they ship massive integration coverage, continuous control monitoring, and auditor-friendly workflows.

* Vanta markets **1200+ automated tests** and **400+ integrations** + AI evidence review. ([Vanta][10])

**Gap risk for us:** even if our provenance is stronger, customers may still buy these for speed + prebuilt audit workflows unless we package “audit readiness” as a finished product.

---

## The biggest gaps between “us” (as specified) and the competitive bar

### Gap 1: **Integration surface area + connector reliability**

Competitors win with *hundreds* of maintained connectors and predictable data contracts (especially identity, HRIS, ticketing, cloud, SCM, chat, docs, finance). Vanta explicitly markets 400+ tool integrations. ([Vanta][10])
Also, the market is getting harsher: Slack/Salesforce has restricted how third parties can index/store Slack messages, which directly impacts enterprise AI/search products and any “knowledge graph from SaaS” story. ([Reuters][11])

**What we’re likely missing:**

* A connector SDK + certification program (versioning, rate-limit handling, replay, provenance mapping).
* A “golden 20” connector set that covers 80% of deployments (Okta/AAD, Google/M365, GitHub/GitLab, Jira, Confluence/Drive/SharePoint, Slack/Teams, AWS/GCP/Azure, PagerDuty, Datadog/Grafana, etc.).
* A plan for **API policy changes** (Slack-style) and “permission-respecting indexing” that doesn’t depend on long-term message storage.

---

### Gap 2: **Packaged outcomes (apps), not just a platform**

ServiceNow and the portal vendors sell *finished experiences*: request catalogs, incident/runbook hubs, service scorecards, approvals, analytics. ([servicenow.com][1])

**What we’re likely missing:**

* Opinionated “CompanyOS apps” that a buyer can demo in 10 minutes:

  * Incident → approval → change → postmortem, with receipts
  * Access request + JIT provisioning with ABAC decisions logged
  * Vendor onboarding + security review + evidence bundle export
* Template library: workflows, policies, dashboards, and runbooks that work on day one.

---

### Gap 3: **Governance UX that non-engineers can operate**

Foundry/Unity Catalog/Collibra win because governance is *navigable*—lineage graphs, catalogs, classification, access rules, and audit-friendly views. ([Databricks Documentation][3])

**What we’re likely missing:**

* A “Catalog Explorer”-style experience: discover entities, request access, view lineage, see policy decisions.
* Business-friendly lineage views (technical + business), like Collibra’s positioning. ([productresources.collibra.com][12])
* Built-in classification + sensitive-data handling workflows (auto-hide/redaction, retention policies surfaced in UI).

---

### Gap 4: **Workflow durability + visibility tooling**

Temporal’s big sell is durable execution with a Web UI and strong introspection. ([Temporal Docs][8])
Camunda emphasizes audit/history for process instances and reporting. ([Camunda 8 Docs][13])

**What we’re likely missing:**

* First-class workflow debugger: timeline, state, retries, compensation, inputs/outputs, and linked provenance receipts.
* Deterministic replay + “what happened and why” views that map directly to policy decisions and evidence bundles.
* Clear SLOs around orchestration (latency, stuck runs, replay, idempotency).

---

### Gap 5: **Scorecards/maturity rubrics + self-service actions as a core loop**

Port/OpsLevel/Cortex all lean into scorecards, rubrics, and “self-service actions with guardrails.” ([Port][14])

**What we’re likely missing:**

* A native scorecard engine: rules, evidence, exceptions, rollups by team/product/tenant.
* Self-service action catalog with approvals, TTL, and policy simulation (Port explicitly discusses approvals/RBAC patterns). ([Port][6])
* “Owner accountability loop”: every gap produces an actionable task + a measurable close-out.

---

### Gap 6: **Enterprise AI search + “trustworthy answers” layer**

Glean wins by connecting to 100+ sources, enforcing permissions, and providing governance controls around AI usage. ([Glean][15])
Atlassian Rovo markets “connect knowledge across tools” + agents integrated into Jira/Confluence. ([Atlassian][16])

**What we’re likely missing:**

* A *permission-aware* retrieval layer that can cite sources + attach provenance receipts to generated answers.
* “AI agents that act” with strict policy gates and human approvals (and receipts by default).
* Resilience to connector limitations (again: Slack-style). ([Reuters][11])

---

### Gap 7: **FinOps/unit economics polish**

Finout markets deep allocation and unit economics (including “100% cost allocation” claims and unit-econ widgets). ([Finout][17])

**What we’re likely missing:**

* A “unit economics cockpit” that feels finished (cost per tenant / workflow / seat / ingestion unit), not just metering plumbing.
* Showback/chargeback workflows and budget/alerting UX comparable to dedicated FinOps tools.

---

## Where we can *win* (if we close the right gaps)

Our differentiator is the **combination** that competitors usually bolt together:

* **Graph-centric OS + workflow + ABAC policy + provenance receipts** as a single system of record.
* Multi-tenant + cost attribution + policy simulation + evidence bundles as a first-class product (most stacks stitch this together).

The trick is: **package the differentiator into buyer-visible “aha moments.”** Otherwise we get compared on connector count and UI breadth.

---

## The “close the gap fast” priority list (high leverage)

If I had to pick the *fewest* things that move us closest to parity while protecting our moat:

1. **Golden 20 connectors + connector SDK + replayable ingest**

   * Include identity + tickets + SCM + cloud + docs/chat
   * Make every connector emit normalized provenance/lineage events

2. **Switchboard as an IDP-grade portal**

   * Service/entity catalog + ownership
   * Scorecards + maturity rubrics
   * Self-service action catalog with approvals + receipts ([Port][14])

3. **Workflow visibility + audit UI**

   * A Temporal/Camunda-like “runs” debugger page (timeline/state/retries) ([Temporal Docs][18])

4. **Compliance “trust pack” productization**

   * Prebuilt control set + continuous checks + evidence bundle exports (compete with Vanta’s “automation” story) ([Vanta][19])

5. **Permission-aware AI answers with receipts**

   * Retrieval + citations + policy-bound actions (avoid “AI that can’t be audited”)

---

* [Reuters](https://www.reuters.com/business/salesforce-blocks-ai-rivals-using-slack-data-information-reports-2025-06-11/?utm_source=chatgpt.com)
* [businessinsider.com](https://www.businessinsider.com/supercom-glean-ai-search-tool-centralizes-information-access-remote-employees-2025-4?utm_source=chatgpt.com)

[1]: https://www.servicenow.com/platform/workflow-automation.html?utm_source=chatgpt.com "Workflow Automation"
[2]: https://palantir.com/docs/foundry/security/data-protection-and-governance/?utm_source=chatgpt.com "Data protection and governance"
[3]: https://docs.databricks.com/aws/en/data-governance/unity-catalog/data-lineage?utm_source=chatgpt.com "View data lineage using Unity Catalog | Databricks on AWS"
[4]: https://www.collibra.com/products/data-lineage?utm_source=chatgpt.com "Data Lineage tool"
[5]: https://backstage.io/plugins/?utm_source=chatgpt.com "Plugin directory"
[6]: https://www.port.io/blog/developer-self-service-in-your-internal-developer-portal?utm_source=chatgpt.com "Set Up Developer Self-service in Your Internal ..."
[7]: https://www.opslevel.com/resources/how-scorecards-work-in-opslevel-a-truly-flexible-model?utm_source=chatgpt.com "How Scorecards work in OpsLevel: a truly flexible model"
[8]: https://docs.temporal.io/evaluate/understanding-temporal?utm_source=chatgpt.com "Understanding Temporal | Temporal Platform Documentation"
[9]: https://docs.camunda.io/docs/components/concepts/concepts-overview/?utm_source=chatgpt.com "Introduction to Camunda 8"
[10]: https://www.vanta.com/products/soc-2?utm_source=chatgpt.com "SOC 2 compliance automation software"
[11]: https://www.reuters.com/business/salesforce-blocks-ai-rivals-using-slack-data-information-reports-2025-06-11/?utm_source=chatgpt.com "Salesforce blocks AI rivals from using Slack data, The Information reports"
[12]: https://productresources.collibra.com/docs/collibra/latest//Content/CollibraDataLineage/co_collibra-data-lineage.htm?utm_source=chatgpt.com "Collibra Data Lineage"
[13]: https://docs.camunda.io/docs/components/best-practices/operations/reporting-about-processes/?utm_source=chatgpt.com "Reporting about processes | Camunda 8 Docs"
[14]: https://www.port.io/guide/scorecards?utm_source=chatgpt.com "What are Scorecards? Examples, Use Cases & Step-by- ..."
[15]: https://www.glean.com/product/governance?utm_source=chatgpt.com "AI for Governance: Secure, Compliant Enterprise AI Solutions"
[16]: https://www.atlassian.com/software/confluence/ai?utm_source=chatgpt.com "Rovo in Confluence: AI features"
[17]: https://www.finout.io/?utm_source=chatgpt.com "Finout: The Enterprise-Grade FinOps platform"
[18]: https://docs.temporal.io/web-ui?utm_source=chatgpt.com "Temporal Web UI | Temporal Platform Documentation"
[19]: https://www.vanta.com/products/automated-compliance?utm_source=chatgpt.com "Compliance automation software"
