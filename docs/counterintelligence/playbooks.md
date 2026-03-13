# Counterintelligence Playbooks

This document provides example playbooks and scenarios for using Summit's counterintelligence (CI) capabilities defensively. These playbooks are designed for defenders and intelligence analysts; they do NOT involve active influence operations.

## Playbook 1: Identifying a Coordinated Narrative Campaign

**Scenario**: An analyst notices a sudden surge in social media content delegitimizing a local utility's infrastructure maintenance project.

**Goal**: Identify if this surge is organic or a coordinated adversarial operation.

**Steps**:
1.  **Ingestion**: Ensure data from relevant social media and news outlets is being ingested into the `IngestPipeline`.
2.  **Coordination Detection**: Check the `CoordinationDetector` for any synchronized narrative bursts. Look for high similarity in language and compressed timeframes.
3.  **Pattern Matching**: Run the `PatternLibrary` against the ingested data. Specifically, check for the `coordinated_delegitimization` pattern.
4.  **Risk Scoring**: Use the `CounterintelligenceScorer` to generate a composite risk score for the identified narrative. A score in the 'High' or 'Critical' range ( > 0.6) suggests coordination.
5.  **Visualization**: Use the `NarrativeGraph` to visualize the relationship between documents and identify key clusters of participation.

---

## Playbook 2: Monitoring and "Turning" Adversarial Assets

**Scenario**: A botnet cluster has been confirmed as adversarial and is currently being used to seed disinformation.

**Goal**: Monitor the asset to gain defensive insights and early warnings of campaign shifts.

**Steps**:
1.  **Triage**: Mark the identified botnet cluster as an `AdversarialAsset` with an initial state of `CONFIRMED_ADVERSARIAL`.
2.  **Turning for Monitoring**: Using the `AssetTurningService`, transition the asset to the `TURNED` state. *Justification: Monitoring for early warning of TTP shifts.*
3.  **Defensive Observation**: Observe the asset's activity without interacting with it. Focus on identifying new TTPs, target audiences, or narrative pivots.
4.  **Recording Insights**: Record any defensive insights gained (e.g., "Asset transitioned to targeting local government officials using a new 'corruption' frame") using the `record_insight` primitive.
5.  **Alerting**: Configure a `Tripwire` to alert if the turned asset crosses a critical engagement state or exhibits a major surge in activity.

---

## Playbook 3: Responding to a Possible Probing Attack

**Scenario**: Multiple failed login attempts and anomalous data probes are detected, coinciding with a subtle shift in adversarial narrative focus.

**Goal**: Determine if the technical probes are part of a broader "possible probing" narrative campaign.

**Steps**:
1.  **Correlation**: Use the `hybrid_correlation.py` utility to correlate the technical probing events with narrative spikes.
2.  **Scoring**: Run the `CounterintelligenceScorer` with the `possible_probing` qualitative label.
3.  **Governance Review**: Ensure that all monitoring activities are conducted within the pre-defined legal and ethical constraints, as flagged in the `flags.py` configuration.
4.  **De-escalation**: Focus on strengthening technical defenses and providing transparent, evidence-based communications to counter the probing narrative.
