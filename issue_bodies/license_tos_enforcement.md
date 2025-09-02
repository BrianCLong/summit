### Context

Source: `docs/ChatOps/intel_graph_dominance_roadmap_beat_every_competitor_exceed_every_wish_2025_2027.md`, `docs/ChatOps/intel_graph_front_end_product_specification_v_1.md`, `docs/PHASE_2A_DEPLOYMENT_CHECKLIST.md`, `docs/testing/README.md`
Excerpt/why: The project emphasizes strong data governance, including strict adherence to data licenses and Terms of Service (TOS). This is critical for legal compliance, ethical data use, and preventing misuse of information, especially in OSINT harvesting and data export scenarios. Multiple documents highlight the need for a dedicated engine and registry.

### Problem / Goal

The system currently lacks a centralized, robust mechanism to enforce data licenses and Terms of Service across all data lifecycle stages (ingestion, processing, export). This exposes the platform to significant legal, ethical, and reputational risks. The goal is to implement a comprehensive data license and TOS enforcement engine, including a data license registry, automated compliance checks, and runtime blocking of non-compliant operations.

### Proposed Approach

- **Data License Registry:** Develop a centralized registry to store and manage license and TOS information for all data sources. This registry will track usage rights, attribution requirements, commercial use restrictions, and other relevant terms.
- **Ingestion-time Enforcement:** Integrate the license/TOS engine into the data ingestion pipeline to block or flag data from disallowed sources and to attach relevant license metadata to ingested data.
- **Query-time Enforcement:** Implement runtime checks (e.g., via OPA policies) that evaluate license and TOS compliance for every data access or query, blocking operations that violate terms.
- **Export Control:** Develop a robust export control mechanism that prevents the export of data with incompatible licenses or TOS. This includes pre-flight checks, clear human-readable reasons for blocking, and an appeal path.
- **UI Integration:** Surface license and TOS information prominently in the UI (e.g., via badges, tooltips, dedicated panels) and provide clear explanations for blocked actions.
- **Compliance Reporting:** Generate automated reports on license and TOS compliance status.

### Tasks

- [ ] Design and implement the Data License Registry schema and API.
- [ ] Develop ingestion-time integration for license/TOS metadata attachment and initial compliance checks.
- [ ] Implement query-time enforcement using OPA policies, integrating with the existing policy engine.
- [ ] Develop the export control mechanism, including pre-flight checks and blocking logic.
- [ ] Design and implement UI components for displaying license/TOS information and explaining blocked actions.
- [ ] Implement automated compliance reporting.
- [ ] Create comprehensive test cases for various license/TOS violation scenarios (e.g., export of restricted data, unauthorized commercial use).

### Acceptance Criteria

- Given a data source with a defined license/TOS, when an operation violates those terms, then the operation is blocked at runtime.
- All ingested data is associated with its correct license/TOS metadata.
- Users are provided with clear, human-readable reasons for blocked operations and an appeal path where applicable.
- 100% of exports include complete and accurate license manifests.
- Metrics/SLO: License/TOS violation detection rate > 99%; false positive rate < 0.5%.
- Tests: Dedicated security and compliance test packs for license/TOS enforcement.
- Observability: Audit logs for all license/TOS checks and enforcement actions, including details of violations.

### Safety & Policy

- Action class: WRITE (blocking exports, modifying data metadata)
- OPA rule(s) evaluated: Core to data governance policies.

### Dependencies

- Depends on: #<id_of_policy_issue>, #<id_of_audit_telemetry_issue>
- Blocks: Any data ingestion, processing, or export that requires legal/ethical compliance.

### DOR / DOD

- DOR: License/TOS enforcement architecture and policy rules approved.
- DOD: Merged, all compliance tests passing, UI integration complete, compliance reports generated.

### Links

- Code: `<path/to/license/engine>`
- Docs: `<link/to/license/policy_documentation>`
