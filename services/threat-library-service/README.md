# Threat Library Service

A comprehensive Threat Pattern Library and TTP Knowledge Graph service for the IntelGraph platform. This service provides reusable threat patterns, MITRE ATT&CK mappings, and machine-readable detection specifications for intelligence analysis.

## Overview

The Threat Library Service is the authoritative source for:

- **Threat Archetypes**: High-level categorizations of threat actor behaviors and campaigns
- **TTPs (Tactics, Techniques, Procedures)**: MITRE ATT&CK-aligned attack techniques with detection guidance
- **Pattern Templates**: Reusable detection patterns with graph motifs and signal specifications
- **Indicator Patterns**: Observable patterns for IOC-based detection

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Threat Library Service                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │   REST API   │   │   Service    │   │     Repository       │ │
│  │   (Express)  │──▶│    Layer     │──▶│   (In-Memory/DB)     │ │
│  └──────────────┘   └──────────────┘   └──────────────────────┘ │
│         │                  │                      │              │
│         ▼                  ▼                      ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │   Validation │   │   Cypher     │   │       Cache          │ │
│  │    (Zod)     │   │  Generator   │   │    (LRU + TTL)       │ │
│  └──────────────┘   └──────────────┘   └──────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                                         │
         ▼                                         ▼
┌─────────────────┐                    ┌─────────────────────────┐
│   Analytics     │                    │    Copilot / UI         │
│   Service       │◀── Pattern Specs ──│    (Explanations)       │
└─────────────────┘                    └─────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.18.0
- pnpm >= 9.12.0

### Installation

```bash
# From the monorepo root
pnpm install

# Or install just this service
cd services/threat-library-service
pnpm install
```

### Running the Service

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start
```

The service runs on port `3025` by default (configurable via `PORT` environment variable).

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## API Reference

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/health/ready` | GET | Readiness check with statistics |

### Threat Archetype Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/threats` | GET | List threat archetypes with filtering |
| `/api/v1/threats/:id` | GET | Get threat by ID |
| `/api/v1/threats` | POST | Create new threat |
| `/api/v1/threats/:id` | PUT | Update threat |
| `/api/v1/threats/:id/deprecate` | POST | Deprecate threat |
| `/api/v1/threats/:id` | DELETE | Archive threat |
| `/api/v1/threats/:threatId/patterns` | GET | List patterns for threat |
| `/api/v1/threats/:threatId/ttps` | GET | List TTPs for threat |
| `/api/v1/threats/:threatId/indicators` | GET | List indicators for threat |
| `/api/v1/threats/:threatId/explain` | GET | Generate explanation payload |
| `/api/v1/threats/:threatId/explain/brief` | GET | Generate brief explanation |
| `/api/v1/threats/:threatId/evaluate` | POST | Generate evaluation specs |

### TTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ttps` | GET | List TTPs with filtering |
| `/api/v1/ttps/:id` | GET | Get TTP by ID |
| `/api/v1/ttps/technique/:techniqueId` | GET | Get TTPs by MITRE technique |
| `/api/v1/ttps` | POST | Create new TTP |
| `/api/v1/ttps/:id` | PUT | Update TTP |

### Pattern Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/patterns` | GET | List pattern templates |
| `/api/v1/patterns/:id` | GET | Get pattern by ID |
| `/api/v1/patterns` | POST | Create pattern |
| `/api/v1/patterns/:id` | PUT | Update pattern |
| `/api/v1/patterns/:id/validate` | GET | Validate pattern coverage |

### Indicator Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/indicators` | GET | List indicator patterns |
| `/api/v1/indicators/:id` | GET | Get indicator by ID |
| `/api/v1/indicators` | POST | Create indicator |

### Detection Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/evaluate` | POST | Generate pattern evaluation spec |
| `/api/v1/statistics` | GET | Get library statistics |

## Data Models

### ThreatArchetype

High-level threat categorization with associated patterns and TTPs.

```typescript
interface ThreatArchetype {
  id: string;
  name: string;
  aliases?: string[];
  description: string;
  summary: string;
  sophistication: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'NATION_STATE';
  motivation: ('ESPIONAGE' | 'FINANCIAL_GAIN' | 'SABOTAGE' | ...)[];
  targetSectors: string[];
  typicalTTPs: string[];         // TTP IDs
  patternTemplates: string[];    // PatternTemplate IDs
  indicators: string[];          // IndicatorPattern IDs
  countermeasures: Countermeasure[];
  riskScore: number;             // 0-100
  prevalence: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EMERGING';
  active: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
  metadata: Metadata;
}
```

### TTP (Tactics, Techniques, Procedures)

MITRE ATT&CK-aligned attack technique with detection rules.

```typescript
interface TTP {
  id: string;
  name: string;
  description: string;
  tactic: Tactic;               // MITRE ATT&CK tactic
  techniqueId: string;          // e.g., 'T1566'
  techniqueName: string;
  subTechniqueId?: string;      // e.g., 'T1566.001'
  procedures: Procedure[];
  platforms: Platform[];
  dataSources: string[];
  detectionRules?: DetectionRule[];
  mitreReference: MitreReference;
  severity: Severity;
  prevalence: 'COMMON' | 'UNCOMMON' | 'RARE';
  status: PatternStatus;
  metadata: Metadata;
}
```

### PatternTemplate

Reusable detection pattern with graph motifs and signals.

```typescript
interface PatternTemplate {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  graphMotifs: GraphMotif[];      // Graph pattern specifications
  signals: SignalSpec[];          // Signal detection specs
  indicators: string[];           // IndicatorPattern IDs
  ttps: string[];                 // TTP IDs
  requiredMotifMatches: number;
  requiredSignalMatches: number;
  confidenceFormula?: string;
  severity: Severity;
  status: PatternStatus;
  metadata: Metadata;
}
```

### GraphMotif

Machine-readable graph pattern definition.

```typescript
interface GraphMotif {
  id: string;
  name: string;
  description: string;
  nodes: NodeConstraint[];
  edges: EdgeConstraint[];
  timeConstraints?: TimeConstraint[];
  spatialConstraints?: SpatialConstraint;
  aggregations?: Aggregation[];
  cypherQuery?: string;           // Pre-compiled Cypher
  weight: number;                 // Confidence weight (0-1)
}
```

## Detection Integration

### Pattern Evaluation Spec

The service generates evaluation specs for the Analytics service to execute pattern matching:

```typescript
interface PatternEvaluationSpec {
  specId: string;
  patternId: string;
  patternName: string;
  cypherQueries: {
    id: string;
    query: string;
    parameters: Record<string, unknown>;
    purpose: string;
    weight: number;
  }[];
  signalEvaluations: {
    signalId: string;
    evaluationLogic: string;
    dataSource: string;
    parameters: Record<string, unknown>;
  }[];
  indicatorChecks: {
    indicatorId: string;
    pattern: string;
    patternFormat: string;
  }[];
  matchCriteria: {
    requiredMotifMatches: number;
    requiredSignalMatches: number;
    minimumConfidence: number;
  };
  generatedAt: string;
}
```

### Example: Generate Evaluation Spec

```bash
curl -X POST http://localhost:3025/api/v1/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "patternId": "pattern-uuid",
    "evaluationOptions": {
      "maxMatches": 100,
      "minConfidence": 0.7,
      "includePartialMatches": false,
      "timeout": 30000
    }
  }'
```

## Explanation Payloads

For UI/Copilot integration, the service generates human-readable explanations:

```typescript
interface ExplanationPayload {
  threatId: string;
  threatName: string;
  summary: string;
  severity: Severity;
  confidence: Confidence;
  explanation: {
    whatItIs: string;
    whyItMatters: string;
    howItWorks: string;
    typicalTargets: string[];
    indicators: { type: string; description: string; examples: string[] }[];
    mitigations: { name: string; description: string; effectiveness: string }[];
    relatedThreats: { id: string; name: string; relationship: string }[];
    timeline?: { phase: string; description: string; indicators: string[] }[];
  };
  mitreMapping: { tacticName: string; techniques: {...}[] }[];
  references: { title: string; url: string; source: string }[];
  generatedAt: string;
}
```

## Lifecycle Management

### Pattern Status Flow

```
DRAFT → ACTIVE → DEPRECATED → ARCHIVED
```

- **DRAFT**: Pattern under development, not used for detection
- **ACTIVE**: Pattern approved and in use
- **DEPRECATED**: Pattern marked for removal, detection still runs
- **ARCHIVED**: Pattern removed from active use

### Versioning

All entities maintain version history with changelog:

```typescript
interface Metadata {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  changelog: {
    version: number;
    timestamp: string;
    author: string;
    description: string;
  }[];
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3025 | Service port |
| `HOST` | 0.0.0.0 | Service host |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |
| `NODE_ENV` | development | Environment mode |

## Integration Contracts

### Analytics Service

Analytics reads pattern specs from this service. It does **not** maintain its own copy:

```typescript
// Analytics service fetches patterns
const spec = await fetch(`${THREAT_LIBRARY_URL}/api/v1/evaluate`, {
  method: 'POST',
  body: JSON.stringify({ patternId, evaluationOptions })
});
```

### Signal Service

Signal service subscribes to indicator patterns for real-time detection:

```typescript
// Periodically sync indicators
const indicators = await fetch(`${THREAT_LIBRARY_URL}/api/v1/indicators`);
```

### Copilot Service

Copilot uses explanation payloads for user-facing threat explanations:

```typescript
const explanation = await fetch(
  `${THREAT_LIBRARY_URL}/api/v1/threats/${threatId}/explain`
);
```

## Development

### Project Structure

```
threat-library-service/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── api.test.ts      # API integration tests
│   │   ├── repository.test.ts
│   │   ├── service.test.ts
│   │   └── cypher-generator.test.ts
│   ├── data/
│   │   └── sample-threats.ts # Sample data for testing
│   ├── utils/
│   │   ├── cache.ts         # LRU cache implementation
│   │   └── cypher-generator.ts # Cypher query generator
│   ├── errors.ts            # Custom error classes
│   ├── index.ts             # Public exports
│   ├── repository.ts        # Data access layer
│   ├── server.ts            # Express server
│   ├── service.ts           # Business logic
│   └── types.ts             # Type definitions
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

### Adding New Patterns

1. Define the pattern template with graph motifs
2. Link to relevant TTPs and indicators
3. Validate pattern coverage using `/api/v1/patterns/:id/validate`
4. Test detection with synthetic graphs
5. Promote from DRAFT to ACTIVE

### Testing Patterns

Use the validation endpoint to check pattern quality:

```bash
curl http://localhost:3025/api/v1/patterns/{id}/validate
```

Response includes:
- Validation status (valid/invalid)
- Issues found
- Coverage metrics (motifs, signals, indicators)

## Contributing

1. Follow the CLAUDE.md conventions
2. Add tests for new functionality
3. Update documentation
4. Validate patterns before committing
5. Run `pnpm test && pnpm lint && pnpm typecheck`

## License

UNLICENSED - IntelGraph Internal
