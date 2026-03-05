# Summit Competitive Battlecards — 12 Vendor Pack

Version: 2026-02-11
Owner: GTM / Field Engineering

## Executive Matrix

| Vendor                    | Primary category                          | Primary buyer                        | What they are best at                                   | Weak vs Summit                                                                        | Recommended posture                                                    |
| ------------------------- | ----------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ShadowDragon              | OSINT investigations + monitoring         | Gov/LE and enterprise investigations | Continuous OSINT monitoring and source coverage         | Limited governance/runtime depth for playbooks-as-code and reproducible evidence runs | Compete in platform bakeoffs; integrate when incumbent                 |
| Social Links              | OSINT investigation platform + API access | Intel/OSINT teams                    | Investigator UI + connectors + API-based data retrieval | Weaker governance and repeatable agentic orchestration                                | Usually complement as feed + run Summit above                          |
| Maltego                   | Link analysis workbench                   | Analysts and small teams             | Fast pivots and transformation ecosystem                | Tool-centric, not investigation runtime with policy gates                             | Complement for analyst workflows; replace for platform standardization |
| IBM i2 Analyst’s Notebook | Enterprise link analysis                  | Gov and regulated enterprise         | Mature charting and institutional footprint             | Desktop-centric workflows and slower automation modernization                         | Complement as downstream analyst tool                                  |
| Blackdot (Videris)        | Enterprise OSINT investigations platform  | Public/private investigators         | Collect/analyze/visualize OSINT in one suite            | Differentiation pressure on provenance replay and governed execution                  | Direct head-to-head compete                                            |
| Skopenow                  | Fraud/threat OSINT platform               | Enterprise fraud/risk/security       | Packaged AI-driven risk insights                        | Less depth in evidence bundles and reproducible case operations                       | Compete or complement as signal source                                 |
| OSINT Industries          | Single-purpose lookup utility             | Journalists/LE/insurers              | Fast account discovery from email/phone                 | Narrow scope vs cross-domain fusion and case lifecycle                                | Complement as connector                                                |
| Cyabra                    | Disinformation/narrative detection        | Comms/public sector/intel teams      | Bot and inauthentic network detection + alerts          | Social domain focus; less end-to-end case operations                                  | Complement for narrative sensing; compete in narrative-only pilots     |
| Recorded Future           | Threat intelligence platform              | CTI/SecOps leaders                   | Large-scale TI graph and enrichment feeds               | CTI-first orientation vs mixed-domain investigation runtime                           | Usually complement as enrichment feed                                  |
| Orpheus Cyber             | Cyber risk scoring/insurance              | Insurers, brokers, TPRM              | Underwriting and continuous risk rating flows           | Ratings-centric, not investigation evidence platform                                  | Complement for risk overlays                                           |
| Graphistry                | Graph visualization acceleration          | Security/data teams                  | High-scale graph visual exploration                     | Visualization-first; requires external data/runtime governance plane                  | Complement as optional analyst UI                                      |
| Palantir Gotham/Foundry   | Enterprise data fusion + operations       | Gov + large enterprise operations    | Broad, high-governance operational platform             | Heavy implementation cycles and services dependency                                   | Compete in strategic platform deals; coexist where entrenched          |

## Summit Kill-Shot Positioning

**Summit is a governed investigation runtime, not a point tool.**

Summit differentiates on:

1. **Playbooks as code** with approvals and versioning.
2. **Evidence-first graph model** with source-level traceability.
3. **Replay + diff** to prove reproducibility over time.
4. **Policy-gated agentic workflows** for controlled automation.
5. **Cross-domain fusion** across OSINT, internal systems, and partner feeds.

## Five Disqualifying Questions (Use in Discovery)

1. Can you produce an evidence bundle where each claim maps to captured artifacts and can be replayed?
2. Can you version and approve investigation procedures as code, including drift detection?
3. Can an agent execute end-to-end collection-to-report workflows with hard policy gates?
4. Can you fuse OSINT, internal operational data, and third-party intelligence in one model?
5. Can you demonstrate who ran what, why, and under which governance policy?

## Vendor Battlecards

### 1) ShadowDragon

- **Best at:** Continuous OSINT monitoring and broad collection posture.
- **Summit angle:** Move from monitoring outputs to repeatable, governed case execution.
- **Trap questions:**
  - Show reproducible run replay for a prior case.
  - Show policy/version controls on investigation workflows.

### 2) Social Links

- **Best at:** Investigator UI and API-driven source access.
- **Summit angle:** Preserve source value, add orchestration/governance/reproducibility above it.
- **Trap questions:**
  - Demonstrate evidence-pack export for an audited case.
  - Demonstrate persistent cross-case entity model continuity.

### 3) Maltego

- **Best at:** Analyst speed for exploratory pivots.
- **Summit angle:** Institutionalize repeatability and case governance beyond analyst craft.
- **Trap questions:**
  - How do you enforce uniform SOPs across analysts?
  - Where are high-risk workflow approvals encoded?

### 4) IBM i2 Analyst’s Notebook

- **Best at:** Mature link analysis in established programs.
- **Summit angle:** Add modern runtime automation and policy-gated intelligence workflows.
- **Trap questions:**
  - What is the runtime for automated case execution beyond charting?
  - How long to operationalize a new method end-to-end?

### 5) Blackdot (Videris)

- **Best at:** End-to-end OSINT investigator platform footprint.
- **Summit angle:** Differentiate on playbook lifecycle controls and provenance replay.
- **Trap questions:**
  - Can each analytic claim be replayed from captured evidence?
  - Can workflows be tested/versioned/approved in CI-like gates?

### 6) Skopenow

- **Best at:** Fraud/risk insight packaging.
- **Summit angle:** Shift from dashboards to defensible case products.
- **Trap questions:**
  - Can outputs survive formal audit with source-level evidence?
  - Can SOPs be encoded and enforced consistently?

### 7) OSINT Industries

- **Best at:** Fast single-purpose account discovery.
- **Summit angle:** Treat as connector into full evidence graph and case lifecycle.
- **Trap question:**
  - How do you progress from lookup to governed investigation closure?

### 8) Cyabra

- **Best at:** Narrative manipulation and inauthentic network detection.
- **Summit angle:** Convert alerts into full attribution and multi-domain investigations.
- **Trap questions:**
  - Can social findings be fused with non-social operational data in one case graph?
  - Do you preserve evidence lineage across campaign-to-case lifecycle?

### 9) Recorded Future

- **Best at:** Threat intelligence enrichment and CTI program scale.
- **Summit angle:** Use as feed while Summit governs case workflows and evidence products.
- **Trap questions:**
  - Can non-cyber investigations run under same reproducible evidence model?
  - How are internal enterprise entities modeled alongside threat objects?

### 10) Orpheus Cyber

- **Best at:** Underwriting and risk-rating operations.
- **Summit angle:** Pair ratings with investigation-grade evidence products for decisions.
- **Trap questions:**
  - Is there full investigative lifecycle support or risk score delivery only?
  - How are high-stakes decisions policy-gated and replayable?

### 11) Graphistry

- **Best at:** Visual analytics at graph scale.
- **Summit angle:** Summit provides evidence graph + runtime; visualization remains pluggable.
- **Trap question:**
  - Where are provenance, policy, and playbook execution controls enforced?

### 12) Palantir (Gotham/Foundry)

- **Best at:** Broad operational fusion at enterprise/government scale.
- **Summit angle:** Out-specialize with faster deployment and investigation-specific governance.
- **Trap questions:**
  - Time to deploy a new governed playbook to production?
  - How is reproducibility drift measured and controlled across environments?

## Fast Proof Package for Competitive Deals

1. **Playbook Library:** 10–20 canonical procedures with approval and version history.
2. **Evidence Bundle Export:** Hashes, source captures, citation map, replay manifest.
3. **Replay + Diff:** Deterministic rerun showing deltas and causal explanation.
4. **Policy Gates:** RBAC/ABAC + audit controls on who can execute what and where.

## Governance Notes for Field Teams

- Anchor all claims to citable artifacts.
- Avoid FUD and avoid unverifiable pricing claims.
- Lead with defensibility, reproducibility, and operational speed.
- Position complements explicitly to reduce procurement friction.
