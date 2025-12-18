# Uncertainty Field Mapping™

> **Status**: Active Development
> **Owner**: Predictive Analytics Team
> **Last Updated**: 2025-11-27

## Executive Summary

Uncertainty Field Mapping™ provides spatial representation of predictive uncertainty across time, domains, and potential futures within the Summit/IntelGraph platform. By visualizing uncertainty as dynamic fields rather than static confidence intervals, analysts can identify turbulent zones, understand uncertainty propagation, and develop targeted stabilization strategies.

### Key Capabilities

- **Multi-dimensional Uncertainty Fields**: Map uncertainty across time, domain, and scenario dimensions
- **Turbulent Zone Identification**: Automatically detect areas of high uncertainty requiring attention
- **Surface Interpolation**: Generate smooth uncertainty surfaces from sparse prediction points
- **Stabilization Recommendations**: Provide actionable strategies to reduce uncertainty
- **Real-time Field Updates**: Dynamically update uncertainty fields as new data arrives

## Problem Statement

Traditional predictive analytics represent uncertainty through point estimates (confidence intervals, standard errors). This approach has critical limitations:

1. **Lacks Spatial Context**: Point estimates don't reveal how uncertainty propagates across related predictions
2. **Hides Patterns**: Systematic uncertainty patterns (e.g., seasonal volatility) are obscured
3. **No Early Warning**: Cannot identify emerging turbulent zones before predictions fail
4. **Poor Action Guidance**: Doesn't indicate where to focus uncertainty reduction efforts

### Use Cases

**Intelligence Analysis**:
- Identify geopolitical scenarios with highest predictive uncertainty
- Map confidence degradation over forecast horizon
- Detect events that create uncertainty cascades

**Risk Assessment**:
- Visualize uncertainty propagation through causal networks
- Identify critical uncertainty nodes in multi-factor predictions
- Track uncertainty evolution as situations develop

**Decision Support**:
- Compare uncertainty profiles across alternative scenarios
- Identify "fog of war" zones requiring additional intelligence collection
- Optimize resource allocation for uncertainty reduction

## Solution Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Uncertainty Field Mapper                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Field     │  │   Surface    │  │     Zone     │      │
│  │  Generator   │  │ Interpolator │  │  Identifier  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Stabilization Recommender                │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Prediction  │    │     Graph    │    │     Time     │
│   Service    │    │   Database   │    │    Series    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Data Model

#### Uncertainty Field

Represents a complete uncertainty landscape across specified dimensions.

```typescript
interface UncertaintyField {
  id: string;
  investigationId: string;
  dimensions: FieldDimension[];
  points: FieldPoint[];
  resolution: FieldResolution;
  generatedAt: Date;
  metadata: FieldMetadata;
}

interface FieldDimension {
  name: string;
  type: 'temporal' | 'spatial' | 'categorical' | 'continuous';
  range: [number, number] | string[];
  unit?: string;
}

interface FieldPoint {
  coordinates: Record<string, number>;
  uncertainty: number;        // 0-1 normalized
  source: 'measured' | 'interpolated' | 'extrapolated';
  confidence: number;         // Confidence in uncertainty estimate
  contributors: string[];     // Contributing prediction IDs
}
```

#### Uncertainty Surface

2D or 3D surface representation for visualization.

```typescript
interface UncertaintySurface {
  id: string;
  fieldId: string;
  dimensions: [string, string, string?];  // X, Y, Z (optional)
  grid: SurfaceGrid;
  contours: ContourLevel[];
  gradients: GradientVector[];
  peaks: SurfacePeak[];
}

interface ContourLevel {
  value: number;
  path: Coordinate[];
  enclosed: boolean;
}

interface GradientVector {
  position: Coordinate;
  magnitude: number;
  direction: number[];
}
```

#### Turbulent Zone

Region of high uncertainty requiring attention.

```typescript
interface TurbulentZone {
  id: string;
  fieldId: string;
  bounds: ZoneBounds;
  intensity: number;          // Peak uncertainty in zone
  volume: number;             // Multi-dimensional volume
  persistence: number;        // Temporal stability
  drivers: UncertaintyDriver[];
  recommendations: StabilizationStrategy[];
}

interface UncertaintyDriver {
  factor: string;
  contribution: number;       // % of total uncertainty
  trend: 'increasing' | 'decreasing' | 'stable';
  source: string;             // Entity or relationship ID
}
```

#### Stabilization Strategy

Actionable recommendation to reduce uncertainty.

```typescript
interface StabilizationStrategy {
  id: string;
  zoneId: string;
  type: 'data_collection' | 'model_refinement' | 'constraint_addition' | 'scenario_pruning';
  priority: number;           // 0-1, higher = more impactful
  expectedReduction: number;  // Estimated uncertainty reduction
  effort: 'low' | 'medium' | 'high';
  actions: StabilizationAction[];
}

interface StabilizationAction {
  description: string;
  target: string;             // Entity/relationship/model ID
  method: string;
  estimatedImpact: number;
}
```

## Core Algorithms

### 1. Field Generation

**Purpose**: Generate uncertainty field from sparse prediction points.

**Algorithm**:

```typescript
function generateUncertaintyField(
  predictions: Prediction[],
  dimensions: FieldDimension[],
  resolution: FieldResolution
): UncertaintyField {
  // 1. Extract uncertainty measures from predictions
  const measuredPoints = predictions.map(p => ({
    coordinates: extractCoordinates(p, dimensions),
    uncertainty: calculateUncertainty(p),
    source: 'measured',
    confidence: p.confidence,
    contributors: [p.id]
  }));

  // 2. Create interpolation grid
  const grid = createGrid(dimensions, resolution);

  // 3. Interpolate uncertainty at grid points
  const interpolatedPoints = grid.map(coord =>
    interpolateUncertainty(coord, measuredPoints, method: 'rbf')
  );

  // 4. Combine measured and interpolated points
  return {
    id: generateId(),
    points: [...measuredPoints, ...interpolatedPoints],
    dimensions,
    resolution,
    generatedAt: new Date()
  };
}
```

**Uncertainty Calculation**:

For a prediction with multiple uncertainty sources:

```
U_total = √(Σ w_i * U_i²)

where:
  U_i = individual uncertainty components
  w_i = weights based on component importance
```

Components include:
- **Epistemic uncertainty**: Model uncertainty (reducible)
- **Aleatoric uncertainty**: Inherent randomness (irreducible)
- **Data uncertainty**: Measurement and sampling error
- **Structural uncertainty**: Model specification uncertainty

### 2. Surface Interpolation

**Purpose**: Generate smooth 2D/3D surfaces for visualization.

**Algorithm**: Radial Basis Function (RBF) Interpolation

```typescript
function interpolateSurface(
  field: UncertaintyField,
  dimensions: [string, string]
): UncertaintySurface {
  // 1. Project field onto 2D plane
  const projectedPoints = projectToDimensions(field.points, dimensions);

  // 2. Build RBF interpolator
  const rbf = buildRBF(projectedPoints, kernel: 'gaussian');

  // 3. Generate surface grid
  const grid = createSurfaceGrid(dimensions, resolution: 100);
  grid.forEach((x, y) => {
    grid[x][y] = rbf.interpolate([x, y]);
  });

  // 4. Extract contours
  const contours = extractContours(grid, levels: [0.2, 0.4, 0.6, 0.8]);

  // 5. Calculate gradients
  const gradients = calculateGradients(grid);

  return { grid, contours, gradients };
}
```

**RBF Kernel**:

```
φ(r) = exp(-ε * r²)    // Gaussian

where:
  r = ||x - x_i||      // Distance to data point
  ε = shape parameter  // Controls smoothness
```

### 3. Turbulent Zone Identification

**Purpose**: Detect regions of high uncertainty.

**Algorithm**: Density-Based Clustering + Threshold Detection

```typescript
function identifyTurbulentZones(
  field: UncertaintyField,
  threshold: number = 0.7
): TurbulentZone[] {
  // 1. Filter high-uncertainty points
  const highUncertaintyPoints = field.points.filter(
    p => p.uncertainty > threshold
  );

  // 2. Cluster using DBSCAN
  const clusters = dbscan(highUncertaintyPoints, {
    epsilon: calculateAdaptiveEpsilon(field),
    minPoints: 3
  });

  // 3. Analyze each cluster
  return clusters.map(cluster => {
    const bounds = calculateBounds(cluster);
    const intensity = max(cluster.map(p => p.uncertainty));
    const volume = calculateVolume(bounds, field.dimensions);
    const drivers = identifyDrivers(cluster, field);

    return {
      id: generateId(),
      bounds,
      intensity,
      volume,
      drivers,
      persistence: calculatePersistence(cluster, field)
    };
  });
}
```

**Persistence Calculation**:

If temporal dimension exists, measure zone stability:

```
P = 1 - (Δvolume / Δtime)

where:
  Δvolume = rate of zone volume change
  Δtime = observation window
```

### 4. Stabilization Recommendation

**Purpose**: Generate actionable strategies to reduce uncertainty.

**Algorithm**: Multi-Objective Optimization

```typescript
function recommendStabilization(
  zone: TurbulentZone,
  field: UncertaintyField
): StabilizationStrategy[] {
  // 1. Identify uncertainty drivers
  const drivers = zone.drivers.sort((a, b) =>
    b.contribution - a.contribution
  );

  // 2. Generate candidate strategies
  const strategies = [];

  // Data collection strategies
  if (hasDataGaps(zone, field)) {
    strategies.push(generateDataCollectionStrategy(zone, drivers));
  }

  // Model refinement strategies
  if (hasModelDeficiencies(zone, field)) {
    strategies.push(generateModelRefinementStrategy(zone, drivers));
  }

  // Constraint addition strategies
  if (canAddConstraints(zone, field)) {
    strategies.push(generateConstraintStrategy(zone, drivers));
  }

  // 3. Score strategies
  strategies.forEach(s => {
    s.priority = scoreStrategy(s, zone);
    s.expectedReduction = estimateReduction(s, zone);
  });

  // 4. Optimize strategy portfolio
  return optimizePortfolio(strategies, budget, maxEffort);
}
```

**Strategy Scoring**:

```
Score = (Impact * Confidence) / (Cost * Time)

where:
  Impact = Expected uncertainty reduction
  Confidence = Probability of success
  Cost = Resource requirements
  Time = Implementation timeline
```

## API Design

### GraphQL Schema

```graphql
type UncertaintyField {
  id: ID!
  investigationId: ID!
  dimensions: [FieldDimension!]!
  points: [FieldPoint!]!
  resolution: FieldResolution!
  generatedAt: DateTime!
  metadata: FieldMetadata!
}

type FieldDimension {
  name: String!
  type: DimensionType!
  range: DimensionRange!
  unit: String
}

enum DimensionType {
  TEMPORAL
  SPATIAL
  CATEGORICAL
  CONTINUOUS
}

type FieldPoint {
  coordinates: JSON!
  uncertainty: Float!
  source: PointSource!
  confidence: Float!
  contributors: [ID!]!
}

enum PointSource {
  MEASURED
  INTERPOLATED
  EXTRAPOLATED
}

type UncertaintySurface {
  id: ID!
  fieldId: ID!
  dimensions: [String!]!
  grid: SurfaceGrid!
  contours: [ContourLevel!]!
  gradients: [GradientVector!]!
  peaks: [SurfacePeak!]!
}

type TurbulentZone {
  id: ID!
  fieldId: ID!
  bounds: ZoneBounds!
  intensity: Float!
  volume: Float!
  persistence: Float!
  drivers: [UncertaintyDriver!]!
  recommendations: [StabilizationStrategy!]!
}

type StabilizationStrategy {
  id: ID!
  zoneId: ID!
  type: StrategyType!
  priority: Float!
  expectedReduction: Float!
  effort: EffortLevel!
  actions: [StabilizationAction!]!
}

enum StrategyType {
  DATA_COLLECTION
  MODEL_REFINEMENT
  CONSTRAINT_ADDITION
  SCENARIO_PRUNING
}

# Queries
type Query {
  getUncertaintyField(investigationId: ID!, config: FieldConfig): UncertaintyField
  getSurface(fieldId: ID!, dimensions: [String!]!): UncertaintySurface
  getTurbulentZones(fieldId: ID!, threshold: Float): [TurbulentZone!]!
  getStabilizationPlan(zoneId: ID!): [StabilizationStrategy!]!
}

# Mutations
type Mutation {
  generateField(investigationId: ID!, config: FieldConfig!): UncertaintyField!
  markZone(fieldId: ID!, bounds: ZoneBoundsInput!, notes: String): TurbulentZone!
  applyStabilization(strategyId: ID!): StabilizationResult!
}
```

### REST Endpoints (Optional)

```
GET    /api/uncertainty/fields/:investigationId
POST   /api/uncertainty/fields
GET    /api/uncertainty/surfaces/:fieldId
GET    /api/uncertainty/zones/:fieldId
POST   /api/uncertainty/stabilize/:zoneId
```

## Visualization Integration

### 3D Field Visualization

Use Three.js or similar for interactive 3D uncertainty field exploration:

```typescript
// Render uncertainty field as point cloud
const pointCloud = new THREE.Points(
  createPointGeometry(field),
  createUncertaintyMaterial()
);

// Color by uncertainty: blue (low) → red (high)
material.vertexColors = true;
material.size = 2;
```

### Heatmap Overlays

For 2D surfaces, use D3.js contour plots:

```typescript
const contours = d3.contours()
  .size([width, height])
  .thresholds(d3.range(0, 1, 0.1));

svg.append("g")
  .selectAll("path")
  .data(contours(uncertaintyGrid))
  .enter().append("path")
  .attr("d", d3.geoPath())
  .attr("fill", d => colorScale(d.value));
```

### Time-Series Animation

Animate uncertainty evolution over temporal dimension:

```typescript
function animateUncertaintyEvolution(field: UncertaintyField) {
  const temporalDim = field.dimensions.find(d => d.type === 'temporal');
  const frames = generateTemporalFrames(field, temporalDim);

  frames.forEach((frame, i) => {
    setTimeout(() => updateVisualization(frame), i * frameDelay);
  });
}
```

## Performance Considerations

### Scalability

- **Field Size**: Up to 1M points per field
- **Real-time Updates**: <2s for field regeneration
- **Surface Interpolation**: <500ms for 100x100 grid
- **Zone Detection**: <1s for typical fields

### Optimization Strategies

1. **Spatial Indexing**: Use R-trees for fast point queries
2. **Adaptive Resolution**: Increase resolution only in high-uncertainty areas
3. **Caching**: Cache interpolated surfaces for common dimension pairs
4. **Incremental Updates**: Update only affected regions when new data arrives
5. **GPU Acceleration**: Offload interpolation to GPU for large fields

## Security & Privacy

### Access Control

- Field access inherits investigation-level permissions
- Turbulent zone marking requires `ANALYST` role
- Stabilization strategy execution requires `SENIOR_ANALYST` role

### Audit Logging

All operations logged to `audit_svc`:
- Field generation requests
- Zone identification
- Stabilization strategy application
- Field exports

### Data Classification

Uncertainty fields inherit classification from source predictions:
- `UNCLASSIFIED`
- `CONFIDENTIAL`
- `SECRET`
- `TOP_SECRET`

## Testing Strategy

### Unit Tests

- Field generation algorithms
- Surface interpolation accuracy
- Zone detection correctness
- Strategy scoring logic

### Integration Tests

- End-to-end field generation from predictions
- GraphQL resolver functionality
- Database persistence
- Cache invalidation

### Performance Tests

- Field generation with 1M points
- Real-time update latency
- Concurrent field requests
- Memory usage under load

### Visual Regression Tests

- Surface rendering consistency
- Contour extraction accuracy
- Gradient visualization

## Future Enhancements

### Phase 2

- **Uncertainty Propagation**: Track how uncertainty flows through causal chains
- **Multi-Field Comparison**: Compare uncertainty profiles across scenarios
- **Uncertainty Budgets**: Allocate acceptable uncertainty across predictions
- **Automated Monitoring**: Alert when uncertainty exceeds thresholds

### Phase 3

- **Uncertainty Reduction Game**: Gamify uncertainty reduction for analysts
- **What-If Scenarios**: Simulate impact of different stabilization strategies
- **Uncertainty Attribution**: Decompose uncertainty by contributing factors
- **Cross-Investigation Patterns**: Learn uncertainty patterns across investigations

## References

- **Uncertainty Quantification**: Saltelli, A. et al. (2008). "Global Sensitivity Analysis"
- **Spatial Interpolation**: Cressie, N. (1993). "Statistics for Spatial Data"
- **Turbulence Detection**: Ester, M. et al. (1996). "DBSCAN: A Density-Based Clustering Algorithm"
- **Decision Under Uncertainty**: Kahneman, D. & Tversky, A. (1979). "Prospect Theory"

## Glossary

- **Epistemic Uncertainty**: Uncertainty due to lack of knowledge (reducible)
- **Aleatoric Uncertainty**: Uncertainty due to inherent randomness (irreducible)
- **Turbulent Zone**: Region of high predictive uncertainty
- **Stabilization**: Process of reducing uncertainty through targeted actions
- **Uncertainty Field**: Spatial representation of uncertainty across dimensions
- **Surface Interpolation**: Generating smooth continuous surfaces from discrete points

---

**Status**: Ready for Implementation
**Next Steps**: Service implementation, GraphQL schema, frontend integration
