# Influence Operations Defense - Integration Guide

> **Purpose**: Technical integration guide for implementing Influence Operations Defense capabilities on Summit/IntelGraph platform.
>
> **Audience**: Engineers, architects, and technical leads
>
> **Related**: [INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md](./INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md)

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Existing Capabilities Mapping](#existing-capabilities-mapping)
3. [Service Architecture](#service-architecture)
4. [Data Model Integration](#data-model-integration)
5. [API Integration Patterns](#api-integration-patterns)
6. [GraphQL Schema Extensions](#graphql-schema-extensions)
7. [Neo4j Graph Patterns](#neo4j-graph-patterns)
8. [AI/ML Pipeline Integration](#aiml-pipeline-integration)
9. [Real-time Streaming Integration](#real-time-streaming-integration)
10. [Observability Integration](#observability-integration)

---

## Integration Overview

The Influence Operations Defense capabilities leverage Summit/IntelGraph's existing infrastructure:

### Core Platform Components Used

```
┌─────────────────────────────────────────────────────────────┐
│                    New Capabilities                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Narrative   │ │  Cognitive   │ │  Behavioral  │        │
│  │  Analysis    │ │  Defense     │ │  Detection   │        │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │
│         │                │                │                  │
└─────────┼────────────────┼────────────────┼──────────────────┘
          │                │                │
┌─────────┴────────────────┴────────────────┴──────────────────┐
│              Existing Summit Platform                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  GraphQL API │ │  Neo4j Graph │ │  AI/ML Engine│        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  DefPsyOps   │ │  Narrative   │ │  Threat      │        │
│  │  Service     │ │  Simulation  │ │  Hunting     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  PostgreSQL  │ │  Redis Cache │ │  Kafka Stream│        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

### Integration Principles

1. **Leverage Existing Services**: Extend rather than replace existing capabilities
2. **Standard Patterns**: Follow Summit's established patterns for services, APIs, and data storage
3. **Composability**: Build modular services that can be composed for complex workflows
4. **Observability**: Integrate with existing monitoring and alerting infrastructure
5. **Security**: Utilize existing authentication, authorization, and audit mechanisms

---

## Existing Capabilities Mapping

### 1. DefensivePsyOpsService

**Location**: `server/src/services/DefensivePsyOpsService.ts`

**Current Capabilities**:
- Psychological threat detection
- Manipulation technique analysis
- Cognitive manipulation protection
- Counter-narrative generation
- Psychological impact assessment

**Integration Points**:

| Sprint | Capability | How DefensivePsyOpsService is Used |
|--------|-----------|-----------------------------------|
| 1 | Narrative Identification | Use `detectPsychologicalThreats()` for initial narrative flagging |
| 6 | Manipulation Detection | Leverage `analyzeManipulationTechniques()` for technique identification |
| 7 | Bias Exploitation | Extend `detectBiasExploitation()` with additional bias types |
| 8 | Resilience Training | Use `protectAgainstCognitiveManipulation()` to trigger training |
| 9 | Protective Interventions | Leverage `applyProtectiveMeasures()` for intervention deployment |
| 18 | Counter-Narratives | Use `generateDefensiveCounterNarrative()` for response creation |

**Extension Pattern**:
```typescript
// Extend DefensivePsyOpsService for narrative analysis
import { DefensivePsyOpsService } from '../services/DefensivePsyOpsService';

export class NarrativeAnalysisService extends DefensivePsyOpsService {
  async analyzeNarrative(content: string, metadata: any) {
    // First check for psychological threats
    const threat = await this.detectPsychologicalThreats(content, metadata);

    // Add narrative-specific analysis
    const narrativeSignature = await this.extractNarrativeSignature(content);
    const taxonomy = await this.classifyNarrative(narrativeSignature);

    return {
      threat,
      narrativeSignature,
      taxonomy,
    };
  }

  private async extractNarrativeSignature(content: string) {
    // New functionality
  }
}
```

---

### 2. Active Measures Module

**Location**: `active-measures-module/`

**Current Capabilities**:
- Red/blue simulation frameworks
- PsyOps framework
- Active measures engine
- Analytics engine
- Real-time monitoring

**Integration Points**:

| Sprint | Capability | How Active Measures Module is Used |
|--------|-----------|-----------------------------------|
| 2 | Propagation Tracking | Use simulation framework to model propagation |
| 28 | Narrative Simulation | Leverage red-blue simulation for conflict modeling |
| 29 | Strategic Resilience | Use simulation to test communication strategies |

**Extension Pattern**:
```typescript
// Use active measures simulation for narrative propagation
import { SimulationFramework } from 'active-measures-module/src/ai/SimulationFramework';

export class NarrativePropagationService {
  private simulator: SimulationFramework;

  async modelPropagation(narrative: Narrative, network: Network) {
    // Configure simulation parameters
    const scenario = {
      initialConditions: {
        narrative: narrative.content,
        seedNodes: narrative.sources,
      },
      network: network,
      timeSteps: 100,
    };

    // Run simulation
    const results = await this.simulator.run(scenario);

    // Extract propagation metrics
    return {
      velocity: this.calculateVelocity(results),
      reach: this.calculateReach(results),
      mutations: this.detectMutations(results),
    };
  }
}
```

---

### 3. Neo4j Graph Database

**Location**: `server/src/db/neo4j.ts`, `config/neo4j.ts`

**Current Capabilities**:
- Entity and relationship storage
- Temporal queries
- Graph analytics
- Community detection
- Path finding

**Integration Points**:

| Sprint | Capability | How Neo4j is Used |
|--------|-----------|-------------------|
| 1 | Narrative Storage | Store narratives as nodes with relationships to sources |
| 2 | Propagation Tracking | Use temporal queries to track narrative spread |
| 5 | Attribution | Graph traversal to identify source actors |
| 11 | Bot Detection | Network analysis to identify bot clusters |
| 12 | CIB Detection | Community detection for coordinated behavior |
| 14 | Amplification Networks | Centrality algorithms to find key amplifiers |
| 21 | Ecosystem Mapping | Store media outlets and their connections |
| 22 | Influence Networks | Model influence relationships in graph |

**Data Model Pattern**:
```cypher
// Narrative node with temporal properties
CREATE (n:Narrative {
  id: 'narr_123',
  content: 'narrative text',
  signature: 'hash_of_content',
  detectedAt: datetime(),
  validFrom: datetime(),
  validTo: null,
  threatLevel: 'MEDIUM',
  taxonomy: ['divisive', 'polarization']
})

// Source relationship
CREATE (s:Source {id: 'src_456', type: 'Twitter', handle: '@example'})
CREATE (s)-[:ORIGINATED {at: datetime()}]->(n)

// Propagation relationship
CREATE (a:Actor {id: 'actor_789'})
CREATE (a)-[:AMPLIFIED {
  at: datetime(),
  reach: 10000,
  engagement: 500
}]->(n)

// Mutation relationship
CREATE (n2:Narrative {id: 'narr_124', content: 'mutated narrative'})
CREATE (n)-[:MUTATED_TO {
  at: datetime(),
  similarity: 0.85,
  changes: ['word_substitution', 'tone_shift']
}]->(n2)
```

**Query Pattern**:
```typescript
// Service integration with Neo4j
import { neo4jDriver } from '../db/neo4j';

export class NarrativeGraphService {
  async trackPropagation(narrativeId: string, timeRange: [Date, Date]) {
    const session = neo4jDriver.session();

    try {
      const result = await session.run(`
        MATCH (n:Narrative {id: $narrativeId})
        MATCH (a:Actor)-[r:AMPLIFIED]->(n)
        WHERE r.at >= $startTime AND r.at <= $endTime
        RETURN a, r
        ORDER BY r.at ASC
      `, {
        narrativeId,
        startTime: timeRange[0],
        endTime: timeRange[1],
      });

      return result.records.map(record => ({
        actor: record.get('a').properties,
        amplification: record.get('r').properties,
      }));
    } finally {
      await session.close();
    }
  }
}
```

---

### 4. AI/ML Extraction Engine

**Location**: `server/src/ai/`, `apps/ml-engine/`

**Current Capabilities**:
- Text analysis (spaCy NLP)
- Sentiment analysis
- Entity recognition
- Embeddings (sentence transformers)
- Vector search
- Multimodal analysis

**Integration Points**:

| Sprint | Capability | How AI/ML is Used |
|--------|-----------|-------------------|
| 1 | Narrative Extraction | Use NLP to extract narrative elements |
| 3 | Mutation Analysis | Use embeddings to detect semantic similarity |
| 4 | Sentiment Analysis | Leverage sentiment models for impact assessment |
| 6 | Manipulation Detection | Use NLP to identify manipulation techniques |
| 17 | Claim Extraction | Use entity recognition for fact-checking |
| 27 | Campaign Detection | Use classification models for campaign identification |

**Extension Pattern**:
```typescript
// Leverage existing NLP pipeline
import { EmbeddingService } from '../ai/services/EmbeddingService';

export class NarrativeEmbeddingService {
  private embeddingService: EmbeddingService;

  async computeNarrativeEmbedding(narrative: string): Promise<number[]> {
    // Use existing embedding service
    return await this.embeddingService.embed(narrative);
  }

  async findSimilarNarratives(
    embedding: number[],
    threshold: number = 0.8
  ): Promise<Narrative[]> {
    // Use pgvector for similarity search
    const result = await this.db.query(`
      SELECT id, content,
             1 - (embedding <=> $1::vector) as similarity
      FROM narratives
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY similarity DESC
      LIMIT 10
    `, [embedding, threshold]);

    return result.rows;
  }
}
```

---

### 5. Real-time Narrative Simulation Engine

**Location**: `server/src/narrative/` (from README.md)

**Current Capabilities**:
- Tick-based narrative propagation
- Rule-based + LLM generation
- Event injection
- Parameter modeling
- Real-time tick loop

**Integration Points**:

| Sprint | Capability | How Simulation Engine is Used |
|--------|-----------|-------------------------------|
| 2 | Propagation Modeling | Use tick-based simulation for propagation |
| 3 | Mutation Prediction | Model narrative mutations over time |
| 4 | Impact Assessment | Simulate impact on communities |
| 28 | Narrative Conflict | Run competing narrative simulations |
| 29 | Resilience Testing | Test communication strategies in simulation |

**API Integration Pattern**:
```typescript
// Use existing simulation API
export class NarrativeSimulationService {
  private apiUrl = 'http://localhost:4000/api/narrative-sim';

  async createSimulation(scenario: SimulationScenario) {
    const response = await fetch(`${this.apiUrl}/simulations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });

    const { id } = await response.json();
    return id;
  }

  async injectNarrative(simId: string, narrative: Narrative) {
    // Inject narrative as event
    await fetch(`${this.apiUrl}/simulations/${simId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NARRATIVE_INJECTION',
        tick: 0,
        data: {
          narrative: narrative.content,
          source: narrative.source,
          initialReach: narrative.estimatedReach,
        },
      }),
    });
  }

  async runSimulation(simId: string, ticks: number) {
    const response = await fetch(
      `${this.apiUrl}/simulations/${simId}/tick`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: ticks }),
      }
    );

    return await response.json();
  }
}
```

---

### 6. GraphQL API

**Location**: `services/api/`, `packages/graphql/`

**Current Capabilities**:
- Apollo Server federation
- Schema stitching
- Authentication & authorization
- Query budgets
- Subscriptions

**Integration Points**:

All sprints will expose capabilities via GraphQL:
- Queries for data retrieval
- Mutations for operations
- Subscriptions for real-time updates

**Schema Extension Pattern**:
```graphql
# Extend existing schema with narrative types
extend type Query {
  # Sprint 1: Narrative identification
  narrative(id: ID!): Narrative
  narratives(filter: NarrativeFilter, limit: Int = 25): [Narrative!]!

  # Sprint 2: Propagation tracking
  narrativePropagation(
    narrativeId: ID!,
    timeRange: TimeRange
  ): PropagationMetrics!

  # Sprint 5: Attribution
  narrativeAttribution(narrativeId: ID!): Attribution!
}

extend type Mutation {
  # Sprint 1: Create narrative
  detectNarrative(input: NarrativeInput!): Narrative!

  # Sprint 18: Counter-narrative
  createCounterNarrative(
    threatId: ID!,
    input: CounterNarrativeInput!
  ): CounterNarrative!
}

extend type Subscription {
  # Sprint 2: Real-time propagation
  narrativePropagationUpdates(narrativeId: ID!): PropagationUpdate!

  # Sprint 27: Campaign detection
  disinformationCampaignDetected: Campaign!
}

# New types
type Narrative {
  id: ID!
  content: String!
  signature: String!
  detectedAt: DateTime!
  threatLevel: ThreatLevel!
  taxonomy: [String!]!
  sources: [Source!]!
  propagationMetrics: PropagationMetrics
  attributions: [Attribution!]!
  mutations: [Narrative!]!
}

type PropagationMetrics {
  velocity: Float!
  reach: Int!
  engagement: Int!
  amplificationNodes: [Actor!]!
  timeline: [PropagationEvent!]!
}

type Attribution {
  actor: Actor
  confidence: Float!
  evidence: [Evidence!]!
  method: AttributionMethod!
}

enum ThreatLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

input NarrativeFilter {
  threatLevel: ThreatLevel
  taxonomy: [String!]
  dateRange: TimeRange
  sources: [ID!]
}
```

---

### 7. Threat Hunting Service

**Location**: `server/src/services/threatHuntingService.ts`

**Current Capabilities**:
- Threat pattern detection
- Hunting workflows
- Investigation support

**Integration Points**:

| Sprint | Capability | How Threat Hunting is Used |
|--------|-----------|---------------------------|
| 5 | Attribution | Use hunting workflows for actor identification |
| 27 | Campaign Detection | Leverage threat patterns for campaign identification |
| 30 | Threat Intelligence | Integrate with hunting workflows |

---

### 8. Provenance Ledger

**Location**: `server/src/services/provenance-ledger.ts`

**Current Capabilities**:
- Chain of custody tracking
- Claim verification
- Audit trail
- Export manifests

**Integration Points**:

| Sprint | Capability | How Provenance is Used |
|--------|-----------|------------------------|
| 5 | Attribution | Track source chain of custody |
| 16 | Source Verification | Verify source claims |
| 17 | Fact-checking | Track verification chain |
| 30 | Intelligence Reporting | Audit trail for intelligence products |

**Extension Pattern**:
```typescript
// Use provenance ledger for narrative tracking
import { ProvenanceLedger } from '../services/provenance-ledger';

export class NarrativeProvenanceService {
  private ledger: ProvenanceLedger;

  async recordNarrativeDetection(narrative: Narrative, evidence: Evidence[]) {
    // Record in provenance ledger
    await this.ledger.recordClaim({
      type: 'NARRATIVE_DETECTION',
      subject: narrative.id,
      claims: {
        content: narrative.content,
        detectedAt: narrative.detectedAt,
        threatLevel: narrative.threatLevel,
      },
      evidence: evidence.map(e => ({
        type: e.type,
        source: e.source,
        hash: e.hash,
      })),
      timestamp: new Date(),
    });
  }

  async verifyNarrativeChain(narrativeId: string) {
    // Verify full chain of custody
    return await this.ledger.verifyChain(narrativeId);
  }
}
```

---

## Service Architecture

### New Service Structure

Following Summit's service pattern (`server/src/services/`), each capability area gets a dedicated service:

```
server/src/services/
├── DefensivePsyOpsService.ts (existing)
├── threatHuntingService.ts (existing)
│
├── influence-ops/                     # New services
│   ├── NarrativeAnalysisService.ts    # Sprints 1-5
│   ├── CognitiveDefenseService.ts     # Sprints 6-10
│   ├── BehavioralDetectionService.ts  # Sprints 11-15
│   ├── StrategicCommService.ts        # Sprints 16-20
│   ├── NetworkAnalysisService.ts      # Sprints 21-25
│   └── InfoWarfareIntelService.ts     # Sprints 26-30
```

### Service Template

```typescript
/**
 * [Service Name] Service
 *
 * Part of Influence Operations Defense capability
 * Sprints: [X-Y]
 *
 * DEFENSIVE ONLY: [Description of defensive purpose]
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { neo4jDriver } from '../../db/neo4j';

export interface ServiceConfig {
  // Configuration options
}

export class ServiceNameService extends EventEmitter {
  private prisma: PrismaClient;
  private logger = logger;
  private neo4j = neo4jDriver;

  constructor(config: ServiceConfig) {
    super();
    this.prisma = new PrismaClient();

    // Initialize service
    this.initialize();
  }

  private async initialize() {
    // Setup monitoring, caching, etc.
  }

  // Public API methods
  async detectCapability(input: Input): Promise<Output> {
    try {
      // Implementation
      this.emit('capabilityDetected', result);
      return result;
    } catch (error) {
      this.logger.error('Error in capability:', error);
      throw error;
    }
  }

  // Integration with existing services
  private async useExistingService() {
    // Call existing Summit services
  }

  // Neo4j integration
  private async queryGraph(params: Params): Promise<Results> {
    const session = this.neo4j.session();
    try {
      const result = await session.run(cypherQuery, params);
      return this.parseResults(result);
    } finally {
      await session.close();
    }
  }

  // Observability
  private recordMetrics(metricName: string, value: number) {
    // Record Prometheus metrics
  }
}
```

---

## Data Model Integration

### PostgreSQL Schema Extensions

Add new tables following Summit's conventions:

```sql
-- Narrative tracking table
CREATE TABLE IF NOT EXISTS narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  signature VARCHAR(64) UNIQUE NOT NULL,
  embedding VECTOR(384),  -- pgvector for similarity search
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  threat_level VARCHAR(20) NOT NULL CHECK (threat_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  taxonomy JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narratives_signature ON narratives(signature);
CREATE INDEX idx_narratives_threat_level ON narratives(threat_level);
CREATE INDEX idx_narratives_detected_at ON narratives(detected_at);
CREATE INDEX idx_narratives_embedding ON narratives USING ivfflat (embedding vector_cosine_ops);

-- Narrative sources
CREATE TABLE IF NOT EXISTS narrative_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id UUID NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narrative_sources_narrative_id ON narrative_sources(narrative_id);

-- Propagation events
CREATE TABLE IF NOT EXISTS propagation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id UUID NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  actor_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reach INT NOT NULL DEFAULT 0,
  engagement INT NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_propagation_events_narrative_id ON propagation_events(narrative_id);
CREATE INDEX idx_propagation_events_occurred_at ON propagation_events(occurred_at);

-- Convert to TimescaleDB hypertable for efficient time-series queries
SELECT create_hypertable('propagation_events', 'occurred_at', if_not_exists => TRUE);

-- Bot detection results
CREATE TABLE IF NOT EXISTS bot_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(255) NOT NULL,
  detection_method VARCHAR(100) NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  features JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFIRMED', 'FALSE_POSITIVE'))
);

CREATE INDEX idx_bot_detections_actor_id ON bot_detections(actor_id);
CREATE INDEX idx_bot_detections_confidence ON bot_detections(confidence);
```

### Prisma Schema Extensions

Add to `prisma/schema.prisma`:

```prisma
model Narrative {
  id          String   @id @default(uuid())
  content     String
  signature   String   @unique
  embedding   Unsupported("vector(384)")?
  detectedAt  DateTime @default(now()) @map("detected_at")
  validFrom   DateTime @default(now()) @map("valid_from")
  validTo     DateTime? @map("valid_to")
  threatLevel ThreatLevel @map("threat_level")
  taxonomy    Json     @default("[]")
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  sources           NarrativeSource[]
  propagationEvents PropagationEvent[]

  @@index([signature])
  @@index([threatLevel])
  @@index([detectedAt])
  @@map("narratives")
}

model NarrativeSource {
  id          String   @id @default(uuid())
  narrativeId String   @map("narrative_id")
  sourceType  String   @map("source_type")
  sourceId    String   @map("source_id")
  url         String?
  metadata    Json     @default("{}")
  detectedAt  DateTime @default(now()) @map("detected_at")

  narrative   Narrative @relation(fields: [narrativeId], references: [id], onDelete: Cascade)

  @@index([narrativeId])
  @@map("narrative_sources")
}

model PropagationEvent {
  id          String   @id @default(uuid())
  narrativeId String   @map("narrative_id")
  actorId     String   @map("actor_id")
  eventType   String   @map("event_type")
  reach       Int      @default(0)
  engagement  Int      @default(0)
  occurredAt  DateTime @map("occurred_at")
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")

  narrative   Narrative @relation(fields: [narrativeId], references: [id], onDelete: Cascade)

  @@index([narrativeId])
  @@index([occurredAt])
  @@map("propagation_events")
}

model BotDetection {
  id              String   @id @default(uuid())
  actorId         String   @map("actor_id")
  detectionMethod String   @map("detection_method")
  confidence      Float
  features        Json     @default("{}")
  detectedAt      DateTime @default(now()) @map("detected_at")
  status          BotDetectionStatus @default(ACTIVE)

  @@index([actorId])
  @@index([confidence])
  @@map("bot_detections")
}

enum ThreatLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum BotDetectionStatus {
  ACTIVE
  CONFIRMED
  FALSE_POSITIVE
}
```

---

## API Integration Patterns

### REST API Endpoints

Following Summit's pattern (`/api/*`), add endpoints for influence operations:

```typescript
// server/src/routes/influence-ops.ts

import { Router } from 'express';
import { NarrativeAnalysisService } from '../services/influence-ops/NarrativeAnalysisService';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();
const narrativeService = new NarrativeAnalysisService();

// Sprint 1: Narrative detection
router.post(
  '/narratives/detect',
  authMiddleware,
  rateLimitMiddleware,
  async (req, res) => {
    try {
      const { content, metadata } = req.body;
      const narrative = await narrativeService.detectNarrative(content, metadata);
      res.json(narrative);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Sprint 2: Propagation tracking
router.get(
  '/narratives/:id/propagation',
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { startTime, endTime } = req.query;

      const metrics = await narrativeService.trackPropagation(
        id,
        [new Date(startTime), new Date(endTime)]
      );

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

### GraphQL Resolvers

```typescript
// services/api/src/resolvers/narrative.ts

import { NarrativeAnalysisService } from '../services/influence-ops/NarrativeAnalysisService';

const narrativeService = new NarrativeAnalysisService();

export const narrativeResolvers = {
  Query: {
    narrative: async (_parent, { id }, context) => {
      await context.authorize('narrative:read');
      return await narrativeService.getNarrative(id);
    },

    narratives: async (_parent, { filter, limit }, context) => {
      await context.authorize('narrative:read');
      return await narrativeService.findNarratives(filter, limit);
    },

    narrativePropagation: async (_parent, { narrativeId, timeRange }, context) => {
      await context.authorize('narrative:read');
      return await narrativeService.trackPropagation(narrativeId, timeRange);
    },
  },

  Mutation: {
    detectNarrative: async (_parent, { input }, context) => {
      await context.authorize('narrative:create');

      const narrative = await narrativeService.detectNarrative(
        input.content,
        input.metadata
      );

      // Record in audit log
      await context.audit('NARRATIVE_DETECTED', { narrativeId: narrative.id });

      return narrative;
    },
  },

  Subscription: {
    narrativePropagationUpdates: {
      subscribe: async (_parent, { narrativeId }, context) => {
        await context.authorize('narrative:read');

        // Return async iterator for real-time updates
        return narrativeService.subscribeToPropagation(narrativeId);
      },
    },
  },

  // Field resolvers
  Narrative: {
    sources: async (narrative, _args, context) => {
      return await narrativeService.getNarrativeSources(narrative.id);
    },

    propagationMetrics: async (narrative, _args, context) => {
      return await narrativeService.getPropagationMetrics(narrative.id);
    },

    attributions: async (narrative, _args, context) => {
      await context.authorize('attribution:read');
      return await narrativeService.getAttributions(narrative.id);
    },
  },
};
```

---

## Neo4j Graph Patterns

### Common Query Patterns

```typescript
// Narrative propagation chain
async function getPropagationChain(narrativeId: string) {
  const session = neo4jDriver.session();

  const result = await session.run(`
    MATCH path = (n:Narrative {id: $narrativeId})<-[r:AMPLIFIED*1..5]-(a:Actor)
    RETURN path,
           length(path) as depth,
           [rel in relationships(path) | rel.at] as timestamps,
           [node in nodes(path) | node.id] as nodeIds
    ORDER BY depth ASC
  `, { narrativeId });

  await session.close();
  return result.records;
}

// Find coordinated behavior (Sprint 12)
async function findCoordinatedBehavior(threshold: number = 0.8) {
  const session = neo4jDriver.session();

  const result = await session.run(`
    // Find actors who amplified the same narratives at similar times
    MATCH (a1:Actor)-[r1:AMPLIFIED]->(n:Narrative)<-[r2:AMPLIFIED]-(a2:Actor)
    WHERE a1.id < a2.id  // Avoid duplicates
      AND abs(duration.between(r1.at, r2.at).seconds) < 300  // Within 5 minutes
    WITH a1, a2, count(n) as sharedNarratives
    WHERE sharedNarratives >= 5

    // Calculate coordination score
    MATCH (a1)-[r1:AMPLIFIED]->(n1:Narrative)
    MATCH (a2)-[r2:AMPLIFIED]->(n2:Narrative)
    WITH a1, a2, sharedNarratives,
         collect(DISTINCT n1.id) as n1Narratives,
         collect(DISTINCT n2.id) as n2Narratives

    WITH a1, a2, sharedNarratives,
         size([n IN n1Narratives WHERE n IN n2Narratives]) as overlap,
         size(n1Narratives + n2Narratives) as total

    WITH a1, a2, sharedNarratives,
         toFloat(overlap) / total as jaccardSimilarity
    WHERE jaccardSimilarity >= $threshold

    RETURN a1.id as actor1, a2.id as actor2,
           sharedNarratives, jaccardSimilarity
    ORDER BY jaccardSimilarity DESC
  `, { threshold });

  await session.close();
  return result.records;
}

// Influence network centrality (Sprint 22)
async function calculateInfluenceCentrality() {
  const session = neo4jDriver.session();

  // Use Neo4j Graph Data Science library
  const result = await session.run(`
    // Create projection
    CALL gds.graph.project(
      'influence-network',
      'Actor',
      {
        AMPLIFIED: {
          type: 'AMPLIFIED',
          properties: ['reach', 'engagement']
        }
      }
    )

    // Calculate PageRank
    CALL gds.pageRank.stream('influence-network', {
      relationshipWeightProperty: 'reach'
    })
    YIELD nodeId, score

    RETURN gds.util.asNode(nodeId).id as actorId, score
    ORDER BY score DESC
    LIMIT 100
  `);

  await session.close();
  return result.records;
}
```

---

## AI/ML Pipeline Integration

### Leveraging Existing Models

```typescript
// Use existing NLP services
import { SemanticSearchService } from '../services/SemanticSearchService';
import { EmbeddingService } from '../ai/services/EmbeddingService';

export class NarrativeMLService {
  private semanticSearch: SemanticSearchService;
  private embeddings: EmbeddingService;

  // Sprint 1: Extract narrative elements
  async extractNarrativeElements(content: string) {
    // Use existing NLP pipeline
    const entities = await this.extractEntities(content);
    const sentiment = await this.analyzeSentiment(content);
    const topics = await this.extractTopics(content);

    return {
      entities,
      sentiment,
      topics,
      mainClaims: this.identifyClaims(content, entities),
    };
  }

  // Sprint 3: Detect narrative mutations
  async detectMutations(original: string, variant: string) {
    const originalEmbedding = await this.embeddings.embed(original);
    const variantEmbedding = await this.embeddings.embed(variant);

    const similarity = this.cosineSimilarity(
      originalEmbedding,
      variantEmbedding
    );

    // If similar but not identical, it's likely a mutation
    if (similarity > 0.7 && similarity < 0.95) {
      return {
        isMutation: true,
        similarity,
        changes: await this.identifyChanges(original, variant),
      };
    }

    return { isMutation: false, similarity };
  }

  // Sprint 11: Bot detection using ML
  async detectBot(actorFeatures: ActorFeatures) {
    // Call Python ML service or use existing model
    const features = this.extractBotFeatures(actorFeatures);

    // Use existing ML inference
    const prediction = await this.mlService.predict('bot-detector', features);

    return {
      isBot: prediction.label === 'BOT',
      confidence: prediction.confidence,
      features: prediction.importantFeatures,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}
```

---

## Real-time Streaming Integration

### Kafka Integration

```typescript
// Use existing Kafka infrastructure
import { kafka } from '../streaming/kafka';

export class NarrativeStreamProcessor {
  private consumer = kafka.consumer({ groupId: 'narrative-processor' });
  private producer = kafka.producer();

  async start() {
    await this.consumer.connect();
    await this.producer.connect();

    // Subscribe to relevant topics
    await this.consumer.subscribe({
      topics: ['social-media-stream', 'news-feed', 'user-reports'],
      fromBeginning: false,
    });

    // Process messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const content = message.value.toString();

        // Detect narratives in real-time
        const narrative = await this.detectNarrative(content);

        if (narrative) {
          // Publish to narrative topic
          await this.producer.send({
            topic: 'narrative-detected',
            messages: [{
              key: narrative.id,
              value: JSON.stringify(narrative),
            }],
          });

          // Trigger alerts if high threat level
          if (narrative.threatLevel === 'HIGH' || narrative.threatLevel === 'CRITICAL') {
            await this.producer.send({
              topic: 'high-threat-alerts',
              messages: [{
                key: narrative.id,
                value: JSON.stringify({
                  type: 'NARRATIVE_THREAT',
                  severity: narrative.threatLevel,
                  narrative,
                }),
              }],
            });
          }
        }
      },
    });
  }
}
```

---

## Observability Integration

### Prometheus Metrics

```typescript
// Use existing Prometheus integration
import { Counter, Histogram, Gauge } from 'prom-client';

export class NarrativeMetrics {
  // Counters
  private narrativesDetected = new Counter({
    name: 'narratives_detected_total',
    help: 'Total number of narratives detected',
    labelNames: ['threat_level', 'taxonomy'],
  });

  private botsDetected = new Counter({
    name: 'bots_detected_total',
    help: 'Total number of bots detected',
    labelNames: ['confidence_level'],
  });

  // Histograms
  private propagationVelocity = new Histogram({
    name: 'narrative_propagation_velocity',
    help: 'Narrative propagation velocity distribution',
    buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  });

  private detectionLatency = new Histogram({
    name: 'narrative_detection_latency_seconds',
    help: 'Time to detect narrative',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  // Gauges
  private activeThreats = new Gauge({
    name: 'active_narrative_threats',
    help: 'Current number of active narrative threats',
    labelNames: ['threat_level'],
  });

  // Record metrics
  recordNarrativeDetection(narrative: Narrative) {
    this.narrativesDetected.inc({
      threat_level: narrative.threatLevel,
      taxonomy: narrative.taxonomy.join(','),
    });

    this.activeThreats.inc({ threat_level: narrative.threatLevel });
  }

  recordPropagation(velocity: number) {
    this.propagationVelocity.observe(velocity);
  }
}
```

### Grafana Dashboard Integration

Add dashboards following Summit's pattern in `observability/grafana/provisioning/dashboards/`:

```json
{
  "dashboard": {
    "title": "Influence Operations Defense",
    "panels": [
      {
        "title": "Narratives Detected",
        "targets": [{
          "expr": "sum by(threat_level) (rate(narratives_detected_total[5m]))"
        }],
        "type": "graph"
      },
      {
        "title": "Active Threats by Level",
        "targets": [{
          "expr": "active_narrative_threats"
        }],
        "type": "stat"
      },
      {
        "title": "Propagation Velocity (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, narrative_propagation_velocity)"
        }],
        "type": "gauge"
      },
      {
        "title": "Bot Detection Rate",
        "targets": [{
          "expr": "rate(bots_detected_total[5m])"
        }],
        "type": "graph"
      }
    ]
  }
}
```

---

## Testing Integration

### Follow Summit Testing Patterns

```typescript
// __tests__/NarrativeAnalysisService.test.ts

import { NarrativeAnalysisService } from '../services/influence-ops/NarrativeAnalysisService';
import { neo4jDriver } from '../db/neo4j';

describe('NarrativeAnalysisService', () => {
  let service: NarrativeAnalysisService;
  let session;

  beforeEach(() => {
    service = new NarrativeAnalysisService();
    session = neo4jDriver.session();
  });

  afterEach(async () => {
    // Cleanup test data
    await session.run('MATCH (n:Narrative {test: true}) DETACH DELETE n');
    await session.close();
  });

  describe('detectNarrative', () => {
    it('should detect high-threat narratives', async () => {
      const content = 'Divisive narrative content for testing';
      const metadata = { source: 'test', test: true };

      const narrative = await service.detectNarrative(content, metadata);

      expect(narrative).toHaveProperty('id');
      expect(narrative.threatLevel).toBe('HIGH');
      expect(narrative.taxonomy).toContain('divisive');
    });

    it('should store narrative in Neo4j', async () => {
      const content = 'Test narrative';
      const metadata = { source: 'test', test: true };

      const narrative = await service.detectNarrative(content, metadata);

      // Verify in Neo4j
      const result = await session.run(
        'MATCH (n:Narrative {id: $id}) RETURN n',
        { id: narrative.id }
      );

      expect(result.records).toHaveLength(1);
    });
  });
});
```

---

## Migration Strategy

### Phased Integration

1. **Phase 1: Core Services** (Month 1)
   - Set up new service structure
   - Integrate with existing Neo4j
   - Basic GraphQL schema extensions

2. **Phase 2: Data Models** (Month 2)
   - PostgreSQL schema migrations
   - Prisma model updates
   - Neo4j node/relationship patterns

3. **Phase 3: ML Integration** (Month 3)
   - Connect to existing NLP pipelines
   - Add custom ML models
   - Embedding generation

4. **Phase 4: Real-time Streaming** (Month 4)
   - Kafka topic setup
   - Stream processors
   - Real-time detection

5. **Phase 5: Observability** (Month 5)
   - Prometheus metrics
   - Grafana dashboards
   - Alerting rules

### Backward Compatibility

- All new APIs are additive (no breaking changes)
- Existing services remain unchanged
- New services can be deployed independently
- Feature flags for gradual rollout

---

## Security & Authorization

### OPA Policy Integration

```rego
# policies/influence-ops.rego

package influence_ops

import future.keywords.if
import future.keywords.in

# Allow narrative read access for analysts
allow if {
  input.action == "narrative:read"
  has_role("analyst")
}

# Allow narrative detection for automated systems
allow if {
  input.action == "narrative:create"
  has_role("system")
  has_permission("detection:automated")
}

# Restrict attribution access to senior analysts
allow if {
  input.action == "attribution:read"
  has_role("senior_analyst")
}

# Helper functions
has_role(role) if {
  role in input.user.roles
}

has_permission(perm) if {
  perm in input.user.permissions
}
```

### Audit Logging

```typescript
// Record all influence ops actions in audit log
async function auditInfluenceOpsAction(
  action: string,
  userId: string,
  resource: any,
  result: 'SUCCESS' | 'FAILURE'
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: `INFLUENCE_OPS:${action}`,
      resourceType: resource.type,
      resourceId: resource.id,
      result,
      metadata: {
        ...resource.metadata,
        timestamp: new Date().toISOString(),
      },
    },
  });
}
```

---

## Performance Considerations

### Caching Strategy

```typescript
// Use Redis for hot data
import { redis } from '../cache/redis';

export class NarrativeCacheService {
  private ttl = 3600; // 1 hour

  async getCachedNarrative(id: string): Promise<Narrative | null> {
    const cached = await redis.get(`narrative:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheNarrative(narrative: Narrative) {
    await redis.setex(
      `narrative:${narrative.id}`,
      this.ttl,
      JSON.stringify(narrative)
    );
  }

  async invalidateNarrative(id: string) {
    await redis.del(`narrative:${id}`);
  }
}
```

### Query Optimization

- Use Neo4j indexes for common queries
- Implement pagination for large result sets
- Use query budgets to prevent expensive traversals
- Cache frequently accessed data in Redis

---

## Documentation Requirements

For each new service, provide:

1. **API Documentation**: OpenAPI/GraphQL schema
2. **Integration Guide**: How to use the service
3. **Architecture Diagrams**: Service interactions
4. **Runbooks**: Operational procedures
5. **Test Plans**: Testing strategies
6. **Metrics**: Key performance indicators

---

## Next Steps

1. Review this integration guide with the team
2. Set up development environment for Phase 1
3. Create feature branches for initial services
4. Implement Sprint 1 (Narrative Identification) as proof of concept
5. Validate integration patterns with existing infrastructure
6. Document learnings and adjust approach as needed

---

**Document Control**

- **Version**: 1.0.0
- **Created**: 2025-11-27
- **Last Updated**: 2025-11-27
- **Owner**: Summit/IntelGraph Engineering Team
- **Related Documents**:
  - [INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md](./INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md)
  - [ARCHITECTURE.md](./ARCHITECTURE.md)
  - [CLAUDE.md](../CLAUDE.md)
