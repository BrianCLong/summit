# Advanced Graph Interactions

This UI layer introduces:

- Performance-minded Cytoscape rendering with LOD (Level of Detail) labels.
- Context menu actions on right-click (expand neighbors, tag entity, send to AI).
- Real-time AI insights overlay powered by Socket.IO.
- Redux state for selection and insights cache.

## Keyboard & Selection
- Tap node/edge to select; tap canvas or press ESC to clear.
- Box selection enabled; Shift for multi-select (Cytoscape default).
- LOD labels toggle in the overlay (top-left controls).

## AI Insights Panel
- Right drawer shows summary, suggestions, and related nodes.
- Updates on `ai:insight` events via Socket.IO.

## Context Menu
- Right-click node/edge → menu with actions:
  - Expand Neighbors → GraphQL mutation returns nodes/edges.
  - Tag Entity → adds a tag via GraphQL.
  - Send to AI Analysis → initiates AI analysis for selection.

## Extending
- Add keyboard shortcuts (Space for pan) and additional menu items.
- Chunk large graph updates via `cy.batch()`.

