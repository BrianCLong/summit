# Securiteyes Threat Model & Ontology

The Securiteyes ontology is implemented in IntelGraph (Neo4j) using the following core node labels and relationships.

## Node Labels

*   `ThreatActor`: An individual or group (attributed with confidence).
*   `Campaign`: A coordinated set of actions with a shared objective.
*   `IntrusionSet`: Recurrent patterns/techniques.
*   `TTP`: Tactics, Techniques, and Procedures (mapped to MITRE ATT&CK).
*   `Indicator`: IP, Domain, Hash, etc.
*   `SuspiciousEvent`: A raw event flagged by detectors.
*   `Incident`: An aggregation of events requiring response.
*   `DeceptionAsset`: A defensive trap (honeytoken, etc.).
*   `InsiderRiskProfile`: Risk score and factors for a principal.

## Relationships

*   `ATTRIBUTED_TO`: Campaign -> ThreatActor
*   `USES_TTP`: Campaign -> TTP
*   `INDICATES`: Indicator -> Campaign/Actor
*   `SUSPICIOUS_FOR`: SuspiciousEvent -> Campaign
*   `PART_OF_INVESTIGATION`: Event/Indicator -> Incident
*   `MITIGATED_BY`: Campaign -> Mitigation
*   `TRIGGERED_BY`: SuspiciousEvent -> DeceptionAsset
