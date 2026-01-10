# Investigator Workbench Overview

## Philosophy

The Investigator Workbench is the primary "shell" for analysts. It follows a "Context-Canvas-Detail" pattern:

1.  **Left (Context):** What am I working on? (Cases, Lists, Saved Views)
2.  **Center (Canvas):** The visual workspace (Graph, Timeline, Map).
3.  **Right (Detail):** Specifics about what is selected.

## Architecture

### Component Hierarchy

- `WorkbenchShell`: Manages layout state (rails open/closed) and global toolbar.
- `LinkAnalysisCanvas`: Wraps D3 visualization, handles graph interaction events.
- `InspectorPanel`: Reacts to selection state to show details.

### State Management

We use `zustand` with persistence middleware (`workbench/store/viewStore.ts`).

- **Selection State:** Global array of selected IDs.
- **View State:** Layout positions, filters, and active layers.
- **Saved Views:** array of serialized view states stored in local storage (MVP) or backend.

### Extensibility

Other teams can plug in:

- **New Pane Types:** Add to the central switch in `WorkbenchShell`.
- **Inspector Tabs:** Add new components to `InspectorPanel` based on entity type.
- **Context Menus:** Register actions in `LinkAnalysisCanvas`.

## Integration Points

- **Provenance:** The inspector should link back to the `ProvenanceLedger` via the entity ID.
- **Cases:** The Left Rail should consume the Case API to list active investigations.
- **Analytics:** Canvas actions (Expand) should call graph algorithms.

## Usage

Import `WorkbenchShell` and mount it at a route (e.g., `/workbench`).

```tsx
import { WorkbenchShell } from '@/workbench/shell/WorkbenchLayout'
// ...
;<Route path="/workbench" element={<WorkbenchShell />} />
```
