# ADR-013: Graph Rendering Strategy

**Status:** Proposed

## Context

The Run Graph view needs to render potentially large and complex Directed Acyclic Graphs (DAGs) without blocking the main UI thread.

## Decision

1.  **Library**: We will adopt **Cytoscape.js** as our primary graph rendering library due to its rich feature set, performance, and extensive documentation.
2.  **Layout Offloading**: To prevent UI blocking on large graphs, the layout calculation will be offloaded from the main thread to a **Web Worker**. We will use a layout algorithm like `elk.js` or `dagre` within the worker.
3.  **Level-of-Detail (LOD)**: For graphs with >500 nodes, we will implement LOD techniques. At high zoom levels, nodes will be rendered as simple shapes. Detailed labels and icons will only appear on closer zoom.
4.  **Virtualization**: Edges that are not in the current viewport will be virtualized (not rendered) to improve performance.

## Consequences

- **Pros**: A responsive, non-blocking graph visualization experience even for complex pipelines.
- **Cons**: Increased implementation complexity due to Web Worker communication and state synchronization.
