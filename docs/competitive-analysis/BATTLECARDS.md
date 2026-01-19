# Battlecards (what to say, what to demo, where they’re weak)

## 1) ServiceNow (the “workflow platform” default)

**Why they win**

* Deep catalog/approvals/workflows and huge platform footprint.
* Now Assist can generate catalog items from natural-language descriptions, which raises buyer expectations for “AI-assisted building.” ([servicenow.com][1])

**Where they’re weaker (our wedge)**

* Cross-system **cryptographically verifiable receipts** and **policy decision proofs** aren’t their native core story.
* Multi-tenant white-label SaaS packaging is not their model.

**Land motion**

* Don’t “replace ServiceNow.” **Underlay it**: “We make actions safe + auditable across all tools with policy + receipts.”
* **Demo to win:** “Approval → action executes → receipt bundle export” (show policy preflight + rationale + signed manifest).

---

## 2) Backstage ecosystem + IDP vendors (Port/OpsLevel etc.)

**Why they win**

* Ecosystem gravity: Backstage has an official plugin directory with lots of categories and extensions. ([Backstage][2])
* Port is explicit about self-service actions plus approvals and dynamic RBAC/approver permissions. ([docs.port.io][3])
* OpsLevel makes scorecards/maturity a first-class loop. ([OpsLevel][4])

**Where they’re weaker (our wedge)**

* They can do approvals, but rarely ship **end-to-end provenance receipts** spanning ingest → policy eval → action execution → artifacts.
* Multi-tenant policy partitioning + cost attribution are not usually the “spine.”

**Land motion**

* If the customer has Backstage/Port: integrate rather than fight. “Keep your portal; we become the **policy+receipt gate** and the evidence ledger.”
* **Demo to win:** action catalog run shows (a) ABAC simulation “would allow/deny,” (b) approval chain, (c) run timeline, (d) signed receipt.

---

## 3) Temporal / Camunda (durable orchestration + visibility)

**Why they win**

* Temporal’s docs are very clear that event history is central to durable execution, and their Web UI shows execution history/metadata. ([Temporal Docs][5])
* Camunda emphasizes audit/history for process instances and “track every change” visibility in Operate, plus reporting on historical instances. ([Camunda][6])

**Where they’re weaker (our wedge)**

* They’re phenomenal at orchestration, but they don’t natively solve **enterprise-wide policy+receipts across every tool** and **multi-tenant business operations** (billing, partner console, white-label packs).

**Land motion**

* Be honest: if a buyer is deeply Temporal/Camunda, we either (a) integrate, or (b) must match their “runs UI” bar.
* **Demo to win:** “Runs UI” with retries/compensation + linked policy decision trace + exportable evidence manifest.

---

## 4) Vanta (compliance automation expectations bar)

**Why they win**

* They market **1,200+ automated hourly tests** and a **400+ integrations ecosystem** across compliance products (SOC 2, automated compliance). ([Vanta][7])

**Where they’re weaker (our wedge)**

* They collect evidence; we can produce **first-party receipts** from every action/workflow with provenance built-in (less “screenshots and point-in-time artifacts,” more “cryptographically verifiable execution proof”).
* Also: Vanta’s value is speed—if we don’t ship packaged controls, we lose.

**Land motion**

* Don’t compete feature-by-feature at first. Compete on **evidence quality + automation trust**.
* **Demo to win:** one-click “evidence bundle export” where every item is a receipt, not a manually uploaded artifact.

---

## 5) Glean + Atlassian Rovo (AI answers + agentic ecosystem)

**Why they win**

* Glean markets **100+ connectors**, permission enforcement, granular indexing controls, and governance/sensitive auto-hide. ([Glean][8])
* Atlassian is pushing Rovo’s “agentic ecosystem” via an MCP connector for ChatGPT, emphasizing OAuth + permission controls and audit logs/tool invocation tracking. ([Atlassian][9])

**The big market trap we must design around**

* Slack has explicit API Terms language restricting third parties from creating persistent copies/indexes/long-term data stores for other orgs’ Slack API data. ([Slack][10])
* Reuters reported Slack/Salesforce tightened terms that limit indexing/copying/storing Slack messages for long-term use via APIs, impacting AI tools that relied on it. ([Reuters][11])

**Land motion**

* Our AI story must be: **permission-safe, policy-bound, receipt-backed** and resilient to connector policy changes (no “background hoovering”).
* **Demo to win:** ask a question → answer with citations + click-through receipts; then attempt an action → policy preflight + approval + receipt.

---

# The “Competitive Kill Chain” we should ship (what wins deals fast)

If you want *one* checklist that closes the biggest gaps:

1. **Golden 20 connectors** + connector SDK with replay/DLQ/idempotency
2. **Portal loop:** Catalog → Scorecards → Actions (with approvals)
3. **Runs UI:** workflow visibility at Temporal/Camunda level
4. **Compliance pack:** continuous checks + evidence bundles (auditor-ready)
5. **AI answers & agents:** permission-aware retrieval + policy-bound tools + receipts
6. **Connector policy resilience:** especially Slack-style restrictions (no persistent indexing assumptions) ([Slack][10])

---

# What I’d do “next” (immediately usable deliverables)

If you say “next” again, I’ll output:

* A **competitive discovery script** (the 15 questions that force buyers to admit pain we solve)
* A **demo storyboard** (5 demos, each 6–8 minutes, each ending with a receipt export)
* A **2-page RFP response pack** (security, compliance, provenance, multi-tenant isolation, retention/deletion manifests)
* A **win/loss rubric** you can score deals with (and map to roadmap items)

[1]: https://www.servicenow.com/docs/bundle/zurich-servicenow-platform/page/product/service-catalog-management/concept/now-assist-for-catalog-generation.html?utm_source=chatgpt.com "Now Assist in Catalog Builder"
[2]: https://backstage.io/plugins/?utm_source=chatgpt.com "Plugin directory"
[3]: https://docs.port.io/actions-and-automations/create-self-service-experiences/?utm_source=chatgpt.com "Self-service actions - Port Documentation"
[4]: https://www.opslevel.com/product/maturity?utm_source=chatgpt.com "Service Maturity"
[5]: https://docs.temporal.io/workflow-execution/event?utm_source=chatgpt.com "Events and Event History | Temporal Platform Documentation"
[6]: https://camunda.com/platform/operate/?utm_source=chatgpt.com "Operate: Gain visibility into processes"
[7]: https://www.vanta.com/products/automated-compliance?utm_source=chatgpt.com "Compliance automation software"
[8]: https://www.glean.com/connectors?utm_source=chatgpt.com "App Integrations for Glean – Connect 100+ Apps Instantly"
[9]: https://www.atlassian.com/blog/announcements/atlassian-rovo-mcp-connector-chatgpt?utm_source=chatgpt.com "Powering the agentic ecosystem with Atlassian Rovo MCP ..."
[10]: https://slack.com/terms-of-service/api?utm_source=chatgpt.com "Slack API Terms of Service | Legal"
[11]: https://www.reuters.com/business/salesforce-blocks-ai-rivals-using-slack-data-information-reports-2025-06-11/?utm_source=chatgpt.com "Salesforce blocks AI rivals from using Slack data, The Information reports"
