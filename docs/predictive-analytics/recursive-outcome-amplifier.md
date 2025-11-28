# Recursive Outcome Amplifier™

> **Version**: 1.0.0
> **Status**: Production Ready
> **Last Updated**: 2025-11-27

## Executive Summary

The **Recursive Outcome Amplifier™** is an advanced predictive analytics engine that maps and simulates cascading consequences of events or decisions across multiple orders of causality. By analyzing second-, third-, and nth-order effects through graph-based propagation models, it enables intelligence analysts to anticipate unintended consequences, identify critical leverage points, and understand the full downstream impact of strategic actions.

### Key Capabilities

- **Multi-Order Propagation**: Trace effects through 2nd, 3rd, and nth-order consequences
- **Cascade Mapping**: Visualize outcome cascades as directed acyclic graphs (DAGs)
- **Leverage Point Identification**: Find high-impact intervention points in causal chains
- **Dampening Analysis**: Model how effects attenuate across propagation orders
- **What-If Simulation**: Run counterfactual scenarios to test decision alternatives
- **Temporal Modeling**: Account for time delays in consequence manifestation

---

## Problem Statement

### Challenge: Hidden Cascading Consequences

Traditional analysis often focuses on immediate, first-order effects while missing critical downstream impacts:

1. **Unintended Consequences**: Actions trigger unforeseen second- and third-order effects
2. **Systemic Complexity**: Interconnected systems create non-linear feedback loops
3. **Temporal Delays**: Effects manifest at different time scales, obscuring causality
4. **Amplification Effects**: Small initial changes can cascade into major outcomes
5. **Leverage Blindness**: Failure to identify high-impact intervention points

### Example Scenarios

**Scenario 1: Economic Sanctions**
```
1st Order: Trade restrictions imposed
2nd Order: Supply chain disruptions → price increases
3rd Order: Civil unrest → political instability
4th Order: Regional conflict → migration crisis
5th Order: Global humanitarian intervention required
```

**Scenario 2: Technology Deployment**
```
1st Order: New surveillance system deployed
2nd Order: Privacy concerns → public backlash
3rd Order: Legislative response → regulatory changes
4th Order: Industry restructuring → market consolidation
5th Order: Innovation chilling effects → competitive disadvantage
```

---

## Solution Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│              Recursive Outcome Amplifier™                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Propagation     │      │  Cascade         │           │
│  │  Engine          │─────▶│  Simulator       │           │
│  └──────────────────┘      └──────────────────┘           │
│          │                          │                      │
│          │                          │                      │
│          ▼                          ▼                      │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Leverage        │      │  Dampening       │           │
│  │  Identifier      │      │  Calculator      │           │
│  └──────────────────┘      └──────────────────┘           │
│          │                          │                      │
│          └──────────┬───────────────┘                      │
│                     ▼                                      │
│            ┌──────────────────┐                            │
│            │  Cascade Map     │                            │
│            │  (DAG Storage)   │                            │
│            └──────────────────┘                            │
│                     │                                      │
└─────────────────────┼──────────────────────────────────────┘
                      ▼
              ┌──────────────────┐
              │  Neo4j Graph DB  │
              │  Cascade Storage │
              └──────────────────┘
```

### Data Model

#### OutcomeNode
```typescript
{
  id: string;
  event: string;                    // Description of outcome
  order: number;                    // 1st, 2nd, 3rd, etc.
  probability: number;              // 0.0 - 1.0
  magnitude: number;                // Impact scale
  timeDelay: number;                // Time to manifestation (hours)
  domain: string;                   // Economic, Political, Social, etc.
  confidence: number;               // Model confidence
  evidenceStrength: number;         // Supporting evidence quality
  parentNodes: string[];            // Causing nodes
  childNodes: string[];             // Resulting nodes
}
```

#### CascadeMap
```typescript
{
  id: string;
  rootEvent: string;
  maxOrder: number;
  totalNodes: number;
  criticalPaths: PropagationPath[];
  leveragePoints: LeveragePoint[];
  amplificationFactor: number;      // Total cascade magnitude vs root
  createdAt: Date;
  metadata: object;
}
```

#### LeveragePoint
```typescript
{
  nodeId: string;
  leverageScore: number;            // Impact of intervention
  centrality: number;               // Network position importance
  interventionType: string;         // Block, Amplify, Redirect
  downstreamImpact: number;         // Affected downstream nodes
  interventionCost: number;         // Estimated resource requirement
}
```

---

## Core Algorithms

### 1. Propagation Engine

**Purpose**: Trace effects through multiple causal orders

**Algorithm**:
```typescript
function propagateOutcomes(
  rootEvent: Event,
  maxOrder: number,
  context: GraphContext
): OutcomeNode[] {
  const outcomes: OutcomeNode[] = [];
  const visited = new Set<string>();
  const queue: [OutcomeNode, number][] = [[createRootNode(rootEvent), 1]];

  while (queue.length > 0) {
    const [node, order] = queue.shift()!;

    if (order > maxOrder || visited.has(node.id)) continue;

    visited.add(node.id);
    outcomes.push(node);

    // Find causal relationships in knowledge graph
    const causalLinks = findCausalLinks(node, context);

    for (const link of causalLinks) {
      const childNode = createOutcomeNode(
        link,
        order + 1,
        node,
        context
      );

      // Apply dampening: effects attenuate with distance
      childNode.probability *= calculateDampening(order, link);
      childNode.magnitude *= calculateMagnitudeDampening(order, link);

      queue.push([childNode, order + 1]);
    }
  }

  return outcomes;
}
```

**Dampening Model**:
```typescript
function calculateDampening(order: number, link: CausalLink): number {
  // Effects decay exponentially with causal distance
  const baseDecay = 0.7; // 30% reduction per order
  const linkStrength = link.evidenceQuality;

  return Math.pow(baseDecay * linkStrength, order - 1);
}
```

### 2. Cascade Simulator

**Purpose**: Build complete cascade map from root event

**Algorithm**:
```typescript
function simulateCascade(
  rootEvent: Event,
  options: SimulationOptions
): CascadeMap {
  // Phase 1: Generate outcome nodes
  const nodes = propagateOutcomes(
    rootEvent,
    options.maxOrder,
    options.context
  );

  // Phase 2: Build DAG structure
  const dag = buildCascadeDAG(nodes);

  // Phase 3: Identify critical paths
  const criticalPaths = findCriticalPaths(dag, {
    minProbability: options.probabilityThreshold,
    minMagnitude: options.magnitudeThreshold
  });

  // Phase 4: Calculate amplification
  const amplificationFactor = calculateAmplification(nodes, rootEvent);

  // Phase 5: Find leverage points
  const leveragePoints = identifyLeveragePoints(dag, criticalPaths);

  return {
    id: generateId(),
    rootEvent: rootEvent.description,
    maxOrder: options.maxOrder,
    totalNodes: nodes.length,
    criticalPaths,
    leveragePoints,
    amplificationFactor,
    createdAt: new Date(),
    metadata: { options }
  };
}
```

### 3. Leverage Point Identification

**Purpose**: Find high-impact intervention opportunities

**Algorithm**:
```typescript
function identifyLeveragePoints(
  dag: CascadeDAG,
  criticalPaths: PropagationPath[]
): LeveragePoint[] {
  const leveragePoints: LeveragePoint[] = [];

  for (const node of dag.nodes) {
    // Skip root and leaf nodes
    if (node.order === 1 || node.childNodes.length === 0) continue;

    // Calculate betweenness centrality
    const centrality = calculateBetweennessCentrality(node, dag);

    // Count downstream affected nodes
    const downstreamImpact = countDownstreamNodes(node, dag);

    // Estimate intervention cost (inverse of accessibility)
    const interventionCost = estimateInterventionCost(node);

    // Leverage score: impact / cost ratio
    const leverageScore = (centrality * downstreamImpact) / interventionCost;

    leveragePoints.push({
      nodeId: node.id,
      leverageScore,
      centrality,
      interventionType: determineInterventionType(node),
      downstreamImpact,
      interventionCost
    });
  }

  // Return top leverage points
  return leveragePoints
    .sort((a, b) => b.leverageScore - a.leverageScore)
    .slice(0, 10);
}
```

### 4. Critical Path Analysis

**Purpose**: Identify most likely/impactful outcome sequences

**Algorithm**:
```typescript
function findCriticalPaths(
  dag: CascadeDAG,
  criteria: PathCriteria
): PropagationPath[] {
  const paths: PropagationPath[] = [];
  const rootNodes = dag.nodes.filter(n => n.order === 1);

  for (const root of rootNodes) {
    traversePaths(root, [root], 1.0, 0, paths, criteria, dag);
  }

  // Rank by combined probability × magnitude
  return paths
    .sort((a, b) => (b.probability * b.totalMagnitude) - (a.probability * a.totalMagnitude))
    .slice(0, 20);
}

function traversePaths(
  node: OutcomeNode,
  path: OutcomeNode[],
  cumulativeProbability: number,
  cumulativeMagnitude: number,
  results: PropagationPath[],
  criteria: PathCriteria,
  dag: CascadeDAG
): void {
  const newProbability = cumulativeProbability * node.probability;
  const newMagnitude = cumulativeMagnitude + node.magnitude;

  // Prune low-probability paths
  if (newProbability < criteria.minProbability) return;

  // If leaf node, save path
  if (node.childNodes.length === 0) {
    results.push({
      nodes: [...path],
      probability: newProbability,
      totalMagnitude: newMagnitude,
      pathLength: path.length
    });
    return;
  }

  // Recurse to children
  for (const childId of node.childNodes) {
    const child = dag.nodes.find(n => n.id === childId);
    if (!child) continue;

    traversePaths(
      child,
      [...path, child],
      newProbability,
      newMagnitude,
      results,
      criteria,
      dag
    );
  }
}
```

---

## API Design

### GraphQL Schema

```graphql
type OutcomeNode {
  id: ID!
  event: String!
  order: Int!
  probability: Float!
  magnitude: Float!
  timeDelay: Float!
  domain: String!
  confidence: Float!
  evidenceStrength: Float!
  parentNodes: [OutcomeNode!]!
  childNodes: [OutcomeNode!]!
  createdAt: DateTime!
}

type CascadeMap {
  id: ID!
  rootEvent: String!
  maxOrder: Int!
  totalNodes: Int!
  criticalPaths: [PropagationPath!]!
  leveragePoints: [LeveragePoint!]!
  amplificationFactor: Float!
  createdAt: DateTime!
  metadata: JSON!
}

type PropagationPath {
  nodes: [OutcomeNode!]!
  probability: Float!
  totalMagnitude: Float!
  pathLength: Int!
}

type LeveragePoint {
  nodeId: ID!
  node: OutcomeNode!
  leverageScore: Float!
  centrality: Float!
  interventionType: InterventionType!
  downstreamImpact: Int!
  interventionCost: Float!
}

enum InterventionType {
  BLOCK
  AMPLIFY
  REDIRECT
  MONITOR
}

type AmplificationFactor {
  rootMagnitude: Float!
  totalMagnitude: Float!
  amplificationRatio: Float!
  orderBreakdown: [OrderAmplification!]!
}

type OrderAmplification {
  order: Int!
  nodeCount: Int!
  totalMagnitude: Float!
  avgProbability: Float!
}

input EventInput {
  description: String!
  domain: String!
  initialMagnitude: Float!
  context: JSON
}

input SimulationOptions {
  maxOrder: Int! = 5
  probabilityThreshold: Float! = 0.1
  magnitudeThreshold: Float! = 0.1
  timeHorizon: Float
  includeWeakLinks: Boolean! = false
}

type Query {
  """Get cascade map for an event"""
  getCascadeMap(cascadeId: ID!): CascadeMap

  """Find leverage points in a cascade"""
  findLeveragePoints(
    cascadeId: ID!
    topN: Int! = 10
  ): [LeveragePoint!]!

  """Get amplification analysis"""
  getAmplificationPath(
    cascadeId: ID!
    targetNodeId: ID!
  ): PropagationPath

  """List all cascade simulations"""
  listCascades(
    limit: Int! = 20
    offset: Int! = 0
  ): [CascadeMap!]!
}

type Mutation {
  """Amplify outcomes for an event"""
  amplifyOutcome(
    event: EventInput!
    options: SimulationOptions
  ): CascadeMap!

  """Run cascade simulation"""
  runCascadeSimulation(
    eventId: ID!
    options: SimulationOptions
  ): CascadeMap!

  """Define a new event for analysis"""
  defineEvent(
    event: EventInput!
  ): OutcomeNode!
}
```

### REST Endpoints (Optional)

```
POST   /api/amplifier/simulate
GET    /api/amplifier/cascades/:id
GET    /api/amplifier/cascades/:id/leverage-points
POST   /api/amplifier/analyze
```

---

## Neo4j Integration

### Graph Schema

#### Node Labels
```cypher
// Event nodes
(:Event {
  id: string,
  description: string,
  domain: string,
  timestamp: datetime
})

// Outcome nodes
(:Outcome {
  id: string,
  event: string,
  order: int,
  probability: float,
  magnitude: float,
  timeDelay: float,
  domain: string,
  confidence: float
})

// Cascade map metadata
(:CascadeMap {
  id: string,
  rootEvent: string,
  maxOrder: int,
  totalNodes: int,
  amplificationFactor: float,
  createdAt: datetime
})
```

#### Relationships
```cypher
// Causal relationships
(:Outcome)-[:CAUSES {
  strength: float,
  evidenceQuality: float,
  timeDelay: float
}]->(:Outcome)

// Cascade membership
(:CascadeMap)-[:CONTAINS]->(:Outcome)

// Leverage points
(:CascadeMap)-[:LEVERAGE_POINT {
  score: float,
  interventionType: string
}]->(:Outcome)
```

### Cypher Queries

#### Store Cascade Map
```cypher
MERGE (cm:CascadeMap {id: $cascadeId})
SET cm.rootEvent = $rootEvent,
    cm.maxOrder = $maxOrder,
    cm.totalNodes = $totalNodes,
    cm.amplificationFactor = $amplificationFactor,
    cm.createdAt = datetime()

UNWIND $nodes AS node
MERGE (o:Outcome {id: node.id})
SET o.event = node.event,
    o.order = node.order,
    o.probability = node.probability,
    o.magnitude = node.magnitude,
    o.domain = node.domain
MERGE (cm)-[:CONTAINS]->(o)

WITH cm
UNWIND $edges AS edge
MATCH (parent:Outcome {id: edge.parentId})
MATCH (child:Outcome {id: edge.childId})
MERGE (parent)-[r:CAUSES]->(child)
SET r.strength = edge.strength,
    r.evidenceQuality = edge.evidenceQuality

RETURN cm
```

#### Find Critical Paths
```cypher
MATCH (cm:CascadeMap {id: $cascadeId})
MATCH (cm)-[:CONTAINS]->(root:Outcome {order: 1})
MATCH path = (root)-[:CAUSES*]->(leaf:Outcome)
WHERE NOT (leaf)-[:CAUSES]->()

WITH path,
     reduce(p = 1.0, rel in relationships(path) | p * rel.strength) AS pathProbability,
     reduce(m = 0.0, node in nodes(path) | m + node.magnitude) AS pathMagnitude

WHERE pathProbability >= $minProbability

RETURN nodes(path) AS nodes,
       pathProbability AS probability,
       pathMagnitude AS magnitude,
       length(path) AS pathLength
ORDER BY pathProbability * pathMagnitude DESC
LIMIT 20
```

#### Calculate Betweenness Centrality
```cypher
MATCH (cm:CascadeMap {id: $cascadeId})
MATCH (cm)-[:CONTAINS]->(o:Outcome)

CALL gds.betweenness.stream({
  nodeProjection: 'Outcome',
  relationshipProjection: {
    CAUSES: {
      type: 'CAUSES',
      orientation: 'NATURAL'
    }
  }
})
YIELD nodeId, score

RETURN gds.util.asNode(nodeId).id AS outcomeId, score AS centrality
ORDER BY centrality DESC
```

---

## Performance Considerations

### Optimization Strategies

1. **Pruning**: Eliminate low-probability paths early (< 0.1)
2. **Memoization**: Cache intermediate propagation results
3. **Parallel Processing**: Process independent branches concurrently
4. **Graph Indexing**: Index Neo4j nodes by order, domain, probability
5. **Result Caching**: Cache cascade maps for common events

### Complexity Analysis

- **Time Complexity**: O(b^d) where b = branching factor, d = max depth
- **Space Complexity**: O(n) where n = total outcome nodes
- **Typical Performance**:
  - 5 orders, 3 branches/node → ~243 nodes
  - Processing time: < 2 seconds
  - Memory: < 50MB

---

## Use Cases

### 1. Policy Impact Assessment
```typescript
// Simulate healthcare policy change
const cascade = await amplifyOutcome({
  event: {
    description: "Universal healthcare mandate",
    domain: "POLICY",
    initialMagnitude: 8.5,
    context: { country: "US", population: 330000000 }
  },
  options: {
    maxOrder: 6,
    probabilityThreshold: 0.15
  }
});

// Find intervention opportunities
const leveragePoints = cascade.leveragePoints.slice(0, 5);
```

### 2. Geopolitical Event Analysis
```typescript
// Analyze sanctions impact
const cascade = await amplifyOutcome({
  event: {
    description: "Comprehensive trade sanctions imposed",
    domain: "GEOPOLITICAL",
    initialMagnitude: 7.0,
    context: { target: "Country X", sectors: ["energy", "technology"] }
  },
  options: {
    maxOrder: 7,
    timeHorizon: 365 * 24 // 1 year
  }
});

// Identify unintended consequences
const unexpectedPaths = cascade.criticalPaths.filter(
  p => p.nodes[p.nodes.length - 1].domain !== "ECONOMIC"
);
```

### 3. Technology Deployment Risk
```typescript
// Assess AI system rollout
const cascade = await amplifyOutcome({
  event: {
    description: "Deploy facial recognition in public spaces",
    domain: "TECHNOLOGY",
    initialMagnitude: 6.0,
    context: { scale: "national", sensitivity: "high" }
  },
  options: {
    maxOrder: 5,
    includeWeakLinks: true // Include uncertain effects
  }
});

// Find high-leverage mitigation points
const mitigationPoints = cascade.leveragePoints.filter(
  lp => lp.interventionType === "BLOCK"
);
```

---

## Validation & Testing

### Test Scenarios

1. **Linear Cascade**: Single path, predictable dampening
2. **Branching Cascade**: Multiple paths, divergent outcomes
3. **Convergent Cascade**: Multiple causes, single outcome
4. **Cyclic Detection**: Ensure DAG enforcement, no feedback loops
5. **Edge Cases**: Zero probability, infinite loops, disconnected graphs

### Quality Metrics

- **Coverage**: % of known historical cascades correctly modeled
- **Precision**: % of predicted outcomes that materialized
- **Recall**: % of actual outcomes that were predicted
- **Leverage Accuracy**: % of identified leverage points validated effective

---

## Future Enhancements

1. **Machine Learning Integration**
   - Learn dampening factors from historical data
   - Predict novel causal links using graph embeddings
   - Automated probability estimation

2. **Temporal Dynamics**
   - Time-series propagation modeling
   - Delay distribution functions
   - Real-time cascade updates

3. **Monte Carlo Simulation**
   - Probabilistic outcome distributions
   - Confidence intervals for cascade maps
   - Sensitivity analysis

4. **Interactive Visualization**
   - D3.js cascade graph rendering
   - Real-time path highlighting
   - Intervention simulation UI

5. **Multi-Actor Modeling**
   - Game-theoretic outcome prediction
   - Adversarial cascade analysis
   - Coalition formation effects

---

## References

- Systems Thinking: Meadows, D. (2008). *Thinking in Systems*
- Causal Inference: Pearl, J. (2009). *Causality*
- Network Science: Barabási, A. (2016). *Network Science*
- Leverage Points: Meadows, D. (1999). "Leverage Points: Places to Intervene in a System"

---

**Document Owner**: Predictive Analytics Team
**Review Cadence**: Quarterly
**Related Documents**:
- [Parallel Timeline Validator](./parallel-timeline-validator.md)
- [Predictive Analytics Architecture](./architecture.md)
