# Advanced Graph Interactions

This UI layer introduces:

- Performance-minded Cytoscape rendering with LOD (Level of Detail) labels.
- Context menu actions on right-click (expand neighbors, tag entity, send to AI).
- Real-time AI insights overlay powered by Socket.IO.
- Redux state for selection and insights cache.

## Keyboard & Selection
- Space: temporarily enables pan mode; release to restore selection mode.
- Esc: clears current selection and unselects all.
- Shift+Click: additive multi-select (Cytoscape default with box selection).
- Tap node/edge to select; tap canvas or press ESC to clear.
- LOD labels toggle in the overlay (top-left controls).

## AI Insights Panel
- Right drawer shows summary, suggestions, and related nodes.
- Updates on `ai:insight` events via Socket.IO.

## Context Menu
- Right-click node/edge → menu with actions:
  - Expand Neighbors → GraphQL mutation returns nodes/edges.
  - Tag Entity → adds a tag via GraphQL.
  - Send to AI Analysis → emits `ai:request` via Socket.IO for lower latency.
  - Inspect Relationship (edges) → open inspector (placeholder).

## Extending
- Chunk large graph updates via `requestIdleCallback` + `cy.batch()`.
- Add sprite atlas for labels if needed for 50k+ nodes.
- Add tooltip hover previews (throttled) and layout switcher (top-left).
