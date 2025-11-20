# @summit/data-quality

Enterprise data quality management platform with automated validation, profiling, and quality metrics for intelligence operations.

## Features

### 1. Data Profiling
- Automated data profiling with statistical analysis
- Data type and format detection
- Completeness and validity checks
- Uniqueness and consistency analysis
- Distribution analysis and pattern detection
- Sample-based profiling for large datasets

### 2. Data Validation
- Rule-based validation engine
- Multiple rule types: completeness, uniqueness, validity, consistency, accuracy, timeliness
- Cross-field validation
- Referential integrity checks
- Custom validation functions
- Real-time and batch validation

### 3. Quality Metrics
- Multi-dimensional quality scoring
- Quality trend analysis
- Historical score tracking
- Automated recommendations
- Quality degradation detection

### 4. Anomaly Detection
- Volume anomaly detection (spikes and drops)
- Schema drift detection
- Pattern deviation alerts
- Statistical outlier detection
- Quality degradation monitoring
- Data freshness checks

### 5. Data Remediation
- Automated data cleansing
- Standardization rules
- Duplicate resolution
- Missing value imputation
- Data quarantine capabilities
- Remediation workflow automation

## Installation

```bash
pnpm add @summit/data-quality
```

## Usage

### Basic Usage

```typescript
import { DataQualityEngine, QualityRule } from '@summit/data-quality';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  user: 'user',
  password: 'password',
});

const engine = new DataQualityEngine(pool);

// Define quality rules
const rules: QualityRule[] = [
  {
    id: 'completeness-check',
    name: 'Email Completeness',
    description: 'Email field must be complete',
    type: 'completeness',
    severity: 'high',
    scope: 'column',
    condition: {
      operator: 'greater-than',
      value: 'email',
    },
    threshold: 95,
    actions: [],
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Run quality assessment
const assessment = await engine.assessDataQuality('users', rules);

console.log('Quality Score:', assessment.qualityScore.overallScore);
console.log('Validation Results:', assessment.validationResults);
console.log('Anomalies:', assessment.anomalies);
```

### Advanced Profiling

```typescript
const profiler = engine.getProfiler();

const profile = await profiler.profileColumn('users', 'email', {
  sampleSize: 10000,
  includePatterns: true,
  includeDistribution: true,
  includeStatistics: true,
});

console.log('Completeness:', profile.completeness);
console.log('Uniqueness:', profile.uniqueness);
console.log('Patterns:', profile.patterns);
```

### Custom Validation Rules

```typescript
const validator = engine.getValidator();

validator.registerRule({
  id: 'email-format',
  name: 'Valid Email Format',
  description: 'Email must match valid format',
  type: 'pattern',
  severity: 'high',
  scope: 'column',
  condition: {
    operator: 'matches',
    value: {
      column: 'email',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    },
  },
  actions: [
    { type: 'alert', config: { channel: 'email' } },
    { type: 'quarantine', config: {} },
  ],
  enabled: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const results = await validator.validate('users');
```

### Anomaly Detection

```typescript
const detector = engine.getAnomalyDetector();

// Detect schema drift
const schemaDrift = await detector.detectSchemaDrift('users', {
  email: 'character varying',
  created_at: 'timestamp with time zone',
  status: 'character varying',
});

// Detect anomalies in profile
const currentProfile = await profiler.profileColumn('users', 'email');
const historicalProfiles = [/* previous profiles */];

const anomalies = await detector.detectAnomalies(
  'users',
  currentProfile,
  historicalProfiles
);
```

### Data Remediation

```typescript
const remediator = engine.getRemediator();

// Create remediation plan
const validationResult = validationResults[0];
const plan = remediator.createRemediationPlan(validationResult, 'cleanse');

// Execute remediation
await remediator.executeRemediationPlan(plan);

console.log('Remediation Status:', plan.status);
console.log('Steps:', plan.steps);
```

### Quality Dashboard

```typescript
const dashboard = await engine.getQualityDashboard('users');

console.log('Overall Score:', dashboard.score.overallScore);
console.log('Dimensions:', dashboard.score.dimensions);
console.log('Recommendations:', dashboard.score.recommendations);
console.log('Recent Anomalies:', dashboard.recentAnomalies);
```

## API Reference

### DataQualityEngine

Main orchestrator class that provides access to all data quality components.

#### Methods

- `assessDataQuality(tableName, rules, config)` - Run comprehensive quality assessment
- `remediateQualityIssues(validationResult, strategy)` - Create and execute remediation plan
- `getQualityDashboard(datasetId)` - Get quality dashboard data
- `getProfiler()` - Get data profiler instance
- `getValidator()` - Get data validator instance
- `getScorer()` - Get quality scorer instance
- `getAnomalyDetector()` - Get anomaly detector instance
- `getRemediator()` - Get data remediator instance

### DataProfiler

Automated data profiling with statistical analysis.

#### Methods

- `profileColumn(tableName, columnName, config)` - Profile a single column
- `profileDataset(tableName, config)` - Profile entire dataset

### DataValidator

Rule-based validation engine.

#### Methods

- `registerRule(rule)` - Register a quality rule
- `validate(tableName, config)` - Validate dataset against all rules
- `getRules()` - Get all registered rules
- `removeRule(ruleId)` - Remove a rule
- `clearRules()` - Clear all rules

### QualityScorer

Calculate quality scores and metrics.

#### Methods

- `calculateScore(datasetId, profiles, validationResults)` - Calculate overall quality score
- `saveScore(score)` - Save quality score to database

### AnomalyDetector

Detect data anomalies and quality issues.

#### Methods

- `detectAnomalies(datasetId, currentProfile, historicalProfiles)` - Detect anomalies in dataset
- `detectSchemaDrift(tableName, expectedSchema)` - Detect schema drift

### DataRemediator

Automated data quality remediation.

#### Methods

- `createRemediationPlan(validationResult, strategy)` - Create remediation plan
- `executeRemediationPlan(plan)` - Execute remediation plan

## License

MIT
