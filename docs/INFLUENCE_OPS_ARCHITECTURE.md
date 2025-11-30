# Influence Operations Defense - Technical Architecture

> **Purpose**: Technical architecture design for defensive information warfare capabilities
>
> **Status**: Design Document
>
> **Related Documents**:
> - [INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md](./INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md)
> - [INFLUENCE_OPS_INTEGRATION_GUIDE.md](./INFLUENCE_OPS_INTEGRATION_GUIDE.md)
> - [ARCHITECTURE.md](./ARCHITECTURE.md)

## Executive Summary

This document outlines the technical architecture for implementing defensive information warfare capabilities on the Summit/IntelGraph platform. The design leverages existing infrastructure while adding specialized services for narrative analysis, behavioral detection, and strategic communication resilience.

### Design Goals

1. **Scalability**: Handle millions of content items and network nodes
2. **Real-time**: Detect threats within minutes of emergence
3. **Accuracy**: Achieve >90% detection accuracy with <5% false positives
4. **Extensibility**: Modular architecture for easy capability additions
5. **Integration**: Seamless integration with existing Summit services

---

## System Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Applications                          │
│                     (Web, Mobile, API Consumers)                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   GraphQL   │  │    REST     │  │  WebSocket  │                 │
│  │   (Apollo)  │  │  (Express)  │  │ (Socket.io) │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         Authentication (OIDC/JWT) + Authorization (OPA)              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Service Orchestration Layer                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Influence Operations Services                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │Narrative │ │Cognitive │ │Behavioral│ │ Strategic│       │   │
│  │  │ Analysis │ │ Defense  │ │Detection │ │   Comm   │       │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │   │
│  │       │            │            │            │               │   │
│  │  ┌────┴─────┐ ┌───┴──────┐ ┌───┴──────┐ ┌──┴───────┐       │   │
│  │  │ Network  │ │Info War  │ │Integration│ │Simulation│       │   │
│  │  │ Analysis │ │  Intel   │ │Coordinator│ │  Engine  │       │   │
│  │  └──────────┘ └──────────┘ └───────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                Existing Summit Services                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │DefPsyOps │ │  Threat  │ │Provenance│ │ Entity   │       │   │
│  │  │ Service  │ │ Hunting  │ │  Ledger  │ │Resolution│       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Data Processing Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Streaming  │  │   ML/AI      │  │   Analytics  │              │
│  │  Processing  │  │  Pipeline    │  │   Engine     │              │
│  │   (Kafka)    │  │  (PyTorch)   │  │  (Spark/SQL) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Data Storage Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Neo4j   │  │PostgreSQL│  │TimescaleDB│ │  Redis   │            │
│  │  Graph   │  │    +     │  │Time-Series│ │  Cache   │            │
│  │          │  │ pgvector │  │           │  │          │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐                                         │
│  │  Object  │  │ Elastic  │                                         │
│  │ Storage  │  │  Search  │                                         │
│  └──────────┘  └──────────┘                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Narrative Analysis Service

**Responsibilities**:
- Narrative detection and extraction
- Taxonomy classification
- Propagation tracking
- Mutation analysis
- Attribution

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│           Narrative Analysis Service                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │              API Layer                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │    │
│  │  │GraphQL   │  │  REST    │  │WebSocket │     │    │
│  │  │Resolvers │  │Endpoints │  │  Events  │     │    │
│  │  └──────────┘  └──────────┘  └──────────┘     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Business Logic Layer                  │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Detection   │  │  Taxonomy    │           │    │
│  │  │   Engine     │  │ Classifier   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ Propagation  │  │  Mutation    │           │    │
│  │  │   Tracker    │  │   Detector   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐                              │    │
│  │  │ Attribution  │                              │    │
│  │  │   Engine     │                              │    │
│  │  └──────────────┘                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Integration Layer                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │    │
│  │  │  Neo4j   │  │PostgreSQL│  │   NLP    │     │    │
│  │  │  Client  │  │  Client  │  │  Service │     │    │
│  │  └──────────┘  └──────────┘  └──────────┘     │    │
│  │  ┌──────────┐  ┌──────────┐                   │    │
│  │  │DefPsyOps │  │  Cache   │                   │    │
│  │  │ Service  │  │  Client  │                   │    │
│  │  └──────────┘  └──────────┘                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key Interfaces**:

```typescript
interface NarrativeAnalysisService {
  // Detection
  detectNarrative(content: string, metadata: Metadata): Promise<Narrative>;
  classifyNarrative(narrative: Narrative): Promise<Classification>;

  // Tracking
  trackPropagation(narrativeId: string, timeRange: TimeRange): Promise<PropagationMetrics>;
  detectMutation(narrativeId: string, variant: string): Promise<MutationAnalysis>;

  // Attribution
  attributeNarrative(narrativeId: string): Promise<Attribution[]>;
  findActorNetwork(narrativeId: string): Promise<ActorNetwork>;
}
```

---

### 2. Cognitive Defense Service

**Responsibilities**:
- Manipulation technique detection
- Bias exploitation identification
- User protection recommendations
- Intervention deployment
- Effectiveness measurement

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│            Cognitive Defense Service                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Detection & Analysis Layer              │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Manipulation  │  │     Bias     │           │    │
│  │  │  Detector    │  │   Detector   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Vulnerability │  │  Resilience  │           │    │
│  │  │  Assessor    │  │   Scorer     │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │        Protection & Intervention Layer          │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Intervention  │  │Recommendation│           │    │
│  │  │   Engine     │  │   Generator  │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Training    │  │ Effectiveness│           │    │
│  │  │   Manager    │  │   Tracker    │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │          User Protection Interface              │    │
│  │  - Real-time warnings                           │    │
│  │  - Fact-check injection                         │    │
│  │  - Alternative perspectives                     │    │
│  │  - Resilience training                          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key Interfaces**:

```typescript
interface CognitiveDefenseService {
  // Detection
  detectManipulation(content: string): Promise<ManipulationAnalysis>;
  detectBiasExploitation(content: string, userContext: UserContext): Promise<BiasAnalysis>;

  // Protection
  assessVulnerability(userId: string, interaction: Interaction): Promise<VulnerabilityScore>;
  generateProtection(userId: string, threat: Threat): Promise<ProtectiveMeasures>;

  // Intervention
  deployIntervention(userId: string, intervention: Intervention): Promise<void>;
  trackEffectiveness(interventionId: string): Promise<EffectivenessMetrics>;
}
```

---

### 3. Behavioral Detection Service

**Responsibilities**:
- Bot detection
- Coordinated inauthentic behavior (CIB) detection
- Astroturfing identification
- Amplification network mapping
- Anomaly baseline establishment

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│          Behavioral Detection Service                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           ML-Based Detection Layer              │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │     Bot      │  │     CIB      │           │    │
│  │  │  Classifier  │  │   Detector   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Astroturfing  │  │   Anomaly    │           │    │
│  │  │  Detector    │  │   Detector   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │          Graph Analysis Layer                   │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Coordination  │  │Amplification │           │    │
│  │  │   Analyzer   │  │Network Mapper│           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │  Community   │  │  Centrality  │           │    │
│  │  │  Detector    │  │  Calculator  │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │        Feature Engineering Layer                │    │
│  │  - Behavioral fingerprints                      │    │
│  │  - Temporal patterns                            │    │
│  │  - Network metrics                              │    │
│  │  - Content analysis                             │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key Interfaces**:

```typescript
interface BehavioralDetectionService {
  // Detection
  detectBot(actorId: string): Promise<BotDetection>;
  detectCIB(actorIds: string[]): Promise<CIBAnalysis>;
  detectAstroturfing(campaignId: string): Promise<AstroturfingAnalysis>;

  // Network Analysis
  mapAmplificationNetwork(narrativeId: string): Promise<AmplificationNetwork>;
  findCoordinatedActors(threshold: number): Promise<CoordinatedGroup[]>;

  // Baselines
  establishBaseline(context: string): Promise<Baseline>;
  detectAnomaly(behavior: Behavior, baseline: Baseline): Promise<Anomaly | null>;
}
```

---

### 4. Strategic Communication Service

**Responsibilities**:
- Source verification
- Fact-checking integration
- Counter-narrative development
- Rapid response coordination
- Resilience measurement

**Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│       Strategic Communication Service                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Verification & Trust Layer              │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │   Source     │  │  Fact-Check  │           │    │
│  │  │  Verifier    │  │  Integrator  │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │ Credibility  │  │    Claim     │           │    │
│  │  │   Scorer     │  │  Extractor   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │        Response Development Layer               │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │Counter-      │  │   Message    │           │    │
│  │  │Narrative Gen │  │  Optimizer   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │   Audience   │  │ Effectiveness│           │    │
│  │  │   Targeting  │  │  Predictor   │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │       Coordination & Delivery Layer             │    │
│  │  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │    Rapid     │  │   Resource   │           │    │
│  │  │   Response   │  │ Coordinator  │           │    │
│  │  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key Interfaces**:

```typescript
interface StrategicCommunicationService {
  // Verification
  verifySource(sourceId: string): Promise<SourceVerification>;
  checkFacts(claims: Claim[]): Promise<FactCheckResult[]>;

  // Response Development
  developCounterNarrative(threatId: string): Promise<CounterNarrative>;
  optimizeMessage(message: Message, audience: Audience): Promise<OptimizedMessage>;

  // Coordination
  initiateRapidResponse(threat: Threat): Promise<ResponsePlan>;
  coordinateDeployment(plan: ResponsePlan): Promise<DeploymentStatus>;
}
```

---

## Data Architecture

### Neo4j Graph Schema

```
// Core node types
(:Narrative {
  id: string,
  content: string,
  signature: string,
  detectedAt: datetime,
  validFrom: datetime,
  validTo: datetime,
  threatLevel: enum,
  taxonomy: list<string>
})

(:Actor {
  id: string,
  type: string,  // person, bot, organization
  platform: string,
  handle: string,
  verificationStatus: enum,
  botScore: float,
  influenceScore: float
})

(:Source {
  id: string,
  type: string,  // media, social, government
  name: string,
  credibilityScore: float,
  biasProfile: json
})

(:Campaign {
  id: string,
  type: string,  // disinformation, astroturfing
  detectedAt: datetime,
  status: enum,
  threatLevel: enum
})

// Relationships
(:Actor)-[:ORIGINATED {at: datetime}]->(:Narrative)
(:Actor)-[:AMPLIFIED {at: datetime, reach: int, engagement: int}]->(:Narrative)
(:Narrative)-[:MUTATED_TO {similarity: float, changes: list}]->(:Narrative)
(:Source)-[:PUBLISHED {at: datetime}]->(:Narrative)
(:Actor)-[:COORDINATES_WITH {confidence: float, evidence: list}]->(:Actor)
(:Campaign)-[:INCLUDES]->(:Narrative)
(:Campaign)-[:INVOLVES]->(:Actor)

// Indexes
CREATE INDEX narrative_signature FOR (n:Narrative) ON (n.signature)
CREATE INDEX narrative_detected FOR (n:Narrative) ON (n.detectedAt)
CREATE INDEX actor_id FOR (a:Actor) ON (a.id)
CREATE INDEX source_id FOR (s:Source) ON (s.id)
```

### PostgreSQL Schema

```sql
-- Narratives (with embeddings for similarity search)
CREATE TABLE narratives (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  signature VARCHAR(64) UNIQUE NOT NULL,
  embedding vector(384),  -- for semantic search
  detected_at TIMESTAMPTZ NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  threat_level VARCHAR(20) NOT NULL,
  taxonomy JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bot detections
CREATE TABLE bot_detections (
  id UUID PRIMARY KEY,
  actor_id VARCHAR(255) NOT NULL,
  detection_method VARCHAR(100) NOT NULL,
  confidence FLOAT NOT NULL,
  features JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

-- Cognitive interventions
CREATE TABLE cognitive_interventions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  threat_type VARCHAR(100) NOT NULL,
  intervention_type VARCHAR(100) NOT NULL,
  content JSONB NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  user_action VARCHAR(50),  -- dismissed, acknowledged, etc.
  effectiveness_score FLOAT
);

-- Counter-narratives
CREATE TABLE counter_narratives (
  id UUID PRIMARY KEY,
  threat_id UUID REFERENCES narratives(id),
  content TEXT NOT NULL,
  target_audience JSONB NOT NULL,
  channels JSONB NOT NULL,
  deployed_at TIMESTAMPTZ NOT NULL,
  reach INT DEFAULT 0,
  engagement_metrics JSONB,
  effectiveness_score FLOAT
);

-- Fact-check results
CREATE TABLE fact_checks (
  id UUID PRIMARY KEY,
  claim TEXT NOT NULL,
  claim_hash VARCHAR(64) UNIQUE NOT NULL,
  verdict VARCHAR(50) NOT NULL,  -- true, false, mixed, etc.
  confidence FLOAT NOT NULL,
  sources JSONB NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ
);
```

### TimescaleDB Hypertables

```sql
-- Propagation events (time-series)
CREATE TABLE propagation_events (
  time TIMESTAMPTZ NOT NULL,
  narrative_id UUID NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reach INT NOT NULL DEFAULT 0,
  engagement INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL
);

SELECT create_hypertable('propagation_events', 'time');

-- Behavioral metrics (time-series)
CREATE TABLE behavioral_metrics (
  time TIMESTAMPTZ NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  value FLOAT NOT NULL,
  metadata JSONB NOT NULL
);

SELECT create_hypertable('behavioral_metrics', 'time');

-- Detection alerts (time-series)
CREATE TABLE detection_alerts (
  time TIMESTAMPTZ NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  details JSONB NOT NULL,
  status VARCHAR(20) NOT NULL
);

SELECT create_hypertable('detection_alerts', 'time');
```

---

## ML/AI Pipeline Architecture

### Training Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   ML Training Pipeline                   │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Data Collection & Labeling              │    │
│  │  - Historical narratives                        │    │
│  │  - Known bot accounts                           │    │
│  │  - Verified fact-checks                         │    │
│  │  - Expert-labeled examples                      │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Feature Engineering                     │    │
│  │  - Text embeddings (BERT, RoBERTa)             │    │
│  │  - Behavioral features                          │    │
│  │  - Network metrics                              │    │
│  │  - Temporal patterns                            │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Model Training                          │    │
│  │  - Bot detection (Random Forest, XGBoost)      │    │
│  │  - Narrative classification (BERT fine-tuned)  │    │
│  │  - Manipulation detection (Transformers)       │    │
│  │  - Network anomaly detection (Graph Neural Nets)│   │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Model Evaluation & Validation           │    │
│  │  - Accuracy, Precision, Recall, F1             │    │
│  │  - False positive rate analysis                 │    │
│  │  - Cross-validation                             │    │
│  │  - A/B testing in production                    │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Model Deployment                        │    │
│  │  - Model registry (MLflow)                      │    │
│  │  - Versioning and rollback                      │    │
│  │  - A/B testing infrastructure                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Inference Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                  ML Inference Pipeline                   │
│                                                          │
│  Input (content, metadata)                               │
│         │                                                │
│         ▼                                                │
│  ┌────────────────────────────────────────────────┐    │
│  │         Preprocessing                           │    │
│  │  - Text normalization                           │    │
│  │  - Feature extraction                           │    │
│  │  - Embedding generation                         │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Model Inference (Parallel)              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │    │
│  │  │   Bot    │  │Narrative │  │Manipulate│     │    │
│  │  │Detector  │  │Classifier│  │ Detector │     │    │
│  │  └──────────┘  └──────────┘  └──────────┘     │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │         Result Aggregation                      │    │
│  │  - Combine predictions                          │    │
│  │  - Calculate confidence scores                  │    │
│  │  - Apply business rules                         │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│                    ▼                                     │
│  Output (predictions, confidences, features)             │
└─────────────────────────────────────────────────────────┘
```

### Model Catalog

| Model | Purpose | Type | Accuracy Target |
|-------|---------|------|----------------|
| Bot Detector | Identify automated accounts | Random Forest / XGBoost | >90% |
| Narrative Classifier | Categorize narratives by type | Fine-tuned BERT | >85% |
| Manipulation Detector | Identify manipulation techniques | Transformer (RoBERTa) | >88% |
| CIB Detector | Find coordinated behavior | Graph Neural Network | >85% |
| Mutation Detector | Identify narrative variants | Siamese Network (BERT) | >90% similarity |
| Sentiment Analyzer | Measure sentiment shifts | Fine-tuned DistilBERT | >87% |

---

## Stream Processing Architecture

### Kafka Topics

```
┌─────────────────────────────────────────────────────────┐
│                    Kafka Topic Structure                 │
│                                                          │
│  Input Topics:                                           │
│  ├─ social-media-stream      (raw social media posts)   │
│  ├─ news-feed               (news articles, RSS)         │
│  ├─ user-reports            (user-submitted reports)     │
│  └─ external-feeds          (OSINT, threat intel)        │
│                                                          │
│  Processing Topics:                                      │
│  ├─ content-enriched        (NLP-processed content)      │
│  ├─ features-extracted      (ML features)                │
│  └─ detections-pending      (items awaiting detection)   │
│                                                          │
│  Output Topics:                                          │
│  ├─ narrative-detected      (detected narratives)        │
│  ├─ bot-detected           (bot identifications)         │
│  ├─ cib-detected           (coordinated behavior)        │
│  ├─ high-threat-alerts     (critical threats)            │
│  └─ interventions          (protective actions)          │
│                                                          │
│  Audit Topics:                                           │
│  ├─ detection-audit        (all detection events)        │
│  └─ action-audit           (all actions taken)           │
└─────────────────────────────────────────────────────────┘
```

### Stream Processor Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Stream Processors                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Content Enrichment Processor            │    │
│  │  Input:  social-media-stream, news-feed         │    │
│  │  Process: NLP, entity extraction, embeddings    │    │
│  │  Output: content-enriched                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Narrative Detection Processor           │    │
│  │  Input:  content-enriched                       │    │
│  │  Process: Narrative detection, classification   │    │
│  │  Output: narrative-detected                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Behavioral Analysis Processor           │    │
│  │  Input:  content-enriched                       │    │
│  │  Process: Bot detection, CIB analysis           │    │
│  │  Output: bot-detected, cib-detected             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Threat Triage Processor                 │    │
│  │  Input:  narrative-detected, bot-detected       │    │
│  │  Process: Threat scoring, alert generation      │    │
│  │  Output: high-threat-alerts                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Intervention Processor                  │    │
│  │  Input:  high-threat-alerts                     │    │
│  │  Process: Generate and deploy interventions     │    │
│  │  Output: interventions                          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## API Architecture

### GraphQL Schema (Complete)

```graphql
# === Types ===

type Narrative {
  id: ID!
  content: String!
  signature: String!
  detectedAt: DateTime!
  validFrom: DateTime!
  validTo: DateTime
  threatLevel: ThreatLevel!
  taxonomy: [String!]!
  metadata: JSON

  # Related entities
  sources: [Source!]!
  actors: [Actor!]!
  propagationMetrics: PropagationMetrics
  attributions: [Attribution!]!
  mutations: [Narrative!]!
  campaigns: [Campaign!]!
}

type Actor {
  id: ID!
  type: ActorType!
  platform: String!
  handle: String!
  verificationStatus: VerificationStatus!
  botScore: Float
  influenceScore: Float
  metadata: JSON

  # Related
  narratives: [Narrative!]!
  botDetections: [BotDetection!]!
  coordinatesWith: [Actor!]!
}

type Source {
  id: ID!
  type: SourceType!
  name: String!
  credibilityScore: Float!
  biasProfile: JSON
  metadata: JSON

  # Related
  narratives: [Narrative!]!
  verifications: [SourceVerification!]!
}

type PropagationMetrics {
  velocity: Float!
  reach: Int!
  engagement: Int!
  amplificationNodes: [Actor!]!
  timeline: [PropagationEvent!]!
  geographicSpread: GeographicMetrics
}

type BotDetection {
  id: ID!
  actor: Actor!
  detectionMethod: String!
  confidence: Float!
  features: JSON!
  detectedAt: DateTime!
  status: DetectionStatus!
  reviewedBy: User
  reviewedAt: DateTime
}

type Campaign {
  id: ID!
  type: CampaignType!
  detectedAt: DateTime!
  status: CampaignStatus!
  threatLevel: ThreatLevel!
  narratives: [Narrative!]!
  actors: [Actor!]!
  metrics: CampaignMetrics
}

type CognitiveIntervention {
  id: ID!
  user: User!
  threatType: String!
  interventionType: InterventionType!
  content: JSON!
  deployedAt: DateTime!
  userAction: String
  effectivenessScore: Float
}

type CounterNarrative {
  id: ID!
  threat: Narrative!
  content: String!
  targetAudience: JSON!
  channels: [String!]!
  deployedAt: DateTime!
  reach: Int
  engagementMetrics: JSON
  effectivenessScore: Float
}

type Attribution {
  id: ID!
  narrative: Narrative!
  actor: Actor
  confidence: Float!
  evidence: [Evidence!]!
  method: AttributionMethod!
  timestamp: DateTime!
}

# === Enums ===

enum ThreatLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ActorType {
  PERSON
  BOT
  ORGANIZATION
  UNKNOWN
}

enum SourceType {
  MEDIA
  SOCIAL
  GOVERNMENT
  ACADEMIC
  COMMERCIAL
}

enum VerificationStatus {
  VERIFIED
  UNVERIFIED
  SUSPICIOUS
  FLAGGED
}

enum DetectionStatus {
  ACTIVE
  CONFIRMED
  FALSE_POSITIVE
  UNDER_REVIEW
}

enum CampaignType {
  DISINFORMATION
  ASTROTURFING
  AMPLIFICATION
  COORDINATED_HARASSMENT
}

enum CampaignStatus {
  ACTIVE
  MONITORING
  MITIGATED
  RESOLVED
}

enum InterventionType {
  WARNING
  FACT_CHECK
  ALTERNATIVE_PERSPECTIVE
  RESILIENCE_TRAINING
}

enum AttributionMethod {
  NETWORK_ANALYSIS
  BEHAVIORAL_PATTERN
  CONTENT_SIGNATURE
  EXTERNAL_INTELLIGENCE
}

# === Queries ===

type Query {
  # Narratives
  narrative(id: ID!): Narrative
  narratives(filter: NarrativeFilter, limit: Int, offset: Int): [Narrative!]!
  narrativePropagation(narrativeId: ID!, timeRange: TimeRange): PropagationMetrics!

  # Actors
  actor(id: ID!): Actor
  actors(filter: ActorFilter, limit: Int, offset: Int): [Actor!]!
  suspiciousActors(threshold: Float!): [Actor!]!

  # Bots
  botDetections(filter: BotFilter, limit: Int, offset: Int): [BotDetection!]!

  # Campaigns
  campaign(id: ID!): Campaign
  campaigns(filter: CampaignFilter, limit: Int, offset: Int): [Campaign!]!
  activeCampaigns: [Campaign!]!

  # Sources
  source(id: ID!): Source
  sources(filter: SourceFilter, limit: Int, offset: Int): [Source!]!

  # Attribution
  narrativeAttribution(narrativeId: ID!): [Attribution!]!

  # Cognitive Defense
  userVulnerability(userId: ID!): VulnerabilityAssessment!
  interventions(userId: ID!): [CognitiveIntervention!]!

  # Analytics
  threatTrends(timeRange: TimeRange): [ThreatTrend!]!
  platformMetrics(platform: String!, timeRange: TimeRange): PlatformMetrics!
}

# === Mutations ===

type Mutation {
  # Detection
  detectNarrative(input: NarrativeInput!): Narrative!
  classifyNarrative(id: ID!, taxonomy: [String!]!): Narrative!

  # Bot Detection
  flagAsBot(actorId: ID!, evidence: JSON!): BotDetection!
  reviewBotDetection(id: ID!, status: DetectionStatus!, notes: String): BotDetection!

  # Campaign Management
  createCampaign(input: CampaignInput!): Campaign!
  updateCampaignStatus(id: ID!, status: CampaignStatus!): Campaign!

  # Attribution
  attributeNarrative(narrativeId: ID!, actorId: ID!, evidence: [EvidenceInput!]!): Attribution!

  # Cognitive Defense
  deployIntervention(userId: ID!, input: InterventionInput!): CognitiveIntervention!
  recordInterventionResult(id: ID!, userAction: String!): CognitiveIntervention!

  # Counter-Narratives
  createCounterNarrative(threatId: ID!, input: CounterNarrativeInput!): CounterNarrative!
  deployCounterNarrative(id: ID!, channels: [String!]!): CounterNarrative!

  # Source Management
  verifySource(sourceId: ID!, verification: SourceVerificationInput!): Source!
}

# === Subscriptions ===

type Subscription {
  # Real-time updates
  narrativeDetected(filter: NarrativeFilter): Narrative!
  narrativePropagationUpdate(narrativeId: ID!): PropagationUpdate!
  highThreatAlert: Narrative!
  botDetected: BotDetection!
  campaignDetected: Campaign!
  interventionDeployed(userId: ID!): CognitiveIntervention!
}

# === Input Types ===

input NarrativeInput {
  content: String!
  metadata: JSON
}

input NarrativeFilter {
  threatLevel: ThreatLevel
  taxonomy: [String!]
  dateRange: TimeRange
  sources: [ID!]
  actors: [ID!]
}

input TimeRange {
  start: DateTime!
  end: DateTime!
}

input CampaignInput {
  type: CampaignType!
  narrativeIds: [ID!]!
  actorIds: [ID!]!
  metadata: JSON
}

input InterventionInput {
  threatType: String!
  interventionType: InterventionType!
  content: JSON!
}

input CounterNarrativeInput {
  content: String!
  targetAudience: JSON!
  channels: [String!]!
}

input EvidenceInput {
  type: String!
  content: JSON!
  source: String
}

input SourceVerificationInput {
  credibilityScore: Float!
  biasProfile: JSON
  notes: String
}

input BotFilter {
  minConfidence: Float
  status: DetectionStatus
  dateRange: TimeRange
}

input ActorFilter {
  type: ActorType
  platform: String
  minBotScore: Float
  verificationStatus: VerificationStatus
}

input CampaignFilter {
  type: CampaignType
  status: CampaignStatus
  threatLevel: ThreatLevel
  dateRange: TimeRange
}

input SourceFilter {
  type: SourceType
  minCredibilityScore: Float
}
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│              Authentication Flow (OIDC)                  │
│                                                          │
│  User → Frontend → API Gateway → OIDC Provider          │
│                         │                                │
│                         ▼                                │
│                  Validate JWT Token                      │
│                         │                                │
│                         ▼                                │
│                  Extract User Claims                     │
│                         │                                │
│                         ▼                                │
│                  Attach to Context                       │
│                         │                                │
│                         ▼                                │
│                    Call Service                          │
└─────────────────────────────────────────────────────────┘
```

### Authorization Flow (OPA)

```
┌─────────────────────────────────────────────────────────┐
│              Authorization Flow (OPA)                    │
│                                                          │
│  Service → Authorization Middleware                      │
│               │                                          │
│               ▼                                          │
│         Build OPA Query:                                 │
│           - User roles/permissions                       │
│           - Action being performed                       │
│           - Resource being accessed                      │
│               │                                          │
│               ▼                                          │
│         Query OPA Server                                 │
│               │                                          │
│               ▼                                          │
│         Evaluate Policy                                  │
│               │                                          │
│               ├─ Allow → Continue                        │
│               └─ Deny → Return 403 + Reason             │
└─────────────────────────────────────────────────────────┘
```

### Data Security

- **Encryption at Rest**: Database encryption, encrypted backups
- **Encryption in Transit**: TLS 1.3 for all connections
- **PII Protection**: Scrubbing in logs, data anonymization options
- **Audit Logging**: Comprehensive activity tracking
- **Rate Limiting**: Redis-based throttling

---

## Observability Architecture

### Metrics Collection

```
┌─────────────────────────────────────────────────────────┐
│                   Metrics Pipeline                       │
│                                                          │
│  Services → Prometheus Client Libraries                  │
│                         │                                │
│                         ▼                                │
│                 Prometheus Server                        │
│                 (Scrapes metrics)                        │
│                         │                                │
│                         ▼                                │
│                  Grafana Dashboards                      │
│                         │                                │
│                         ▼                                │
│                  AlertManager                            │
│                 (Threshold alerts)                       │
└─────────────────────────────────────────────────────────┘
```

### Key Metrics

**Detection Metrics**:
- `narratives_detected_total{threat_level, taxonomy}`
- `bots_detected_total{confidence_level}`
- `campaigns_detected_total{type}`
- `detection_latency_seconds{service}`
- `false_positive_rate{detection_type}`

**Performance Metrics**:
- `api_request_duration_seconds{endpoint, method}`
- `db_query_duration_seconds{database, query_type}`
- `ml_inference_duration_seconds{model}`
- `kafka_consumer_lag{topic, consumer_group}`

**Business Metrics**:
- `active_threats{threat_level}`
- `interventions_deployed_total{type}`
- `user_resilience_score{user_id}`
- `counter_narratives_deployed_total`

### Distributed Tracing

```
┌─────────────────────────────────────────────────────────┐
│                 Distributed Tracing                      │
│                                                          │
│  Request → Service A (add span)                          │
│               │                                          │
│               ├─→ Service B (child span)                │
│               │     │                                    │
│               │     └─→ Database (child span)           │
│               │                                          │
│               └─→ Service C (child span)                │
│                     │                                    │
│                     └─→ ML Model (child span)           │
│                                                          │
│  All spans → OpenTelemetry Collector                     │
│                │                                          │
│                └─→ Tempo/Jaeger                         │
│                     (Trace storage & visualization)      │
└─────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Ingress Controller                      │    │
│  │  - TLS termination                              │    │
│  │  - Load balancing                               │    │
│  │  - Rate limiting                                │    │
│  └───────────────────┬────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │         API Gateway (Deployment)                │    │
│  │  - 3+ replicas                                  │    │
│  │  - HPA (CPU/Memory based)                       │    │
│  └───────────────────┬────────────────────────────┘    │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │         Service Deployments                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │
│  │  │Narrative │ │Cognitive │ │Behavioral│       │    │
│  │  │ Analysis │ │ Defense  │ │Detection │       │    │
│  │  │(3 pods)  │ │(2 pods)  │ │(3 pods)  │       │    │
│  │  └──────────┘ └──────────┘ └──────────┘       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         ML Workers (StatefulSet)                │    │
│  │  - GPU node affinity                            │    │
│  │  - Persistent volumes for models                │    │
│  │  - HPA based on inference queue depth           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Stream Processors (Deployment)          │    │
│  │  - Kafka consumer groups                        │    │
│  │  - Auto-scaling based on lag                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Data Stores (StatefulSets)              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │    │
│  │  │  Neo4j   │ │PostgreSQL│ │  Redis   │       │    │
│  │  │ Cluster  │ │ Cluster  │ │ Cluster  │       │    │
│  │  └──────────┘ └──────────┘ └──────────┘       │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Helm Chart Structure

```
influence-ops/
├── Chart.yaml
├── values.yaml
├── values-prod.yaml
├── values-staging.yaml
└── templates/
    ├── api-gateway/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── hpa.yaml
    │   └── ingress.yaml
    ├── services/
    │   ├── narrative-analysis/
    │   ├── cognitive-defense/
    │   ├── behavioral-detection/
    │   ├── strategic-comm/
    │   ├── network-analysis/
    │   └── infowar-intel/
    ├── ml-workers/
    │   ├── statefulset.yaml
    │   ├── service.yaml
    │   └── pvc.yaml
    ├── stream-processors/
    │   ├── deployment.yaml
    │   └── hpa.yaml
    ├── kafka/
    │   ├── topics.yaml
    │   └── acls.yaml
    └── monitoring/
        ├── servicemonitor.yaml
        └── prometheusrule.yaml
```

---

## Performance & Scalability

### Scaling Strategy

**Horizontal Scaling**:
- API Gateway: 3-10 replicas based on load
- Services: 2-5 replicas per service
- ML Workers: 2-8 workers based on queue depth
- Stream Processors: 2-6 processors based on lag

**Vertical Scaling**:
- Neo4j: Large memory instances for graph traversal
- PostgreSQL: SSD-backed instances with high IOPS
- ML Workers: GPU-enabled instances

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API Latency (p95) | <500ms | For most queries |
| API Latency (p99) | <1s | For complex queries |
| Detection Latency | <10 minutes | From content publish to detection |
| Bot Detection Accuracy | >90% | With <5% false positives |
| Narrative Classification Accuracy | >85% | Multi-class classification |
| System Throughput | >10,000 items/sec | Content processing |
| Database Query (p95) | <100ms | Neo4j graph queries |
| ML Inference (p95) | <200ms | Per model inference |

### Caching Strategy

**Redis Caching**:
- Narrative metadata (TTL: 1 hour)
- Actor profiles (TTL: 30 minutes)
- Source credibility scores (TTL: 6 hours)
- Fact-check results (TTL: 24 hours)
- ML model predictions (TTL: 15 minutes)

**CDN Caching**:
- Static assets (long TTL)
- Public API responses (short TTL)

---

## Disaster Recovery

### Backup Strategy

**Databases**:
- Neo4j: Daily full backups, 6-hour incremental
- PostgreSQL: Continuous WAL archiving, daily base backups
- Redis: RDB snapshots every 6 hours, AOF enabled

**Retention**:
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year

### Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**Disaster Recovery Plan**:
1. Detect failure (automated monitoring)
2. Assess impact and declare incident
3. Switch to backup region (if multi-region)
4. Restore data from most recent backup
5. Verify data integrity
6. Resume operations
7. Post-mortem and improvements

---

## Compliance & Governance

### Data Retention

- Raw content: 90 days
- Processed narratives: 2 years
- Bot detections: 1 year
- Audit logs: 7 years
- Training data: Indefinite (with periodic review)

### Privacy Controls

- PII anonymization in logs
- User data deletion capabilities (GDPR)
- Data export functionality
- Consent management
- Right-to-be-forgotten support

### Audit Trail

All operations logged:
- Narrative detection events
- Bot flagging actions
- Attribution decisions
- Intervention deployments
- Counter-narrative creation
- Administrative actions

---

## Future Enhancements

### Planned Capabilities

1. **Multi-language Support**: Extend to 20+ languages
2. **Cross-modal Analysis**: Video, audio, image content analysis
3. **Predictive Analytics**: Forecast narrative propagation
4. **Automated Response**: AI-driven counter-narrative generation
5. **Federation**: Multi-organization threat intelligence sharing
6. **Mobile Detection**: Mobile app for field analysts

### Research Areas

- Advanced graph neural networks for network analysis
- Reinforcement learning for intervention optimization
- Explainable AI for attribution confidence
- Quantum-resistant encryption for future-proofing
- Federated learning for privacy-preserving training

---

## Appendices

### Appendix A: Technology Versions

- **Node.js**: 20+
- **TypeScript**: 5.3+
- **Neo4j**: 5.x
- **PostgreSQL**: 15+
- **Redis**: 7+
- **Kafka**: 3.x
- **Kubernetes**: 1.28+
- **PyTorch**: 2.x
- **Python**: 3.11+

### Appendix B: Resource Requirements

**Minimum (Development)**:
- 4 CPU cores
- 16 GB RAM
- 100 GB SSD storage
- No GPU required

**Recommended (Production)**:
- 32 CPU cores (across cluster)
- 128 GB RAM (across cluster)
- 1 TB SSD storage
- 2+ GPUs for ML workloads

### Appendix C: Cost Estimates

**Infrastructure (Monthly)**:
- Kubernetes cluster: $1,500 - $3,000
- Databases: $800 - $2,000
- Object storage: $100 - $500
- Streaming (Kafka): $400 - $1,000
- ML compute: $1,000 - $5,000 (depending on GPU usage)
- **Total**: $3,800 - $11,500/month

**External Services (Monthly)**:
- Fact-checking APIs: $500 - $1,500
- Threat intelligence feeds: $1,000 - $5,000
- **Total**: $1,500 - $6,500/month

**Grand Total**: $5,300 - $18,000/month

---

**Document Control**

- **Version**: 1.0.0
- **Created**: 2025-11-27
- **Last Updated**: 2025-11-27
- **Owner**: Summit/IntelGraph Architecture Team
- **Status**: Design Document
- **Related Documents**:
  - [INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md](./INFLUENCE_OPERATIONS_DEFENSE_ROADMAP.md)
  - [INFLUENCE_OPS_INTEGRATION_GUIDE.md](./INFLUENCE_OPS_INTEGRATION_GUIDE.md)
  - [ARCHITECTURE.md](./ARCHITECTURE.md)

---

**END OF DOCUMENT**
