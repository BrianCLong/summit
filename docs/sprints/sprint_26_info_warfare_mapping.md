# Sprint 26: Information Environment Mapping

## Sprint Window
**Start:** 2025-12-01
**End:** 2025-12-12
**Duration:** 10 working days
**Team Capacity:** 35 points (Information Warfare Track)

## Sprint Goal
Ship the **Information Environment Map (IEM)** visualization while unlocking the **Narrative Density Scoring** backbone. This establishes the "Battlefield View" for the Information Warfare series.

## Success Metrics
| Metric | Target | Verification Method |
|--------|--------|---------------------|
| **Time to Map** | < 5 seconds | End-to-end latency test (Ingest → UI Update) |
| **Map Query Perf** | p95 < 500ms | k6 load test on `informationEnvironmentMap` resolver |
| **Density Accuracy** | 100% | Unit test verifying density calculation logic |

## Scope

### Must-Have (P0)
- [ ] **IEM-01**: [FE] Implement IEM Map Pane (8 pts)
- [ ] **IEM-02**: [BE] Geo-Spatial Node Indexing (5 pts)
- [ ] **IEM-03**: [BE] Map Data Resolver (5 pts)
- [ ] **NDS-01**: [BE] NarrativeDensityService Scaffolding (5 pts)
- [ ] **NDS-02**: [BE] Real-time Score Updates (5 pts)

### Should-Have (P1)
- [ ] **IEM-04**: [FE] Map Interaction & Drill-down (3 pts)
- [ ] **NDS-03**: [DB] Density Decay Job (3 pts)

### Stretch (P2)
- [ ] **OPS-01**: [CI] Map Performance Test (2 pts)
- [ ] **OPS-02**: [SEC] Map Authorization (2 pts)

## Epic Breakdown

### Epic: Information Environment Map (IEM)
**Owner:** Frontend Lead

#### IEM-01: Implement IEM Map Pane (8 pts)
**Description:** Create a new pane in `apps/web` using `react-leaflet`. Overlay a heatmap layer representing narrative density.
**Acceptance Criteria:**
- Pane renders a map centered on user's default region.
- Heatmap layer visualizes density data.
- Responsive to window resizing.

#### IEM-02: Geo-Spatial Node Indexing (5 pts)
**Description:** Update `Neo4j` schema to add `point()` locations to `Entity` nodes. Create spatial indexes for viewport querying.
**Acceptance Criteria:**
- `Entity` nodes have `lat` and `long` properties indexed.
- Cypher queries using `point()` distance functions are performant.

#### IEM-03: Map Data Resolver (5 pts)
**Description:** Create GraphQL endpoint `informationEnvironmentMap(bounds: Box)` returning nodes + density scores within the view.
**Acceptance Criteria:**
- Resolver accepts bounding box coordinates.
- Returns list of nodes with IDs, coordinates, and density scores.
- Validates tenant access.

#### IEM-04: Map Interaction & Drill-down (3 pts)
**Description:** Clicking a "Hotspot" on the map opens the existing `GraphIntelligencePane` focused on those nodes.
**Acceptance Criteria:**
- Click event handler on map markers.
- Updates global application state to select the clicked node.
- Switches view or opens side panel details.

### Epic: Narrative Density Service (NDS)
**Owner:** Backend Lead

#### NDS-01: NarrativeDensityService Scaffolding (5 pts)
**Description:** Create service `NarrativeDensityService`. Method `calculateDensity(nodeId)` based on edge count + recent events.
**Acceptance Criteria:**
- Service is instantiated as a singleton.
- `calculateDensity` returns a normalized float (0.0 - 1.0).
- Unit tests cover calculation logic.

#### NDS-02: Real-time Score Updates (5 pts)
**Description:** Connect `IngestionService` events to `NarrativeDensityService`. When new evidence arrives, re-calc density and push via Redis Pub/Sub.
**Acceptance Criteria:**
- Listens for `ingestion.complete` events.
- Triggers density recalculation.
- Publishes update to `narrative.density.update` channel.

#### NDS-03: Density Decay Job (3 pts)
**Description:** Implement a `pg-boss` job that decays density scores over time (narratives cool down) every hour.
**Acceptance Criteria:**
- Job runs hourly.
- Reduces score of nodes with no recent activity.
- Persists updated scores.

## Definition of Ready (DoR)
- [x] Requirements clear and testable
- [x] Dependencies identified (Leaflet, Neo4j Spatial)
- [x] Technical approach agreed (WebSocket for updates)

## Definition of Done (DoD)
- [ ] Code reviewed and merged
- [ ] Unit tests ≥80% coverage
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Performance SLOs met

## Risk Register
| Risk | Impact | Probability | Mitigation | Owner |
|------|--------|-------------|------------|-------|
| Map render performance on large datasets | High | Medium | Implement clustering and server-side aggregation | FE Lead |
| Real-time update flood | Medium | High | Debounce updates on client, batch on server | BE Lead |
