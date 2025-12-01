# SIGINT Telemetry System

Defensive SIGINT/CYBINT telemetry simulation stack for blue team analytics.

## IMPORTANT DISCLAIMER

**This is a SIMULATION-ONLY system.**

- All data is synthetic and fabricated
- No real-world targeting or sensitive data collection
- For defensive testing, security research, and training only
- Complies with all legal, ethical, and safety constraints

## Features

- **Telemetry Schemas**: Zod-validated schemas for network, identity, endpoint, and cloud events
- **Synthetic Generators**: Reproducible fake data generation for all telemetry types
- **Detection Engine**: Rule-based detection with MITRE ATT&CK mapping
- **Anomaly Detection**: Statistical baseline and z-score anomaly detection
- **Attack Simulation**: Campaign generation and control effectiveness simulation
- **Infrastructure Modeling**: Graph-based attack path analysis

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run simulation
pnpm simulate
```

## Usage

### Generate Synthetic Telemetry

```typescript
import { generateNetworkBatch, generateIdentityBatch } from '@summit/sigint-telemetry';

// Generate 100 network events
const networkEvents = generateNetworkBatch(100);

// Generate 50 identity events
const identityEvents = generateIdentityBatch(50);
```

### Run Detection Engine

```typescript
import { createDetectionEngine, allRules } from '@summit/sigint-telemetry';

const engine = createDetectionEngine();
engine.registerRules(allRules);

const results = engine.evaluate(event);
console.log(`Detections: ${results.length}`);
```

### Run Full Simulation

```typescript
import { runSimulation } from '@summit/sigint-telemetry';

const results = await runSimulation({
  seed: 42,
  backgroundEventCount: 200,
});

console.log(results.summary);
```

## Architecture

```
src/
├── schemas/          # Zod telemetry schemas
│   ├── base.ts       # Base event schema
│   ├── network.ts    # Network flow, DNS, HTTP
│   ├── identity.ts   # Auth, device posture, sessions
│   ├── endpoint.ts   # Process, file, registry, EDR alerts
│   └── cloud.ts      # IAM, resources, API calls, findings
├── generators/       # Synthetic data generators
│   ├── utils.ts      # Seeded RNG and helpers
│   ├── network.ts    # Network event generators
│   ├── identity.ts   # Identity event generators
│   ├── endpoint.ts   # Endpoint event generators
│   ├── cloud.ts      # Cloud event generators
│   └── campaign.ts   # Attack campaign generator
├── detections/       # Detection engine
│   ├── engine.ts     # Core detection engine
│   ├── anomaly.ts    # Statistical anomaly detection
│   └── rules/        # Detection rules
│       ├── identity.ts
│       ├── network.ts
│       ├── endpoint.ts
│       └── cloud.ts
└── simulation/       # Simulation harness
    ├── graph.ts      # Infrastructure graph model
    ├── controls.ts   # Security control simulation
    └── runner.ts     # Simulation orchestrator
```

## Detection Rules

Built-in rules cover:

| Category | Rules | Coverage |
|----------|-------|----------|
| Identity | 5 | Impossible travel, brute force, MFA bypass |
| Network | 6 | DGA domains, large transfers, suspicious ports |
| Endpoint | 6 | Suspicious processes, encoded commands, sensitive files |
| Cloud | 7 | IAM escalation, MFA disabled, public resources |

All rules map to MITRE ATT&CK tactics and techniques.

## Security Controls

Simulated controls include:

- Multi-Factor Authentication (MFA)
- Conditional Access Policies
- Endpoint Detection and Response (EDR)
- Network Segmentation
- Data Loss Prevention (DLP)
- Data Encryption
- Cloud Audit Logging (CloudTrail)
- SIEM

## API Reference

### Schemas

- `NetworkFlowSchema` - Network flow log events
- `DnsEventSchema` - DNS query events
- `HttpEventSchema` - HTTP request events
- `AuthEventSchema` - Authentication events
- `ProcessEventSchema` - Process execution events
- `IamEventSchema` - Cloud IAM events

### Generators

- `generateNetworkBatch(count)` - Generate network events
- `generateIdentityBatch(count)` - Generate identity events
- `generateEndpointBatch(count)` - Generate endpoint events
- `generateCloudBatch(count)` - Generate cloud events
- `generateCampaign(template)` - Generate attack campaign

### Detection

- `createDetectionEngine()` - Create detection engine
- `createAnomalyDetector()` - Create anomaly detector
- `allRules` - All built-in detection rules

### Simulation

- `runSimulation(config)` - Run full simulation
- `createSampleInfrastructure()` - Create sample graph
- `securityControls` - Built-in security controls

## License

UNLICENSED - Internal use only
