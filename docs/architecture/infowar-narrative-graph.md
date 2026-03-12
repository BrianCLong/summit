# Info Warfare Narrative Graph Architecture

This document defines the minimal ontology for the INFOWAR situational picture.

## Nodes
- `Narrative`: A coherent story or message being propagated.
- `Claim`: A specific statement made within a narrative.
- `Actor`: An entity (individual, group, or organization) involved in the propagation or target of a narrative.
- `Platform`: A channel or medium where narratives and claims are observed (e.g., social media, RSS feed).
- `Event`: A real-world occurrence linked to a narrative.
- `Artifact`: A specific piece of content (e.g., a document, image, or video).
- `Regulation`: A legal or regulatory framework affecting the information warfare landscape.

## Edges
- `AMPLIFIES`: An actor or platform increases the visibility of a narrative or claim.
- `REFERENCES`: A narrative or claim points to an artifact or event.
- `TARGETS`: A narrative or claim is directed towards a specific actor or group.
- `COUPLED_WITH`: Indicates a link between two different domains (e.g., a cyber attack coupled with an IO campaign).
- `EVIDENCED_BY`: Connects a narrative, claim, or event to its evidence bundle.

## Integration with Summit
The narrative graph is implemented as a set of Neo4j node and edge types under `src/graphrag/ontology/` and accessed via `src/graphrag/narratives/`.
