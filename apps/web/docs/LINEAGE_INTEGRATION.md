# Lineage Explorer & "Why am I seeing this?" widget

The lineage feature is intentionally read-only and can be embedded in any host surface.

## API contract

A minimal API surface is exposed at `GET /api/lineage/:id` which returns a lineage graph:

```json
{
  "targetId": "evidence-123",
  "targetType": "evidence",
  "policyTags": ["PII", "LICENSED"],
  "upstream": [{ "id": "ingest-1", "label": "S3 Intake", "type": "source", "tags": ["checksum:verified"] }],
  "downstream": [{ "id": "case-2", "label": "ACME Procurement Review", "type": "case", "tags": ["warrant:required"] }],
  "restricted": false,
  "mode": "read-only"
}
```

Restricted results set `restricted: true` and include a `restrictionReason`; upstream links may also be flagged with `restricted: true` so hosts can avoid leaking detail.

## Embeddable components

The UI module lives under `apps/web/src/features/lineage`:

- `LineageExplorer`: full upstream/downstream view with policy tag badges.
- `WhyAmISeeingThis`: compact explanation widget for embedding in other views (graph node popovers, evidence lists, copilot panels, etc.).

### Example usage

```tsx
import { LineageExplorer, WhyAmISeeingThis } from '@/features/lineage'

// Full explorer
<LineageExplorer entityId="evidence-123" />

// Embedded widget in a graph node panel
<WhyAmISeeingThis
  entityId={node.id}
  contextLabel="Graph node context"
  onViewDetails={(graph) => openDrawer(<LineageExplorer entityId={graph.targetId} initialGraph={graph} />)}
/>
```

Both components accept an `initialGraph` prop to avoid refetching when a parent already has lineage data. They render clear restriction messaging when `restricted` is true.
