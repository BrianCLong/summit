# Roadmap

**MVP (Day 0–30):** Neo4j + temporal/confidence; Streamlit; Wikipedia connector; GraphRAG prototype; ABAC baseline.

**Phase 2 (Day 31–90):** React UI; GraphQL gateway; additional connectors (Have I Been Pwned, Twitter/X, VirusTotal*); runbooks for Fraud, Disinfo, Dark Web; OTel mapper.

**Phase 3 (Day 91–180):** DFIR adapters; JanusGraph option; DP exports; blockchain anchoring; KYC/AML-rulepacks.

*Note: Integrations subject to license/ToS.

## Future Enhancements / Research Areas

- **Entity & Edge Mapping:** Create explicit graph node types for botnet orchestration clusters, cognitive anchors, and sentiment drift vectors.
- **Temporal Cadence Modeling:** Encode “narrative burst” patterns from bot/troll amplification so you can identify not just what is spreading, but when influence spikes occur.
- **Cross-Domain Fusion:** Integrate these entities with HUMINT (SME X) and SIGINT (SME Y) data models to attribute influence ops to actors and campaigns with higher confidence.
- **Neuroadaptive Content Systems:** AI that dynamically adjusts influence messaging in real time based on biometric or behavioral feedback. This is moving from theory to early field trials. It will require provenance tracking at the message variant level in IntelGraph.
- **Autonomous Counter-PsyOps Agents:** AI agents designed to detect and flood influence channels with truth-saturated counter-narratives in seconds, not hours. In graph terms, that’s a “real-time narrative inoculation” layer with nodes for counter-message origins, reach, and effectiveness scoring.
- **Add a centralized identity resolution engine:**
    - Resolve multiple identifiers (e.g., aliasing, codename reuse, platform-specific IDs) across domains.
    - Maintain immutable provenance trails.
    - Fuse conflicting attributes with probabilistic scoring (e.g., fuzzy DOB matching, geospatial overlap).
- **Inject synthetic tradecraft behaviors, deception campaigns, and compromised source data to test resilience.**
- **Automate scoring of analyst and algorithm response quality under pressure scenarios.**
- **Behavioral telemetry collection on analyst usage patterns:**
    - Detect premature convergence or bias in analyst investigation paths.
    - Model analyst decision trails as graph nodes for audit and training feedback loops.
    - Feed this into alerting logic to avoid blind spots.
- **Cross-Domain Fusion Protocol**
    - Introduce a Cross-Domain Fusion Facilitator role — a bridge agent/person that ensures modeling and alerting logic coherently fuses HUMINT, SIGINT, OSINT, and influence data. Responsibilities:
        - Translate inter-domain signals into shared entity-relationship constructs.
        - Resolve confidence conflicts between modalities.
        - Harmonize time/space anchoring across sources.
- **Role-Level: Strategic Integrator / Interop Architect**
    - Prompt: Define and evolve interoperability standards across allied systems, vendors, and classification levels. Establish STANAG/NIEM-compliant interfaces and schema mappings. Lead cross-domain data fusion design.
    - Questions:
        - Are we STIX 2.1/NIEM/Multilateral-ready?
        - What red/black boundary translation gaps exist?
        - Are we modeling classification levels and release caveats for coalition sharing?
    - Why: If IntelGraph aims for real-world deployment or simulation fidelity, interop with allied platforms (e.g., NATO, Five Eyes, JSOC, IC) is critical.
- **Role-Level: Red Team/Adversary Emulation Engineer**
    - Prompt: Simulate threat actor TTPs (MITRE ATT&CK, MISP), inject synthetic adversarial patterns, and validate detection/modeling efficacy. Feed adversary behavior into HUMINT/CYBER/INFLUENCE graphs.
    - Questions:
        - Are current detections biased by known patterns only?
        - Which TTPs are least modeled in our schema?
        - Can we simulate blended ops (e.g., HUMINT + Influence + CYBER)?
    - Why: Enhances model robustness and supports real-time validation. Useful for training, wargaming, and ML evaluation.
- **Cross-Cutting: Trust & Provenance Metadata Layer**
    - Proposal: Define a universal trust/provenance ontology across all intelligence types—HUMINT, SIGINT, GEOINT, OSINT—with time-decay, source lineage, and corroboration status.
    - Deliverables:
        - Common trust_score() function with source-class weights
        - Time-decayed credibility curves
        - Corroboration chains with links to original sensors/agents
    - Why: Prevents fragmentation in scoring and supports transparent, justifiable alerts and analytics. Essential for multi-INT fusion.
- **Modeling Suggestion: “Operational Intent” Layer**
    - Goal: Encode inferred or explicit intentions behind actors/entities (e.g., recruitment, sabotage, exfiltration) derived from pattern fusion or SME annotation.
    - Use Case Examples:
        - Predictive analytics (e.g., next probable action)
        - Tradecraft mapping (e.g., development phase → active ops)
        - Influence trajectory estimation
    - Why: Supports proactive defense and analyst workflows focused on “what’s next.”
- **Operational Compromise Recovery Modeling**
    - Description: Simulate data/model corruption scenarios and build response pathways in graph logic.
    - Priority: High
- **Deception Detection Algorithms**
    - Description: Use anomaly, linguistic, and topological cues to detect fake personas, planted signals, or compromised nodes.
    - Priority: High
- **Compartmentation-Aware Access Control Layer**
    - Description: Beyond ABAC—add dynamic trust scoring, compartment logic, and behavioral gating to access sensitive entities.
    - Priority: Critical
- **Graph Time-Series Forecasting Module**
    - Description: Predict future node/link emergence or decay across entity types (e.g., actor activity, signal propagation).
    - Priority: Medium
- **Global Threat Indicator Ontology (GTIO)**
    - Description: Unified taxonomy of threat indicators across HUMINT, SIGINT, OSINT, GEOINT, Cyber. Tied to confidence decay and fusion rules.
    - Priority: High