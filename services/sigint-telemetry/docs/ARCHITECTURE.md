# SIGINT Telemetry Architecture

## Overview

The SIGINT Telemetry System is a defensive simulation platform designed for blue team training and security research. It operates exclusively on synthetic data.

## Design Principles

1. **Defense-First**: All capabilities focus on detection, not exploitation
2. **Synthetic Data Only**: No real-world data or targeting
3. **Reproducibility**: Seeded random generation for consistent testing
4. **Modularity**: Loosely coupled components for flexibility
5. **Type Safety**: Full TypeScript with Zod validation

## Components

### 1. Telemetry Schemas

Zod-based schemas define the structure of all telemetry events:

```
BaseEvent
├── NetworkEvent (flow, DNS, HTTP)
├── IdentityEvent (auth, device posture, session)
├── EndpointEvent (process, file, registry, EDR alert)
└── CloudEvent (IAM, resource, API call, security finding)
```

All events include:
- Unique ID
- Timestamp
- Event type discriminator
- Source identifier
- Data classification
- `isSynthetic: true` flag (enforced)

### 2. Synthetic Generators

Generators create realistic but fake telemetry:

- **SeededRandom**: Deterministic random number generator
- **Domain Generators**: IPs, hostnames, usernames, domains
- **Event Generators**: Type-specific event factories
- **Campaign Generator**: ATT&CK-aligned attack sequences

### 3. Detection Engine

Rule-based detection with pluggable rules:

```typescript
interface DetectionRule {
  id: string;
  eventTypes: string[];
  evaluate: (event) => confidence | null;
  mitreTactics?: string[];
  mitreTechniques?: string[];
}
```

Features:
- Confidence scoring (0-1)
- Severity levels (low/medium/high/critical)
- MITRE ATT&CK mapping
- Batch evaluation

### 4. Anomaly Detection

Statistical anomaly detection using z-scores:

- Online variance calculation (Welford's algorithm)
- Per-metric baselines
- Configurable thresholds
- Automatic metric extraction

### 5. Infrastructure Graph

Graph-based modeling of synthetic infrastructure:

- **Nodes**: Identities, endpoints, servers, databases, cloud resources
- **Edges**: Trust, reachability, permissions
- **Analysis**: Path finding, blast radius calculation

### 6. Control Simulation

Security control effectiveness modeling:

- Preventive controls (block probability)
- Detective controls (detection probability)
- Residual risk calculation
- Campaign-level evaluation

## Data Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Generators │───▶│   Pipeline   │───▶│  Detection  │
└─────────────┘    └──────────────┘    │   Engine    │
                                       └──────┬──────┘
                                              │
                   ┌──────────────┐    ┌──────▼──────┐
                   │   Controls   │◀───│  Simulation │
                   │  Simulation  │    │   Runner    │
                   └──────────────┘    └─────────────┘
```

## Security Considerations

### Guardrails

1. **isSynthetic Flag**: All events must have `isSynthetic: true`
2. **Documentation Ranges**: IP addresses use RFC 5737 TEST-NET ranges
3. **Synthetic Entities**: All usernames, hostnames are fabricated
4. **No Real Targeting**: No real organization or individual references

### Privacy by Design

- Data minimization in schemas
- Classification labels on events
- Retention policy fields
- Role-based access patterns (for future implementation)

## Extension Points

### Adding Detection Rules

```typescript
const customRule: DetectionRule = {
  id: 'custom-001',
  name: 'My Custom Detection',
  eventTypes: ['identity.auth'],
  severity: 'high',
  enabled: true,
  evaluate: (event) => {
    // Return confidence 0-1 or null
    return event.suspicious ? 0.9 : null;
  },
};

engine.registerRule(customRule);
```

### Adding Event Types

1. Define Zod schema in `src/schemas/`
2. Create generator in `src/generators/`
3. Add detection rules in `src/detections/rules/`
4. Export from index files

## Performance

- Generators: ~100k events/second
- Detection: ~50k events/second
- Anomaly: ~100k events/second
- All metrics on single-threaded execution

## Future Enhancements

- Streaming pipeline support
- Real-time simulation dashboard
- ML-based detection rules
- Graph neural network analysis
- Multi-tenant simulation
