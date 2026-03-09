# Summit Feature Epic: Narrative Early-Warning and Tipping-Point Detection

## Overview

Current work simulates narrative impact using generic time-series forecasting. There is no dedicated "early warning" layer for when a fringe narrative is about to flip into mainstream salience. This feature introduces a specialized "Tipping Point" detection engine that monitors narratives for viral precursors ($R_t$, cross-community penetration, elite uptake) and alerts analysts before breakout occurs.

## Epics

### Epic 1: Tipping Point Indicators
Implement domain-specific metrics for narrative virality that go beyond simple volume forecasting.
- **Narrative Reproduction Number ($R_t$)**: Calculate the effective reproduction number based on re-share/interaction velocity per time unit.
- **Cross-Community Penetration**: Quantify how many distinct community clusters a narrative has infected using graph partitioning (Louvain/Leiden).
- **Elite Uptake**: Track engagement from high-centrality nodes ("Elites") within the graph.
- **Velocity & Acceleration**: First and second-order derivatives of narrative volume.

### Epic 2: Watchlist & Alerting System
Enable analysts to curate watchlists of narratives (or narrative patterns) and set custom risk thresholds.
- **Watchlist CRUD**: APIs to create/manage lists of tracked narratives.
- **Threshold Configuration**: Define alerts for when specific indicators (e.g., $R_t > 1.5$) are breached.
- **Push Alerts**: Real-time notifications via GraphQL subscriptions or webhooks when thresholds are crossed.

### Epic 3: Graph Schema Extensions
Extend the Neo4j schema to store these new metrics and configurations efficiently.
- New `NarrativeMetric` nodes for time-series history within the graph (or hybrid storage).
- `WATCHLIST` relationships linking `User` or `Team` to `Narrative` nodes.
- Properties on `Narrative` for current $R_t$ and risk score.

### Epic 4: Simulation Integration
Update `NarrativeSimulationStudio` to compute these metrics during simulation ticks, allowing for "what-if" analysis of tipping points in synthetic scenarios.

## Neo4j Schema Extensions

```cypher
// 1. Narrative Node Extensions
// Existing Narrative nodes will get new properties for real-time risk assessment.
ALTER TYPE Narrative {
  current_rt: Float
  risk_score: Float // 0-100 aggregated risk
  penetration_score: Float // 0-1 measure of community spread
  is_watchlisted: Boolean
}

// 2. NarrativeMetric Node
// Stores historical snapshots of metrics for trend analysis.
// Ideally time-series data goes to a TSDB, but we model it here for graph traversal.
CREATE (nm:NarrativeMetric {
  timestamp: DateTime,
  rt: 1.5,
  velocity: 450, // posts per hour
  elite_count: 5,
  community_count: 3
})
(n:Narrative)-[:HAS_METRIC]->(nm)

// 3. Watchlist Management
(u:User)-[:MONITORS]->(w:Watchlist)
(w)-[:TRACKS]->(n:Narrative)

// 4. Community/Cluster Nodes (for Penetration calc)
(n:Narrative)-[:INFECTED_CLUSTER]->(c:CommunityCluster {
  id: "cluster_123",
  penetration_rate: 0.15
})
```

## GraphQL API Extensions

### Types

```graphql
type NarrativeRiskProfile {
  narrativeId: ID!
  currentRt: Float
  riskScore: Float
  velocity: Float
  eliteUptake: Int
  communityPenetration: Float
  history(limit: Int): [NarrativeMetric!]!
}

type NarrativeMetric {
  timestamp: String!
  rt: Float
  velocity: Float
  eliteCount: Int
  communityCount: Int
}

type Watchlist {
  id: ID!
  name: String!
  owner: User!
  items: [Narrative!]!
  alertConfig: AlertConfig
}

input AlertConfigInput {
  rtThreshold: Float
  riskScoreThreshold: Float
  notifyChannels: [String!]
}
```

### Queries & Mutations

```graphql
extend type Query {
  # Get top narratives nearing tipping point
  narrativesNearTippingPoint(limit: Int, minRt: Float): [NarrativeRiskProfile!]!

  # Get my watchlists
  myWatchlists: [Watchlist!]!
}

extend type Mutation {
  createWatchlist(name: String!, narrativeIds: [ID!], alertConfig: AlertConfigInput): Watchlist!
  addToWatchlist(watchlistId: ID!, narrativeId: ID!): Watchlist!
  setNarrativeAlertConfig(narrativeId: ID!, config: AlertConfigInput): Narrative!
}

extend type Subscription {
  # Real-time alert when a watchlist item breaches threshold
  onNarrativeAlert(watchlistId: ID): AlertEvent!
}
```

## Simulation Hooks (Pseudo-Code)

Integration into `packages/narrative-engine/src/core/EventProcessor.ts`:

```typescript
class TippingPointDetector {

  // Called every simulation tick
  analyze(narrativeState: NarrativeState, recentEvents: Event[]) {
    for (const narrativeId of narrativeState.activeNarratives) {
      const events = recentEvents.filter(e => e.narrativeId === narrativeId);

      // Calculate R_t
      const rt = this.calculateRt(events, narrativeState);

      // Calculate Community Penetration
      const penetration = this.calculatePenetration(events, narrativeState.graph);

      // Check Thresholds
      if (rt > THRESHOLD_RT && !narrativeState.get(narrativeId).alertSent) {
        this.emitAlert(narrativeId, { type: 'BREAKOUT_WARNING', value: rt });
      }

      // Update State
      narrativeState.updateMetrics(narrativeId, { rt, penetration });
    }
  }

  calculateRt(newEvents: Event[], state: NarrativeState): number {
    // Basic implementation: Ratio of new infections to active spreaders
    // Advanced: Wallinga-Teunis method
    return (newEvents.length / state.activeSpreaders.length) * state.averageGenerationTime;
  }
}
```

## Success Metrics

1.  **Detection Lead Time**: Average time between a "Tipping Point Alert" and the actual mainstream breakout (defined as > 10k mentions/hour). Target: > 4 hours.
2.  **False Positive Rate**: Percentage of alerts that do not result in a breakout event within 24 hours. Target: < 15%.
3.  **Analyst Action Rate**: % of alerts that result in an analyst taking an action (e.g., deploying a counter-narrative, generating a report).
4.  **Simulation Fidelity**: Correlation between simulated $R_t$ curves and historical real-world data for known campaigns.

---

## Phase 2: Frame-First & Role-Based Detection (2026-01-27 Strategy)

Based on the strategic directive `docs/strategy/2026_01_27_NARRATIVE_WARFARE_DIRECTIVE.md`, we are expanding detection capabilities to focus on structural frames and baseline drift.

### Core Objectives
1.  **Frame Extraction**: Identify latent narrative frames (invariant cores) distinct from surface claims.
2.  **Role Classification**: Classify actors as `INITIATOR`, `VALIDATOR`, or `AMPLIFIER` based on temporal graph behavior.
3.  **Drift Analytics**: Monitor long-term (30-90 day) shifts in discourse baseline rather than just short-term viral spikes.

### Schema Extensions (Implemented)
*   **NarrativeFrame**: Tracks the invariant core and stability score of a frame.
*   **BaselineDrift**: Metrics for tracking slow-burn influence.
*   **ActorRole**: Enum for behavioral classification.

### Implementation Priorities
*   Integrate `FrameExtraction` into the OSINT ingestion pipeline.
*   Update `RiskAssessment` logic to weigh `driftScore` heavily for "safe" but persistent content.
*   Visualize `Frame` evolution lineages in the frontend.
