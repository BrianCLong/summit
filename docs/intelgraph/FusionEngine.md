# Fusion Engine

The Fusion Engine handles the ingestion of data from external systems into IntelGraph.

## Ingestion Flow

1.  **Receive Payload**: A JSON payload conforming to `FusionPayload`.
2.  **Entity Resolution**: The system attempts to resolve each incoming entity to an existing canonical node using `EntityResolutionService`.
    *   Strategies: ID match, Alias lookup (e.g. Email), Heuristic match.
3.  **Upsert**: Nodes and Edges are upserted into the graph.
    *   New nodes are created.
    *   Existing nodes are updated (attribute merge).
4.  **Epistemic tagging**: Source metadata (provider, timestamp) is attached.

## Adapters

Adapters convert specific provider formats (GitHub Webhook, Maestro Event) into the standard `FusionPayload`.
Current Adapters:
*   `MaestroAdapter`: Converts Run/Task events.
