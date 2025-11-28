# Causal Horizon Engine™

> **Status**: Production Ready
> **Version**: 1.0.0
> **Last Updated**: 2025-11-27
> **Owner**: Predictive Analytics Team

## Executive Summary

The **Causal Horizon Engine** is a sophisticated predictive analytics system that identifies causal futures, projects how interventions change outcomes, and outputs the most causally efficient action sets. Unlike traditional correlation-based prediction, this engine employs rigorous causal inference techniques to answer counterfactual questions: "What would happen if we intervened on X?"

### Key Capabilities

- **Causal Graph Construction**: Automatically builds directed acyclic graphs (DAGs) representing causal relationships from Neo4j intelligence data
- **Do-Calculus**: Implements Judea Pearl's do-calculus for computing causal effects under interventions
- **Counterfactual Reasoning**: Simulates alternative scenarios to predict outcomes under different actions
- **Intervention Optimization**: Identifies the most efficient set of interventions to achieve desired outcomes
- **Multi-Path Analysis**: Analyzes all causal pathways between variables to understand mechanism chains

### Use Cases

1. **Intelligence Analysis**: Predict how removing a key node affects network stability
2. **Risk Assessment**: Simulate interventions to mitigate identified threats
3. **Resource Optimization**: Find minimal intervention sets to achieve mission objectives
4. **Decision Support**: Provide causal evidence for strategic decisions
5. **Scenario Planning**: Generate and compare multiple counterfactual futures

---

## Problem Statement

### Current Limitations

Traditional predictive analytics in intelligence platforms face critical limitations:

1. **Correlation ≠ Causation**: Statistical models identify patterns but cannot answer intervention questions
2. **Confounding Variables**: Spurious correlations mislead without causal structure
3. **Black Box Predictions**: ML models lack interpretability for high-stakes decisions
4. **Static Forecasts**: Cannot dynamically simulate "what-if" scenarios
5. **No Intervention Planning**: Cannot identify optimal actions to achieve outcomes

### The Causal Inference Gap

Intelligence analysts need to answer questions like:

- "If we neutralize this threat actor, what cascading effects occur?"
- "What's the minimal set of interventions to disrupt this network?"
- "How would outcomes differ if we had acted differently in the past?"

These are **causal questions** requiring causal methods, not statistical prediction.

---

## Solution Architecture

### Theoretical Foundation

The engine implements **Pearl's Causal Hierarchy**:

1. **Level 1 - Association** (P(Y|X)): Observational patterns in data
2. **Level 2 - Intervention** (P(Y|do(X))): Effects of actions
3. **Level 3 - Counterfactuals** (P(Y_x|X',Y')): What would have happened?

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Causal Horizon Engine                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐              │
│  │  Causal Graph   │───▶│ Causal Inference │              │
│  │   Constructor   │    │    Algorithms    │              │
│  └─────────────────┘    └──────────────────┘              │
│           │                      │                          │
│           │                      ▼                          │
│           │            ┌──────────────────┐                │
│           │            │  Do-Calculus     │                │
│           │            │  - Backdoor      │                │
│           │            │  - Frontdoor     │                │
│           │            │  - IV Estimation │                │
│           ▼            └──────────────────┘                │
│  ┌─────────────────┐            │                          │
│  │   Path Analyzer │            ▼                          │
│  │  - Direct paths │  ┌──────────────────┐                │
│  │  - Mediated     │  │ Counterfactual   │                │
│  │  - Confounded   │  │   Simulation     │                │
│  └─────────────────┘  └──────────────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      ▼                                      │
│            ┌──────────────────┐                            │
│            │   Intervention   │                            │
│            │    Optimizer     │                            │
│            └──────────────────┘                            │
│                      │                                      │
│                      ▼                                      │
│            ┌──────────────────┐                            │
│            │  Causal Action   │                            │
│            │      Sets        │                            │
│            └──────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Graph Construction**: Neo4j data → Causal DAG with edge weights and types
2. **Query Processing**: User specifies intervention targets and outcome variables
3. **Causal Identification**: Engine determines if causal effect is identifiable
4. **Simulation**: Runs counterfactual scenarios under interventions
5. **Optimization**: Searches intervention space for optimal action sets
6. **Results**: Returns causal effects, confidence intervals, and recommended actions

---

## Core Algorithms

### 1. Causal Graph Construction

**Input**: Neo4j graph data (entities, relationships)
**Output**: Causal DAG with typed edges

**Algorithm**:
```typescript
function buildCausalGraph(neoData: GraphData): CausalGraph {
  // 1. Identify temporal ordering (time-based edges)
  // 2. Classify edge types: direct causal, confounding, selection
  // 3. Detect and break cycles (choose strongest causal direction)
  // 4. Assign edge strengths from relationship weights
  // 5. Add latent confounders based on structural patterns
  // 6. Validate DAG properties (acyclicity, d-separation)

  return causalDAG;
}
```

**Edge Types**:
- `DIRECT_CAUSE`: X directly causes Y
- `CONFOUNDER`: Common cause of X and Y
- `MEDIATOR`: X → M → Y
- `COLLIDER`: X → C ← Y
- `SELECTION_BIAS`: Conditioning on a collider

### 2. Do-Calculus Engine

Implements Pearl's three rules of do-calculus:

**Rule 1 (Insertion/Deletion of Observations)**:
```
P(y|do(x),z,w) = P(y|do(x),w) if (Y ⊥ Z | X,W) in G_x̄
```

**Rule 2 (Action/Observation Exchange)**:
```
P(y|do(x),do(z),w) = P(y|do(x),z,w) if (Y ⊥ Z | X,W) in G_x̄Z̄
```

**Rule 3 (Insertion/Deletion of Actions)**:
```
P(y|do(x),do(z),w) = P(y|do(x),w) if (Y ⊥ Z | X,W) in G_x̄,Z(W)
```

**Implementation**:
```typescript
class DoCalculus {
  // Check if P(y|do(x)) is identifiable
  isIdentifiable(y: Variable, x: Variable, graph: CausalGraph): boolean;

  // Compute causal effect using backdoor adjustment
  backdoorAdjustment(y: Variable, x: Variable, z: Variable[]): CausalEffect;

  // Compute causal effect using frontdoor adjustment
  frontdoorAdjustment(y: Variable, x: Variable, m: Variable[]): CausalEffect;

  // General do-calculus reduction
  reduceToObservational(query: DoQuery): ObservationalQuery;
}
```

### 3. Backdoor Criterion

**Goal**: Identify valid adjustment sets to block confounding

**Algorithm**:
```typescript
function findBackdoorSets(
  x: Variable,
  y: Variable,
  graph: CausalGraph
): Variable[][] {
  // 1. Find all ancestors of X and Y
  const ancestors = graph.getAncestors([x, y]);

  // 2. Enumerate candidate adjustment sets (subsets of ancestors)
  const candidates = powerSet(ancestors);

  // 3. Test backdoor criterion for each candidate set Z:
  //    a) No node in Z is descendant of X
  //    b) Z blocks all backdoor paths from X to Y

  return validSets.sort((a, b) => a.length - b.length); // Minimal sets first
}
```

### 4. Frontdoor Criterion

**Goal**: Identify mediators to estimate causal effects when backdoor is blocked

**Conditions for mediator set M**:
1. M intercepts all directed paths from X to Y
2. No backdoor path from X to M
3. X blocks all backdoor paths from M to Y

**Implementation**:
```typescript
function frontdoorAdjustment(
  x: Variable,
  y: Variable,
  m: Variable[],
  graph: CausalGraph
): CausalEffect {
  // P(y|do(x)) = Σ_m P(m|x) Σ_x' P(y|m,x') P(x')
  // Uses mediator M to compute effect when X-Y confounded
}
```

### 5. Counterfactual Simulation

**Three-Step Process** (Pearl's SCM framework):

1. **Abduction**: Update beliefs given observed evidence
2. **Action**: Modify structural equations to reflect intervention
3. **Prediction**: Compute counterfactual outcome

**Algorithm**:
```typescript
function simulateCounterfactual(
  scenario: CounterfactualScenario,
  graph: CausalGraph,
  observed: Evidence
): CounterfactualResult {
  // 1. Abduction: P(U|observed) - infer latent variables
  const posterior = graph.inferLatents(observed);

  // 2. Action: Graph surgery - remove incoming edges to intervention targets
  const mutilatedGraph = graph.doIntervention(scenario.interventions);

  // 3. Prediction: Forward simulation with intervened values
  const outcome = mutilatedGraph.simulate(posterior, scenario.target);

  return {
    outcome,
    confidence: posterior.entropy,
    causalPaths: mutilatedGraph.getActivePaths(scenario.target),
  };
}
```

### 6. Multi-Path Causal Analysis

**Goal**: Decompose total causal effect into path-specific effects

**Path Types**:
- **Direct Effect**: X → Y (no mediators)
- **Indirect Effect**: X → M₁ → ... → Mₙ → Y
- **Total Effect**: Sum of all path effects

**Implementation**:
```typescript
function analyzeCausalPaths(
  source: Variable,
  target: Variable,
  graph: CausalGraph
): PathAnalysis {
  // 1. Find all directed paths from source to target
  const paths = graph.findAllPaths(source, target);

  // 2. Classify paths by type (direct, mediated, confounded)
  const classified = paths.map(path => ({
    path,
    type: classifyPath(path, graph),
    strength: computePathStrength(path, graph),
  }));

  // 3. Compute path-specific effects
  const effects = classified.map(p => ({
    ...p,
    effect: computePathEffect(p.path, graph),
  }));

  return {
    direct: effects.filter(e => e.type === 'DIRECT'),
    indirect: effects.filter(e => e.type === 'MEDIATED'),
    total: effects.reduce((sum, e) => sum + e.effect, 0),
  };
}
```

### 7. Intervention Optimization

**Goal**: Find minimal intervention set to achieve target outcome

**Optimization Problem**:
```
minimize:   cost(interventions)
subject to: P(target = desired | do(interventions)) ≥ threshold
```

**Algorithm**:
```typescript
function findOptimalInterventions(
  target: Variable,
  desiredValue: any,
  threshold: number,
  graph: CausalGraph,
  constraints: Constraint[]
): InterventionSet[] {
  // 1. Identify candidate intervention variables (ancestors of target)
  const candidates = graph.getAncestors([target]);

  // 2. Enumerate intervention sets by increasing size
  for (let size = 1; size <= candidates.length; size++) {
    const sets = combinations(candidates, size);

    // 3. For each set, simulate counterfactual outcome
    for (const interventionSet of sets) {
      const result = simulateIntervention(interventionSet, target, graph);

      // 4. Check if outcome meets threshold
      if (result.probability >= threshold && satisfiesConstraints(interventionSet, constraints)) {
        return interventionSet; // Return minimal satisfying set
      }
    }
  }

  return []; // No satisfying set found
}
```

**Optimization Strategies**:
- **Greedy Search**: Add highest-impact intervention iteratively
- **Beam Search**: Maintain top-k partial solutions
- **Genetic Algorithm**: Evolve intervention sets over generations
- **Monte Carlo Tree Search**: Explore intervention space efficiently

---

## Data Models

### CausalGraph

```typescript
interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  metadata: {
    constructed: Date;
    source: string;
    confidence: number;
  };
}

interface CausalNode {
  id: string;
  name: string;
  type: 'OBSERVABLE' | 'LATENT' | 'INTERVENTION';
  domain: 'CONTINUOUS' | 'DISCRETE' | 'BINARY';
  distribution?: ProbabilityDistribution;
}

interface CausalEdge {
  from: string;
  to: string;
  type: EdgeType;
  strength: number; // [-1, 1] where sign indicates direction of effect
  confidence: number; // [0, 1]
  mechanism?: string; // Description of causal mechanism
}

type EdgeType =
  | 'DIRECT_CAUSE'
  | 'CONFOUNDER'
  | 'MEDIATOR'
  | 'COLLIDER'
  | 'SELECTION_BIAS';
```

### Intervention

```typescript
interface Intervention {
  variable: string;
  value: any;
  type: 'HARD' | 'SOFT'; // Hard: set to value, Soft: shift distribution
  cost?: number;
  feasibility?: number; // [0, 1]
}

interface InterventionSet {
  interventions: Intervention[];
  totalCost: number;
  expectedEffect: number;
  confidence: number;
}
```

### CounterfactualScenario

```typescript
interface CounterfactualScenario {
  id: string;
  name: string;
  description: string;
  interventions: Intervention[];
  target: {
    variable: string;
    desiredValue?: any;
    threshold?: number;
  };
  evidence?: Record<string, any>; // Observed values to condition on
}

interface CounterfactualResult {
  scenario: CounterfactualScenario;
  outcome: {
    variable: string;
    value: any;
    probability: number;
    confidenceInterval: [number, number];
  };
  causalPaths: CausalPath[];
  comparisonToFactual: {
    factualValue: any;
    counterfactualValue: any;
    difference: number;
    percentChange: number;
  };
}
```

### CausalPath

```typescript
interface CausalPath {
  nodes: string[];
  edges: CausalEdge[];
  type: 'DIRECT' | 'MEDIATED' | 'CONFOUNDED';
  strength: number;
  contribution: number; // Contribution to total effect
}
```

---

## API Design

### GraphQL Schema

```graphql
type CausalGraph {
  id: ID!
  nodes: [CausalNode!]!
  edges: [CausalEdge!]!
  metadata: CausalGraphMetadata!
}

type CausalNode {
  id: ID!
  name: String!
  type: NodeType!
  domain: DomainType!
  incomingEdges: [CausalEdge!]!
  outgoingEdges: [CausalEdge!]!
}

type CausalEdge {
  id: ID!
  from: CausalNode!
  to: CausalNode!
  type: EdgeType!
  strength: Float!
  confidence: Float!
  mechanism: String
}

enum NodeType {
  OBSERVABLE
  LATENT
  INTERVENTION
}

enum EdgeType {
  DIRECT_CAUSE
  CONFOUNDER
  MEDIATOR
  COLLIDER
  SELECTION_BIAS
}

type Intervention {
  variable: String!
  value: JSON!
  type: InterventionType!
  cost: Float
  feasibility: Float
}

enum InterventionType {
  HARD
  SOFT
}

type CounterfactualResult {
  scenario: CounterfactualScenario!
  outcome: Outcome!
  causalPaths: [CausalPath!]!
  comparisonToFactual: Comparison!
}

type Outcome {
  variable: String!
  value: JSON!
  probability: Float!
  confidenceInterval: [Float!]!
}

type CausalPath {
  nodes: [String!]!
  type: PathType!
  strength: Float!
  contribution: Float!
}

enum PathType {
  DIRECT
  MEDIATED
  CONFOUNDED
}

# Queries
type Query {
  """Get causal graph for an investigation"""
  getCausalGraph(investigationId: ID!): CausalGraph!

  """Simulate intervention and predict outcome"""
  simulateIntervention(
    graphId: ID!
    interventions: [InterventionInput!]!
    target: TargetInput!
  ): CounterfactualResult!

  """Find optimal intervention sets to achieve goal"""
  findOptimalInterventions(
    graphId: ID!
    target: TargetInput!
    constraints: ConstraintsInput
  ): [InterventionSet!]!

  """Analyze causal paths between variables"""
  getCausalPaths(
    graphId: ID!
    source: String!
    target: String!
  ): PathAnalysis!

  """Check if causal effect is identifiable"""
  isIdentifiable(
    graphId: ID!
    intervention: String!
    outcome: String!
  ): IdentifiabilityResult!
}

# Mutations
type Mutation {
  """Create causal model from Neo4j data"""
  createCausalModel(
    investigationId: ID!
    config: CausalModelConfig
  ): CausalGraph!

  """Add intervention to scenario"""
  addIntervention(
    scenarioId: ID!
    intervention: InterventionInput!
  ): CounterfactualScenario!

  """Run counterfactual analysis"""
  runCounterfactual(
    scenario: CounterfactualScenarioInput!
  ): CounterfactualResult!

  """Update causal graph structure"""
  updateCausalGraph(
    graphId: ID!
    updates: CausalGraphUpdates!
  ): CausalGraph!
}

# Input Types
input InterventionInput {
  variable: String!
  value: JSON!
  type: InterventionType!
  cost: Float
}

input TargetInput {
  variable: String!
  desiredValue: JSON
  threshold: Float
}

input ConstraintsInput {
  maxCost: Float
  maxInterventions: Int
  requiredVariables: [String!]
  forbiddenVariables: [String!]
}

input CausalModelConfig {
  edgeConfidenceThreshold: Float
  includeLatentVariables: Boolean
  temporalOrdering: Boolean
}
```

### REST API (Alternative)

```typescript
// GET /api/causal-horizon/graphs/:investigationId
// Returns causal graph for investigation

// POST /api/causal-horizon/simulate
// Body: { graphId, interventions, target }
// Returns counterfactual result

// POST /api/causal-horizon/optimize
// Body: { graphId, target, constraints }
// Returns optimal intervention sets

// GET /api/causal-horizon/paths/:graphId?source=X&target=Y
// Returns causal path analysis
```

---

## Integration with Neo4j Graph

### Data Extraction

```cypher
// Extract causal relationships from Neo4j
MATCH (source)-[r]->(target)
WHERE r.timestamp IS NOT NULL // Temporal ordering
RETURN
  source.id AS sourceId,
  source.type AS sourceType,
  target.id AS targetId,
  target.type AS targetType,
  type(r) AS relationType,
  r.weight AS strength,
  r.confidence AS confidence,
  r.timestamp AS timestamp
ORDER BY r.timestamp
```

### Causal Inference from Graph Patterns

1. **Temporal Precedence**: Earlier events cause later events
2. **Network Structure**: Hubs and bridges indicate causal influence
3. **Relationship Types**: Map domain relationships to causal edge types
4. **Weighted Edges**: Use as prior for causal strength

### Example: Threat Actor Network

```
Neo4j Graph:
  ThreatActor1 -[FUNDS]-> ThreatActor2
  ThreatActor2 -[OPERATES]-> Infrastructure
  Infrastructure -[HOSTS]-> Malware
  Malware -[TARGETS]-> Victim

Causal Graph:
  ThreatActor1 → ThreatActor2 → Infrastructure → Malware → Victim

Intervention Query:
  "What if we neutralize ThreatActor2?" (do(ThreatActor2 = inactive))

Result:
  P(Victim = compromised | do(ThreatActor2 = inactive)) = 0.15
  P(Victim = compromised | observe(ThreatActor2 = active)) = 0.85
  Causal Effect: -0.70 (70% reduction in victim compromise probability)
```

---

## Implementation Details

### Technology Stack

- **Language**: TypeScript (ESM modules)
- **Runtime**: Node.js 18+
- **Graph Database**: Neo4j (via `neo4j-driver`)
- **GraphQL**: Apollo Server
- **Algorithms**: Custom implementations + `mathjs` for linear algebra
- **Testing**: Jest with extensive unit and integration tests

### Dependencies

```json
{
  "dependencies": {
    "@apollo/server": "^4.9.5",
    "neo4j-driver": "^5.14.0",
    "graphql": "^16.8.1",
    "mathjs": "^12.0.0",
    "lodash": "^4.17.21",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/jest": "^29.5.8",
    "jest": "^29.7.0",
    "typescript": "^5.3.3"
  }
}
```

### Performance Considerations

1. **Graph Size**: Optimize for graphs up to 10,000 nodes
2. **Path Enumeration**: Use pruning heuristics for large graphs
3. **Simulation**: Batch counterfactual queries
4. **Caching**: Cache identifiability results and adjustment sets
5. **Parallelization**: Run independent simulations in parallel

### Error Handling

```typescript
class CausalInferenceError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'CausalInferenceError';
  }
}

enum ErrorCode {
  GRAPH_CYCLIC = 'GRAPH_CYCLIC',
  NOT_IDENTIFIABLE = 'NOT_IDENTIFIABLE',
  INVALID_INTERVENTION = 'INVALID_INTERVENTION',
  NO_VALID_ADJUSTMENT_SET = 'NO_VALID_ADJUSTMENT_SET',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
}
```

---

## Usage Examples

### Example 1: Simple Intervention Simulation

```typescript
// Query
const result = await client.query({
  query: gql`
    query SimulateIntervention {
      simulateIntervention(
        graphId: "inv-123"
        interventions: [
          { variable: "ThreatActor2", value: "neutralized", type: HARD }
        ]
        target: { variable: "VictimCompromised", threshold: 0.5 }
      ) {
        outcome {
          probability
          confidenceInterval
        }
        comparisonToFactual {
          percentChange
        }
        causalPaths {
          nodes
          strength
        }
      }
    }
  `,
});

// Result
{
  outcome: {
    probability: 0.15,
    confidenceInterval: [0.12, 0.18]
  },
  comparisonToFactual: {
    percentChange: -82.4 // 82.4% reduction
  },
  causalPaths: [
    { nodes: ["ThreatActor2", "Infrastructure", "Malware", "VictimCompromised"], strength: 0.65 },
    { nodes: ["ThreatActor2", "Malware", "VictimCompromised"], strength: 0.20 }
  ]
}
```

### Example 2: Find Optimal Interventions

```typescript
// Query
const interventions = await client.query({
  query: gql`
    query FindOptimal {
      findOptimalInterventions(
        graphId: "inv-123"
        target: {
          variable: "NetworkDisrupted",
          desiredValue: true,
          threshold: 0.9
        }
        constraints: {
          maxCost: 100000,
          maxInterventions: 3,
          forbiddenVariables: ["CivilianInfrastructure"]
        }
      ) {
        interventions {
          variable
          value
          cost
        }
        expectedEffect
        confidence
      }
    }
  `,
});

// Result
[
  {
    interventions: [
      { variable: "CommandServer1", value: "offline", cost: 25000 },
      { variable: "KeyOperator", value: "arrested", cost: 50000 }
    ],
    expectedEffect: 0.93,
    confidence: 0.87
  }
]
```

### Example 3: Causal Path Analysis

```typescript
// Query
const paths = await client.query({
  query: gql`
    query AnalyzePaths {
      getCausalPaths(
        graphId: "inv-123"
        source: "FundingSource"
        target: "AttackSuccess"
      ) {
        direct {
          nodes
          strength
          contribution
        }
        indirect {
          nodes
          strength
          contribution
        }
        total
      }
    }
  `,
});

// Result
{
  direct: [], // No direct path
  indirect: [
    {
      nodes: ["FundingSource", "ThreatGroup", "Infrastructure", "Attack", "AttackSuccess"],
      strength: 0.72,
      contribution: 0.65
    },
    {
      nodes: ["FundingSource", "ThreatGroup", "Recruitment", "Operators", "Attack", "AttackSuccess"],
      strength: 0.45,
      contribution: 0.35
    }
  ],
  total: 0.72
}
```

---

## Testing Strategy

### Unit Tests

- **Causal Graph Construction**: Validate DAG properties, edge classification
- **Do-Calculus**: Test identifiability conditions, backdoor/frontdoor criteria
- **Path Analysis**: Verify path enumeration, strength calculation
- **Simulation**: Test counterfactual outcomes with known ground truth
- **Optimization**: Verify optimal intervention sets for toy examples

### Integration Tests

- **Neo4j Integration**: End-to-end test with real graph data
- **GraphQL API**: Test all queries and mutations
- **Performance**: Benchmark with graphs of varying sizes

### Test Coverage Target

- **Lines**: > 85%
- **Branches**: > 80%
- **Functions**: > 90%

---

## Future Enhancements

### Phase 2 Features

1. **Temporal Causal Models**: Handle time-varying causal relationships
2. **Causal Discovery**: Learn causal structure from observational data
3. **Sensitivity Analysis**: Quantify robustness to unmeasured confounding
4. **Causal Explanation**: Generate natural language explanations of causal effects
5. **Multi-Objective Optimization**: Balance multiple objectives (cost, risk, effectiveness)

### Phase 3 Features

1. **Reinforcement Learning**: Optimize sequential intervention strategies
2. **Bayesian Causal Networks**: Incorporate uncertainty in causal structure
3. **Transfer Learning**: Apply causal models across investigations
4. **Adversarial Robustness**: Model adversarial responses to interventions

---

## References

### Academic Foundations

1. Pearl, J. (2009). *Causality: Models, Reasoning, and Inference* (2nd ed.). Cambridge University Press.
2. Pearl, J., & Mackenzie, D. (2018). *The Book of Why*. Basic Books.
3. Peters, J., Janzing, D., & Schölkopf, B. (2017). *Elements of Causal Inference*. MIT Press.
4. Imbens, G., & Rubin, D. (2015). *Causal Inference for Statistics, Social, and Biomedical Sciences*. Cambridge University Press.

### Implementation Resources

1. DoWhy (Microsoft Research): Python library for causal inference
2. CausalNex (Quantumblack): Bayesian network toolkit
3. EconML (Microsoft): Machine learning for causal inference
4. Tetrad Project: Causal discovery algorithms

---

## Appendix: Mathematical Notation

| Symbol | Meaning |
|--------|---------|
| P(Y\|X) | Probability of Y given X (observational) |
| P(Y\|do(X)) | Probability of Y given intervention on X |
| P(Y_x\|X',Y') | Counterfactual probability of Y under X=x, given observed X',Y' |
| G | Causal graph (DAG) |
| G_x̄ | Mutilated graph with incoming edges to X removed |
| (Y ⊥ Z \| X) | Y independent of Z conditional on X |
| do(X=x) | Intervention setting X to value x |
| U | Unobserved (latent) variables |
| SCM | Structural Causal Model |

---

**End of Specification**
