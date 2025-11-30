# Cross-System Entanglement Detector™

> **Status**: Production-Ready MVP
> **Last Updated**: 2025-11-27
> **Owner**: Predictive Analytics Team

## Executive Summary

The Cross-System Entanglement Detector discovers hidden relationships and shared failure modes across completely different domains in complex intelligence systems. It identifies latent couplings, synchronization patterns, and cascading risk propagation that traditional monitoring cannot detect.

**Key Value Propositions**:
- **Predict cascading failures** before they occur by mapping hidden system interdependencies
- **Discover non-obvious correlations** between disparate domains (e.g., network latency → analysis quality)
- **Quantify coupling strength** and synchronization depth across system boundaries
- **Map risk propagation paths** through the entanglement graph
- **Early warning system** for multi-system failure scenarios

---

## Problem Statement

### The Challenge of Latent Couplings

Modern intelligence platforms like Summit/IntelGraph consist of dozens of microservices, databases, ML pipelines, and external integrations. Traditional monitoring treats these as independent components, but reality is more complex:

**Hidden Entanglements**:
1. **Temporal Synchronization**: Systems that change state in lockstep despite no direct communication
2. **Resource Contention**: Shared infrastructure creating invisible dependencies
3. **Data Lineage**: Upstream quality issues propagating through transformation pipelines
4. **Cascading Bottlenecks**: Performance degradation in one service causing ripple effects
5. **Emergent Behaviors**: System-of-systems patterns not visible from component metrics

**Real-World Scenarios**:
- Neo4j memory pressure → GraphQL query timeout → Frontend freeze (3-hop cascade)
- Kafka partition lag → ML feature staleness → Copilot quality degradation
- Auth service latency → Connection pool exhaustion → Multi-service failure
- External API rate limits → Queue backup → Database write pressure

### Current Gaps

Existing monitoring tools are **component-centric**:
- Prometheus alerts on individual service metrics
- Distributed tracing shows request paths, not systemic correlations
- Log aggregation lacks cross-domain pattern detection
- APM tools focus on single-service performance

**What's Missing**: A holistic view of **cross-system behavioral coupling** and **predictive failure mode analysis**.

---

## Solution Architecture

### Core Concepts

#### 1. Entanglement Signatures

An **Entanglement Signature** captures the behavioral correlation between two or more systems:

```typescript
interface EntanglementSignature {
  id: string;
  systems: string[];              // Entangled system identifiers
  couplingStrength: number;       // 0.0 - 1.0 (Pearson correlation)
  synchronizationDepth: number;   // Time-lagged correlation depth (ms)
  detectedAt: Date;
  lastObserved: Date;
  signatureType: 'TEMPORAL' | 'CAUSAL' | 'RESOURCE' | 'DATA_LINEAGE';
  confidence: number;             // Statistical confidence (0.0 - 1.0)
  metadata: {
    correlationCoefficient: number;
    lagTime: number;              // Milliseconds
    observationWindow: number;    // Milliseconds
    sampleCount: number;
  };
}
```

#### 2. System Couplings

A **System Coupling** represents a discovered relationship:

```typescript
interface SystemCoupling {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  couplingType: 'BIDIRECTIONAL' | 'UNIDIRECTIONAL' | 'CASCADE';
  strength: number;               // 0.0 - 1.0
  direction: 'FORWARD' | 'REVERSE' | 'MUTUAL';
  detectionMethod: string;
  evidenceCount: number;
  riskScore: number;              // 0.0 - 1.0
  metadata: {
    failureCorrelation: number;   // How often they fail together
    latencyCorrelation: number;   // Performance coupling
    throughputCorrelation: number;
  };
}
```

#### 3. Synchronization Events

Detected instances of synchronized behavior:

```typescript
interface SynchronizationEvent {
  id: string;
  systems: string[];
  timestamp: Date;
  eventType: 'STATE_CHANGE' | 'PERFORMANCE_SHIFT' | 'FAILURE_CASCADE';
  synchronizationScore: number;   // How tightly synchronized (0.0 - 1.0)
  timeWindow: number;             // Detection window (ms)
  metrics: Record<string, number>;
}
```

#### 4. Risk Scores

Predictive risk assessment for failure propagation:

```typescript
interface RiskScore {
  systemId: string;
  overallRisk: number;            // 0.0 - 1.0
  cascadeRisk: number;            // Risk of causing cascading failures
  impactRadius: number;           // Number of coupled systems
  criticalPaths: Array<{
    path: string[];               // Sequence of system IDs
    propagationProbability: number;
    estimatedLatency: number;     // Failure propagation time (ms)
  }>;
  recommendations: string[];
}
```

---

## Core Algorithms

### 1. Latent Coupling Finder

**Algorithm**: Multi-scale correlation mining with statistical validation

```
Input: Time-series metrics from N systems
Output: Set of EntanglementSignatures

1. For each system pair (Si, Sj):
   a. Extract metric vectors over observation window
   b. Compute cross-correlation at multiple lag times (0-60s)
   c. Identify peaks in cross-correlation function
   d. Calculate statistical significance (p-value < 0.01)
   e. If significant:
      - Record coupling strength (max correlation coefficient)
      - Record synchronization depth (lag time at peak)
      - Store entanglement signature

2. Validate against spurious correlations:
   - Check for common cause (shared resource)
   - Verify temporal stability (multiple observation windows)
   - Test for transitivity (A→B→C implies A→C)

3. Cluster signatures by domain:
   - Graph-based clustering on system dependency graph
   - Identify cross-domain vs. intra-domain couplings
   - Prioritize unexpected cross-domain entanglements
```

**Key Metrics**:
- **Pearson correlation coefficient**: Linear relationship strength
- **Spearman rank correlation**: Monotonic relationship (non-linear)
- **Granger causality**: Directional influence testing
- **Transfer entropy**: Information flow quantification

### 2. Synchronization Detector

**Algorithm**: Event-time alignment and pattern matching

```
Input: Event streams from N systems
Output: Set of SynchronizationEvents

1. Define synchronization windows (configurable: 100ms, 1s, 5s, 30s)

2. For each window W:
   a. Extract state change events from all systems
   b. Build temporal event matrix:
      - Rows: Systems
      - Columns: Time buckets (window granularity)
      - Values: Event occurrence indicators

   c. Compute synchronization score:
      score = (events in same bucket) / (total events)

   d. If score > threshold (0.7):
      - Create SynchronizationEvent
      - Identify participating systems
      - Categorize event type (state, performance, failure)

3. Pattern mining:
   - Use frequent itemset mining (Apriori algorithm)
   - Find recurring synchronization patterns
   - Build synchronization signature library
```

**Detection Techniques**:
- **Sliding window analysis**: Continuous monitoring
- **Change point detection**: Identify regime shifts
- **Burst detection**: Find abnormal activity clusters
- **Periodic pattern mining**: Discover cyclical synchronization

### 3. Risk Scorer

**Algorithm**: Graph-based risk propagation with Monte Carlo simulation

```
Input: Entanglement graph G = (Systems, Couplings)
Output: Risk scores for all systems

1. Build weighted directed graph:
   - Nodes: Systems
   - Edges: Couplings with weight = coupling strength
   - Edge attributes: failure correlation, latency

2. For each system S:
   a. Compute centrality metrics:
      - Betweenness: How often S is on shortest paths
      - Eigenvector: Influence based on network position
      - PageRank: Importance in failure propagation

   b. Identify critical paths:
      - Find all paths from S with length ≤ 3
      - Compute propagation probability (product of edge weights)
      - Estimate propagation latency (sum of lag times)

   c. Calculate cascade risk:
      cascade_risk = Σ(path_probability × path_impact)
      where path_impact = number of systems in path

   d. Monte Carlo simulation:
      - Simulate 10,000 failure scenarios
      - Inject failure at random nodes
      - Track propagation through couplings
      - Measure S's involvement in cascades

3. Aggregate risk score:
   risk = α×cascade_risk + β×centrality + γ×coupling_count
   where α, β, γ are tunable weights (default: 0.5, 0.3, 0.2)
```

**Risk Factors**:
- **Direct coupling count**: Number of entangled systems
- **Indirect influence**: Transitive coupling reach
- **Historical failure correlation**: Observed co-failure rate
- **Resource sharing**: Shared infrastructure risk
- **Data lineage depth**: Upstream dependency chain length

### 4. Cross-Domain Correlator

**Algorithm**: Multi-dimensional correlation discovery with domain awareness

```
Input: Multi-domain metric collections (graph DB, API gateway, ML pipelines, etc.)
Output: Cross-domain entanglement signatures

1. Domain categorization:
   - Group systems by domain (database, compute, network, application)
   - Extract domain-specific metric types
   - Normalize metrics for cross-domain comparison

2. For each domain pair (Di, Dj):
   a. Select representative metrics:
      - Databases: query latency, connection pool usage, lock contention
      - Compute: CPU, memory, GC pressure
      - Network: throughput, packet loss, latency
      - Application: request rate, error rate, response time

   b. Compute canonical correlation analysis (CCA):
      - Find linear combinations that maximize correlation
      - Identify cross-domain coupling patterns

   c. Test for causal relationships:
      - Granger causality tests (Di → Dj?)
      - Lead-lag analysis (which domain changes first?)
      - Impulse response functions (how does shock propagate?)

3. Prioritize unexpected correlations:
   - Score = correlation_strength × cross_domain_distance
   - Filter out known architectural dependencies
   - Highlight emergent behavioral couplings

4. Build cross-domain map:
   - Create Neo4j subgraph: DOMAIN_COUPLING edges
   - Annotate with correlation coefficients, lag times
   - Enable graph queries for cross-domain impact analysis
```

**Domain Distance Metrics**:
- **Architectural distance**: Hops in deployment diagram
- **Semantic distance**: WordNet/embedding similarity of domain labels
- **Operational distance**: Different on-call teams, SLO owners

---

## API Design

### GraphQL Schema

See `services/predictive-analytics/cross-system-entanglement/schema.graphql` for complete schema.

**Key Queries**:

```graphql
# Detect entanglements across specified systems
detectEntanglements(
  systemIds: [String!]!
  observationWindowMs: Int = 300000    # 5 minutes default
  minCouplingStrength: Float = 0.7
  signatureTypes: [SignatureType!]
): EntanglementMap!

# Get full entanglement map for visualization
getEntanglementMap(
  includeWeak: Boolean = false
  domainFilter: [String!]
): EntanglementMap!

# Get couplings for specific system
getCouplings(
  systemId: String!
  minStrength: Float = 0.5
): [SystemCoupling!]!

# Get risk scores for systems
getRiskScores(
  systemIds: [String!]
  includePaths: Boolean = true
): [RiskScore!]!
```

**Key Mutations**:

```graphql
# Register new system for monitoring
registerSystem(
  systemId: String!
  domain: String!
  metricEndpoints: [String!]!
): System!

# Trigger entanglement scan
scanForEntanglements(
  forceRescan: Boolean = false
): ScanResult!
```

### REST Endpoints (for metrics ingestion)

```
POST /api/entanglement/metrics
  - Ingest time-series metrics from systems
  - Body: { systemId, metrics: [{timestamp, name, value}] }

GET /api/entanglement/health
  - Health check with entanglement status

GET /api/entanglement/critical-paths/:systemId
  - Get risk propagation paths for system
```

---

## Neo4j Graph Integration

### Graph Schema

**Node Types**:
```cypher
(:System {
  id: string,
  name: string,
  domain: string,
  subsystem: string,
  lastSeen: datetime
})

(:EntanglementSignature {
  id: string,
  couplingStrength: float,
  synchronizationDepth: int,
  signatureType: string,
  confidence: float,
  detectedAt: datetime
})

(:SynchronizationEvent {
  id: string,
  timestamp: datetime,
  eventType: string,
  synchronizationScore: float
})
```

**Relationship Types**:
```cypher
(:System)-[:COUPLED_TO {
  strength: float,
  direction: string,
  riskScore: float,
  detectionMethod: string,
  failureCorrelation: float
}]->(:System)

(:System)-[:ENTANGLED_VIA]->(:EntanglementSignature)<-[:ENTANGLED_VIA]-(:System)

(:System)-[:SYNCHRONIZED_IN]->(:SynchronizationEvent)<-[:SYNCHRONIZED_IN]-(:System)

(:System)-[:RISK_PATH {
  propagationProbability: float,
  estimatedLatency: int,
  hopCount: int
}]->(:System)
```

### Key Graph Queries

**Find cascade risk from system**:
```cypher
MATCH path = (s:System {id: $systemId})-[:COUPLED_TO*1..3]->(target:System)
WHERE ALL(r IN relationships(path) WHERE r.strength > 0.6)
WITH path,
     reduce(prob = 1.0, r IN relationships(path) | prob * r.strength) AS cascadeProb,
     length(path) AS depth
ORDER BY cascadeProb DESC
RETURN target.id, cascadeProb, depth, nodes(path)
LIMIT 10
```

**Find cross-domain entanglements**:
```cypher
MATCH (s1:System)-[c:COUPLED_TO]->(s2:System)
WHERE s1.domain <> s2.domain
  AND c.strength > $minStrength
RETURN s1.domain, s2.domain,
       collect({from: s1.id, to: s2.id, strength: c.strength}) AS couplings,
       avg(c.strength) AS avgStrength,
       count(c) AS couplingCount
ORDER BY avgStrength DESC
```

**Find synchronization clusters**:
```cypher
MATCH (s:System)-[:SYNCHRONIZED_IN]->(e:SynchronizationEvent)
WHERE e.timestamp > datetime() - duration({hours: 1})
WITH e, collect(s.id) AS systems
WHERE size(systems) >= 3
RETURN e.timestamp, e.eventType, systems, e.synchronizationScore
ORDER BY e.synchronizationScore DESC
```

---

## Implementation Details

### Service Architecture

```
services/predictive-analytics/cross-system-entanglement/
├── src/
│   ├── index.ts                              # Service entry point
│   ├── EntanglementDetector.ts               # Core detector orchestrator
│   ├── models/
│   │   ├── EntanglementSignature.ts
│   │   ├── SystemCoupling.ts
│   │   ├── SynchronizationEvent.ts
│   │   └── RiskScore.ts
│   ├── algorithms/
│   │   ├── LatentCouplingFinder.ts           # Cross-correlation analysis
│   │   ├── SynchronizationDetector.ts        # Event-time alignment
│   │   ├── RiskScorer.ts                     # Graph-based risk analysis
│   │   └── CrossDomainCorrelator.ts          # CCA + causality testing
│   ├── graph/
│   │   ├── Neo4jClient.ts                    # Graph database interface
│   │   └── EntanglementGraphBuilder.ts       # Graph construction
│   ├── metrics/
│   │   ├── MetricsCollector.ts               # Time-series ingestion
│   │   └── MetricsStore.ts                   # In-memory ring buffer
│   └── resolvers/
│       └── entanglementResolvers.ts          # GraphQL resolvers
├── schema.graphql
├── package.json
└── __tests__/                                # Comprehensive test suite
```

### Key Dependencies

```json
{
  "dependencies": {
    "neo4j-driver": "^5.15.0",
    "apollo-server": "^4.9.5",
    "graphql": "^16.8.1",
    "@apollo/server": "^4.9.5",
    "mathjs": "^12.2.0",              // Statistical functions
    "simple-statistics": "^7.8.3",    // Correlation, regression
    "d3-array": "^3.2.4",             // Data manipulation
    "pino": "^8.17.2",                 // Logging
    "prom-client": "^15.1.0"           // Prometheus metrics
  }
}
```

### Configuration

Environment variables (`.env`):
```bash
# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=devpassword

# Detection parameters
ENTANGLEMENT_OBSERVATION_WINDOW_MS=300000    # 5 minutes
ENTANGLEMENT_MIN_COUPLING_STRENGTH=0.7
ENTANGLEMENT_SCAN_INTERVAL_MS=60000          # 1 minute
ENTANGLEMENT_CONFIDENCE_THRESHOLD=0.95

# Risk scoring
RISK_CASCADE_WEIGHT=0.5
RISK_CENTRALITY_WEIGHT=0.3
RISK_COUPLING_COUNT_WEIGHT=0.2
RISK_MAX_PATH_DEPTH=3

# Performance
METRICS_RING_BUFFER_SIZE=10000
MAX_CONCURRENT_CORRELATIONS=100
```

---

## Usage Examples

### Detecting Entanglements

```graphql
query {
  detectEntanglements(
    systemIds: ["neo4j-primary", "api-gateway", "copilot-service"]
    observationWindowMs: 300000
    minCouplingStrength: 0.7
  ) {
    signatures {
      id
      systems
      couplingStrength
      synchronizationDepth
      signatureType
      confidence
    }
    couplings {
      sourceSystem
      targetSystem
      strength
      riskScore
      metadata {
        failureCorrelation
        latencyCorrelation
      }
    }
    detectedAt
    observationWindowMs
  }
}
```

### Getting Risk Assessment

```graphql
query {
  getRiskScores(
    systemIds: ["neo4j-primary"]
    includePaths: true
  ) {
    systemId
    overallRisk
    cascadeRisk
    impactRadius
    criticalPaths {
      path
      propagationProbability
      estimatedLatency
    }
    recommendations
  }
}
```

### Registering New System

```graphql
mutation {
  registerSystem(
    systemId: "ml-pipeline-v2"
    domain: "machine-learning"
    metricEndpoints: [
      "http://ml-pipeline:9090/metrics",
      "http://ml-pipeline:9090/events"
    ]
  ) {
    id
    domain
    registeredAt
  }
}
```

---

## Monitoring & Observability

### Prometheus Metrics

```
# Detection metrics
entanglement_signatures_total{type="TEMPORAL|CAUSAL|RESOURCE|DATA_LINEAGE"}
entanglement_couplings_total{strength_bucket="weak|medium|strong"}
entanglement_synchronization_events_total{event_type}

# Performance metrics
entanglement_correlation_duration_seconds{algorithm}
entanglement_graph_query_duration_seconds{query_type}
entanglement_scan_duration_seconds

# Risk metrics
entanglement_high_risk_systems_total
entanglement_cascade_paths_total{depth}
entanglement_avg_coupling_strength
```

### Logging

All significant events logged with structured context:
- Entanglement signature creation/expiration
- Synchronization event detection
- High-risk system alerts
- Cross-domain correlation discoveries
- Graph query performance

---

## Future Enhancements

### Phase 2: Advanced Analytics
- **Machine learning**: Train models to predict coupling emergence
- **Anomaly detection**: Identify unusual entanglement patterns
- **What-if analysis**: Simulate failure scenarios
- **Recommendation engine**: Suggest architectural decoupling

### Phase 3: Proactive Mitigation
- **Auto-remediation**: Trigger circuit breakers when cascade risk exceeds threshold
- **Load shedding**: Intelligently shed load across coupled systems
- **Capacity planning**: Use entanglement map for resource allocation
- **Chaos engineering**: Inject failures along critical paths to validate resilience

### Phase 4: Compliance & Audit
- **Entanglement lineage**: Track how couplings evolved over time
- **Compliance reporting**: "System X is entangled with Y" audit trail
- **Change impact analysis**: "This deployment will affect 7 coupled systems"

---

## References

### Academic Foundations
- Granger, C. W. J. (1969). "Investigating Causal Relations by Econometric Models and Cross-spectral Methods"
- Schreiber, T. (2000). "Measuring Information Transfer"
- Newman, M. E. J. (2010). "Networks: An Introduction"

### Industry Practices
- Google SRE Book: Cascading Failures
- AWS Well-Architected Framework: Reliability Pillar
- Netflix: Chaos Engineering Principles

---

**Maintained by**: Predictive Analytics Team
**Contact**: predictive-analytics@summit.intel
**Version**: 1.0.0
**License**: Proprietary
