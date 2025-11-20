# IP Console UI

## Overview

The IP Console provides a unified, interactive view of all IP families tracked in the Summit/IntelGraph platform.

**Route**: `/ip-console` or `/admin/ip`

## Current Status: MVP Scaffold

This is a **static scaffold** that demonstrates the UX vision for the IP Console. It currently:

✅ **Implemented**:
- Displays IP families from mock data (based on `docs/ip/ip-registry.yaml`)
- Search and filter by status (idea, partial, MVP, v1, v2+)
- Card-based grid layout with key metrics
- Links to code modules (GitHub)
- Summary statistics dashboard

❌ **Not Yet Implemented** (future work):
- Backend API integration (serve `ip-registry.yaml` via GraphQL)
- Real-time metrics from `scripts/ip-metrics.ts`
- Edit capabilities (update status, add notes, assign owners)
- Detailed modal view for each family
- Roadmap progress visualization (burndown charts)
- Integration with GitHub issues (link epics to families)

## Usage

### Add to Router

In `client/src/routes/index.ts` (or similar), add:

```typescript
import { IPConsolePage } from '../pages/IPConsole';

// Inside your route configuration:
{
  path: '/ip-console',
  element: <IPConsolePage />,
  // Optional: Protect route with auth
  // loader: requireAuth,
}
```

### Navigation Link

Add to admin sidebar or main nav:

```typescript
<ListItem button component={Link} to="/ip-console">
  <ListItemIcon><CodeIcon /></ListItemIcon>
  <ListItemText primary="IP Console" />
</ListItem>
```

## Development Roadmap

### Phase 1: Static UI (Current)
- [x] Scaffold page with mock data
- [x] Card layout with search/filter
- [x] Summary stats
- [x] Links to code and docs

### Phase 2: Backend Integration (Next)
- [ ] GraphQL API to serve `ip-registry.yaml`
- [ ] Query for real-time metrics from `ip-metrics.ts` output
- [ ] Webhook or polling to refresh data

### Phase 3: Editing & Management
- [ ] Edit family status, owner, notes (mutation API)
- [ ] Bulk operations (assign owners, update statuses)
- [ ] History/changelog tracking

### Phase 4: Advanced Features
- [ ] Detailed modal with full family data (horizons, risks, dependencies)
- [ ] Roadmap visualization (timeline, burndown, Gantt)
- [ ] GitHub issue integration (show linked PRs/issues)
- [ ] Metrics trends (coverage over time, velocity charts)

## API Requirements

### GraphQL Queries

```graphql
# Get all IP families
query GetIPFamilies {
  ipFamilies {
    family_id
    name
    summary
    status
    owner
    modules
    capabilities
    horizons {
      h0_hardening
      h1_mvp
      h2_v1
      h3_moonshot
    }
    risks
    dependencies
    tags
  }
}

# Get IP metrics (from ip-metrics.ts output)
query GetIPMetrics {
  ipMetrics {
    global {
      total_families
      avg_coverage_pct
      families_below_50pct
    }
    families {
      family_id
      modules_listed
      modules_found
      coverage_pct
      annotated_files
    }
  }
}
```

### GraphQL Mutations

```graphql
# Update family status
mutation UpdateIPFamilyStatus($family_id: String!, $status: IPFamilyStatus!) {
  updateIPFamilyStatus(family_id: $family_id, status: $status) {
    family_id
    status
  }
}

# Assign owner
mutation AssignIPFamilyOwner($family_id: String!, $owner: String!) {
  assignIPFamilyOwner(family_id: $family_id, owner: $owner) {
    family_id
    owner
  }
}
```

## File Structure

```
client/src/pages/IPConsole/
├── IPConsolePage.tsx        # Main page component
├── components/
│   ├── FamilyCard.tsx       # Individual family card (future)
│   ├── FamilyDetailModal.tsx # Detailed view modal (future)
│   ├── MetricsChart.tsx     # Metrics visualization (future)
│   └── RoadmapTimeline.tsx  # Roadmap timeline view (future)
├── hooks/
│   ├── useIPFamilies.ts     # GraphQL query hook (future)
│   └── useIPMetrics.ts      # Metrics query hook (future)
├── index.ts                 # Barrel export
└── README.md                # This file
```

## Styling

Uses Material-UI (MUI) components to match existing Summit UI:
- `Container`, `Grid`, `Card`, `Chip`, `Button`
- Primary color for active states
- Success/warning colors for status indicators

## Testing

### Manual Testing

1. Navigate to `/ip-console` after adding route
2. Verify:
   - All mock families display
   - Search filters correctly
   - Tab filters work (All, In Development, MVP, Shipped)
   - Links open in new tabs
   - Summary stats calculate correctly

### Future Automated Tests

```typescript
describe('IPConsolePage', () => {
  it('displays all families by default', () => { ... });
  it('filters families by search term', () => { ... });
  it('filters families by status tab', () => { ... });
  it('calculates summary stats correctly', () => { ... });
  it('opens detail modal on "View Details" click', () => { ... });
});
```

## Questions?

See:
- `docs/ip/PLATFORM_OVERVIEW.md` for IP Platform architecture
- `docs/ip/ip-registry.yaml` for family data schema
- `docs/ip/IP_PROGRAM_ROADMAP.md` for roadmap details
