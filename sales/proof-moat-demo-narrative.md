# Proof Moat Demo Narrative: Winning the FS CISO Room

## Audience Profile

- **CISO:** Cares about board optics, avoiding personal liability, and resource efficiency.
- **Head of IT Audit / Risk:** Cares about reproducibility, documentation, and OCC/SEC compliance.
- **Head of CTI:** Cares about workflow integration, time-to-insight, and not throwing away their existing Recorded Future deployment.

## The Hook: The Existential Problem (Minutes 0-5)

**Narrator:** *"You are currently consuming thousands of threat indicators a day from Recorded Future and your ISACs. When a critical alert fires, your team makes a decision. But when the regulator—or the board—asks three months later:* 'Why was this specific alert deprioritized?' *or* 'Prove to me the data chain that led to this risk score,' *can you do it without a week of manual forensics?"*

*Pause for effect. They usually can't.*

**Narrator:** *"That is the governance gap. Summit CompanyOS doesn't replace your feeds. We are the intelligence governance layer that turns raw signals into a mathematically provable, regulator-ready chain of custody. We call this the Proof Moat."*

## The Demo: The Pipeline & The Proof (Minutes 5-15)

### Scene 1: Ingestion & The Snapshot

- **Action:** Show a simulated high-impact ransomware indicator hitting the Summit pipeline (ingested from a simulated RF API).
- **Narrative:** *"Notice what happens the millisecond this hits our sovereign VPC. We don't just log it; we take a deterministic snapshot of the world state—your policies, your asset maps, the threat data—and we cryptographically sign it. (UDR-AC benchmark). This is your evidence locker."*

### Scene 2: The Policy Overlay & Business Translation

- **Action:** Show the scoring engine applying an FS-specific blueprint.
- **Narrative:** *"Here is where generic intelligence becomes financial intelligence. We aren't just giving this a 'CVSS 9.0'. The system is applying a 'Regulatory Exposure Modifier' because this targets payment infrastructure, and a 'Revenue-impact Asset Mapping' based on your internal CMDB."*

### Scene 3: The Explainer & The Audit Trail

- **Action:** Click into the generated intelligence bundle. Show the deterministic report hash and the exact policy versions used to score it.
- **Narrative:** *"This is what the OCC wants to see. This isn't a black box AI hallucination. This is a deterministic, replayable pipeline. If you run this exact bundle through the system three years from now, it will yield the exact same score, providing complete litigation discovery defense."*

## The Close: Sovereignty & Workflow (Minutes 15-20)

### Scene 4: The Push to GRC

- **Action:** Click 'Escalate'. Show the ticket instantly appearing in ServiceNow/Archer.
- **Narrative:** *"We don't want your analysts living in another pane of glass. When this escalates, the entire cryptographic bundle—the Proof Moat—is attached to the Jira or ServiceNow ticket."*

### Scene 5: The Hybrid Guarantee

- **Narrative:** *"And the best part? All of this happened inside your boundary. Because Summit is an offline-first, hybrid-deployed OS, your sensitive telemetry never egressed to a multi-tenant SaaS. You maintain complete sovereign control over your intelligence."*

## Summary of the Win

By shifting the conversation from "We have better threat data" to "We make your threat data legally defensible," Summit changes the buying criteria from a technical nice-to-have to a governance mandate.
