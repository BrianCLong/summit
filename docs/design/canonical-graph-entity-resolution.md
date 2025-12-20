# Canonical Graph & Entity Resolution Design (GA-Ready)

**Author:** Claude (AI Assistant)
**Date:** 2025-11-20
**Status:** DRAFT for Review
**Target Release:** MVP-2 / GA

---

## Executive Summary

This document defines the **GA-ready canonical graph model** and **entity resolution (ER) pipeline** for Summit/IntelGraph, aligned with the Council Wishbook's entity/relationship ontology and the MVP-2/GA PRD requirements.

**Key Outcomes:**
- Single authoritative schema layer spanning GraphQL, Neo4j, PostgreSQL, and TypeScript
- Explainable ER pipeline with deterministic + probabilistic scoring, manual review queues
- Full provenance for all merge/split decisions
- Production-ready interfaces for first ER PR

---

## 1. Gap Analysis

### 1.1 Wishbook Entity Requirements vs. Current Implementation

**Wishbook Canonical Entities (23 types):**
Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, Infrastructure, FinancialInstrument, Indicator, Claim, Case, Narrative, Campaign, License, Authority, Sensor, Runbook, Evidence, Hypothesis

**Current GraphQL Schema (crudSchema.ts - 15 types):**
PERSON, ORGANIZATION, LOCATION, DEVICE, EMAIL, PHONE, IP_ADDRESS, DOMAIN, URL, FILE, DOCUMENT, ACCOUNT, TRANSACTION, EVENT, OTHER

**GAPS IDENTIFIED:**

| Missing Entity Type | Priority | Notes |
|---------------------|----------|-------|
| Vehicle | HIGH | Mentioned in Wishbook, needed for geo-temporal tracking |
| Infrastructure | HIGH | Critical for Hannibal/Budanov use cases (logistics) |
| FinancialInstrument | HIGH | Distinct from ACCOUNT, needed for AML |
| Indicator | HIGH | Already in Neo4j schema, missing from GraphQL |
| Claim | CRITICAL | Core to provenance model (FR-D) |
| Case | CRITICAL | Already in Neo4j, missing from canonical layer |
| Narrative | MEDIUM | Hypothesis workbench requirement (FR-C) |
| Campaign | MEDIUM | Threat intelligence tracking |
| License | CRITICAL | Authority/license compiler (GA FR-I) |
| Authority | CRITICAL | Legal basis tracking (GA FR-I) |
| Sensor | LOW | Telemetry sources |
| Runbook | MEDIUM | Operational procedures |
| Evidence | CRITICAL | Provenance & claim ledger (FR-D) |
| Hypothesis | CRITICAL | ACH workbench (FR-C) |
| Communication | N/A | Can model as entity type or combine EMAIL/PHONE |

**Relationship Gaps:**

Current: 18 types (good coverage)
Missing semantic richness for:
- Evidence chains (SUPPORTS, CONTRADICTS, DERIVED_FROM)
- Authority relationships (AUTHORIZED_BY, GOVERNED_BY)
- Temporal sequences (PRECEDES, FOLLOWS, CONCURRENT_WITH)

### 1.2 Schema Layer Divergences

**Problem:** Multiple schema definitions exist without clear authority:
- GraphQL: 15 entity types in `crudSchema.ts`
- Neo4j: Comprehensive constraints but underspecified types
- TypeScript: Multiple interfaces (EntityRepo, AML, GraphStore) with different shapes
- AML Service: Rich entity profiles not integrated with core

**Impact:** Inconsistent entity handling, difficult cross-layer mapping, ER complexity

---

## 2. Canonical Schema Architecture

### 2.1 Design Principles

1. **Single Source of Truth:** Canonical schema defined in TypeScript, generated to GraphQL SDL and Neo4j constraints
2. **Layer Coherence:** All layers (GraphQL, Neo4j, Postgres, UI) consume canonical definitions
3. **Extensibility:** Policy labels, custom properties, temporal fields built-in
4. **ER-First:** Every entity has canonicalId, confidence, provenance fields by default
5. **Type Safety:** Discriminated unions, strict enums, validated at compile and runtime

### 2.2 Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Canonical Schema Layer (TypeScript)               │
│  packages/canonical-schema/                                 │
│  - entities.ts      (23 entity type definitions)           │
│  - relationships.ts (30+ relationship types)               │
│  - policy.ts        (7 policy label types)                 │
│  - temporal.ts      (bitemporal types)                     │
│  - provenance.ts    (source/transform chains)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (imports & codegen)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌──────────────────┐
│  GraphQL SDL  │   │  Neo4j Schema │   │  PostgreSQL DDL  │
│  Auto-generated│   │  Constraints  │   │  Migrations      │
│  from canonical│   │  & Indexes    │   │  Generated       │
└───────────────┘   └───────────────┘   └──────────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  UI Clients      │
                    │  (TypeScript)    │
                    └──────────────────┘
```

### 2.3 Canonical Entity Base Type

```typescript
// packages/canonical-schema/src/core/base.ts

export interface CanonicalEntityBase {
  // Identity
  id: string;                          // UUID primary key
  canonicalId?: string;                // ER master entity ID
  tenantId: string;                    // Multi-tenant isolation

  // Core attributes
  type: CanonicalEntityType;           // Enum of 23 types
  label: string;                       // Display name
  description?: string;                // Human-readable description

  // Metadata
  properties: Record<string, any>;     // Type-specific properties
  customMetadata?: Record<string, any>; // User extensions

  // Provenance & Quality
  confidence: number;                  // 0.0-1.0
  source: string;                      // Source system/connector
  provenance: ProvenanceChain;         // Full lineage

  // Policy & Governance
  policyLabels: PolicyLabels;          // 7 mandatory labels

  // Temporal (Bitemporal)
  validFrom: Date;                     // Business time start
  validTo?: Date;                      // Business time end
  recordedAt: Date;                    // System time

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;                     // Optimistic locking

  // Investigation context
  investigationId?: string;            // Optional case association
  caseId?: string;                     // Optional case association
}

export enum CanonicalEntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  ASSET = 'ASSET',
  ACCOUNT = 'ACCOUNT',
  EVENT = 'EVENT',
  DOCUMENT = 'DOCUMENT',
  COMMUNICATION = 'COMMUNICATION',
  DEVICE = 'DEVICE',
  VEHICLE = 'VEHICLE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FINANCIAL_INSTRUMENT = 'FINANCIAL_INSTRUMENT',
  INDICATOR = 'INDICATOR',
  CLAIM = 'CLAIM',
  CASE = 'CASE',
  NARRATIVE = 'NARRATIVE',
  CAMPAIGN = 'CAMPAIGN',
  LICENSE = 'LICENSE',
  AUTHORITY = 'AUTHORITY',
  SENSOR = 'SENSOR',
  RUNBOOK = 'RUNBOOK',
  EVIDENCE = 'EVIDENCE',
  HYPOTHESIS = 'HYPOTHESIS',
}

export interface PolicyLabels {
  origin: string;                      // Source attribution
  sensitivity: SensitivityLevel;       // Classification
  clearance: ClearanceLevel;           // Access requirement
  legalBasis: string;                  // Authority for processing
  needToKnow: string[];                // Compartmentation tags
  purposeLimitation: string[];         // Allowable uses
  retentionClass: RetentionClass;      // Lifecycle tier
}

export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  AUTHORIZED = 'AUTHORIZED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

export enum RetentionClass {
  TRANSIENT = 'TRANSIENT',         // 30 days
  SHORT_TERM = 'SHORT_TERM',       // 1 year
  MEDIUM_TERM = 'MEDIUM_TERM',     // 5 years
  LONG_TERM = 'LONG_TERM',         // 10 years
  PERMANENT = 'PERMANENT',          // Indefinite
  LEGAL_HOLD = 'LEGAL_HOLD',       // Immutable until released
}

export interface ProvenanceChain {
  sourceId: string;                    // Originating connector/system
  assertions: ProvenanceAssertion[];   // Chain of transforms
  verificationStatus: VerificationStatus;
  trustScore: number;                  // 0.0-1.0
}

export interface ProvenanceAssertion {
  id: string;
  timestamp: Date;
  actor: string;                       // User or service
  action: 'INGEST' | 'TRANSFORM' | 'ENRICH' | 'MERGE' | 'SPLIT' | 'VALIDATE';
  input: string[];                     // Input entity/doc IDs
  output: string[];                    // Output entity IDs
  method: string;                      // Algorithm/rule name
  parameters: Record<string, any>;     // Reproducibility params
  modelVersion?: string;               // ML model version if applicable
  confidence: number;
  evidence?: string[];                 // Supporting doc IDs
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PARTIAL = 'PARTIAL',
  VERIFIED = 'VERIFIED',
  DISPUTED = 'DISPUTED',
  INVALIDATED = 'INVALIDATED',
}
```

### 2.4 Canonical Relationship Base Type

```typescript
// packages/canonical-schema/src/core/relationship.ts

export interface CanonicalRelationship {
  // Identity
  id: string;
  tenantId: string;

  // Relationship structure
  type: CanonicalRelationshipType;
  label?: string;
  description?: string;

  // Graph topology
  fromEntityId: string;
  toEntityId: string;
  directed: boolean;                   // True for most, false for symmetric

  // Metadata
  properties: Record<string, any>;
  customMetadata?: Record<string, any>;

  // Provenance & Quality
  confidence: number;
  source: string;
  provenance: ProvenanceChain;

  // Policy
  policyLabels: PolicyLabels;

  // Temporal
  validFrom: Date;
  validTo?: Date;
  recordedAt: Date;
  since?: Date;                        // Relationship start (business)
  until?: Date;                        // Relationship end (business)

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;

  // Context
  investigationId?: string;
  caseId?: string;
}

export enum CanonicalRelationshipType {
  // Core relationships (existing)
  CONNECTED_TO = 'CONNECTED_TO',
  OWNS = 'OWNS',
  WORKS_FOR = 'WORKS_FOR',
  LOCATED_AT = 'LOCATED_AT',
  MENTIONS = 'MENTIONS',
  COMMUNICATES_WITH = 'COMMUNICATES_WITH',
  TRANSACTED_WITH = 'TRANSACTED_WITH',
  ACCESSED = 'ACCESSED',
  CREATED = 'CREATED',
  MODIFIED = 'MODIFIED',
  RELATED_TO = 'RELATED_TO',
  MEMBER_OF = 'MEMBER_OF',
  MANAGES = 'MANAGES',
  REPORTS_TO = 'REPORTS_TO',
  SUBSIDIARY_OF = 'SUBSIDIARY_OF',
  PARTNER_OF = 'PARTNER_OF',
  COMPETITOR_OF = 'COMPETITOR_OF',
  SIMILAR_TO = 'SIMILAR_TO',

  // Evidence & provenance (NEW)
  SUPPORTS = 'SUPPORTS',               // Evidence → Claim
  CONTRADICTS = 'CONTRADICTS',         // Evidence → Claim
  DERIVED_FROM = 'DERIVED_FROM',       // Claim → Source
  CITES = 'CITES',                     // Narrative → Evidence

  // Authority & governance (NEW)
  AUTHORIZED_BY = 'AUTHORIZED_BY',     // Operation → Authority
  GOVERNED_BY = 'GOVERNED_BY',         // Entity → Policy/License
  REQUIRES = 'REQUIRES',               // Action → Clearance

  // Temporal sequences (NEW)
  PRECEDES = 'PRECEDES',               // Event → Event
  FOLLOWS = 'FOLLOWS',                 // Event → Event
  CONCURRENT_WITH = 'CONCURRENT_WITH', // Event → Event

  // Hypothesis relationships (NEW)
  EXPLAINS = 'EXPLAINS',               // Hypothesis → Observation
  ALTERNATIVE_TO = 'ALTERNATIVE_TO',   // Hypothesis → Hypothesis
  REFUTES = 'REFUTES',                 // Evidence → Hypothesis
}
```

---

## 3. Entity Resolution Pipeline Architecture

### 3.1 ER Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Entity Ingestion                         │
│  (Connectors, API, Manual Entry)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Candidate Generation (Blocking)                │
│  - Phonetic keys (Double Metaphone)                        │
│  - Exact keys (normalized email, phone, identifiers)       │
│  - Locality-sensitive hashing (LSH) for addresses          │
│  Output: Candidate pairs for comparison                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Feature Extraction & Scoring                  │
│  Layer 1: Deterministic Rules (exact matches)              │
│  Layer 2: Fuzzy Matching (Jaro-Winkler, Levenshtein)      │
│  Layer 3: Semantic Similarity (embeddings + cosine)       │
│  Layer 4: Network Features (shared contacts, co-location) │
│  Output: Match scores + feature explanations               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Decision & Routing                         │
│  If score >= HIGH_THRESHOLD: Auto-merge (audit logged)    │
│  If MEDIUM < score < HIGH: Manual review queue             │
│  If score <= MEDIUM: No action (log as non-match)         │
│  Output: Decisions + confidence bands                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Manual Review Queue (UI)                       │
│  - Side-by-side entity comparison                          │
│  - Feature scorecard with explanations                     │
│  - Merge/Split/Defer actions                               │
│  - Dissent/notes capture                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Merge Execution & Provenance                   │
│  - Create ResolutionCluster                                │
│  - Update canonicalId on all entities                      │
│  - Create MERGED_FROM provenance assertions                │
│  - Update relationships to point to canonical              │
│  - Log audit event                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Continuous Learning & Feedback                    │
│  - Track precision/recall by entity type                   │
│  - Retrain thresholds based on manual decisions            │
│  - Flag drift in feature distributions                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Service Architecture

**New Services:**
1. **ERCandidateService** - Blocking and candidate pair generation
2. **ERScoringService** - Feature extraction and match scoring
3. **ERDecisionService** - Threshold-based routing
4. **ERReviewQueueService** - Manual review workflow
5. **ERMergeService** - Merge execution with provenance
6. **ERMetricsService** - Precision tracking and alerting

**Existing Services (Enhanced):**
- **EntityResolutionService** (Neo4j) - Add canonical cluster support
- **HybridEntityResolutionService** - Orchestrator for ML pipeline
- **AML EntityResolver** - Specialized financial ER

**Database Components:**
- **PostgreSQL tables:** `merge_decisions`, `er_precision_metrics`, `er_review_queue`
- **Neo4j:** Entity canonicalId indexes, ResolutionCluster nodes
- **Redis Streams:** Job queue for async ER processing

### 3.3 ER Core Interfaces

```typescript
// packages/canonical-schema/src/er/types.ts

export interface ERCandidate {
  entityA: CanonicalEntityBase;
  entityB: CanonicalEntityBase;
  blockingKey: string;                 // How pair was generated
  generationMethod: 'phonetic' | 'exact' | 'lsh' | 'network' | 'manual';
}

export interface ERFeatureScore {
  feature: string;                     // e.g., "name_jaro_winkler"
  score: number;                       // 0.0-1.0
  weight: number;                      // Contribution to final score
  explanation: string;                 // Human-readable
  evidence?: Record<string, any>;      // Raw comparison data
}

export interface ERMatchScore {
  candidateId: string;
  entityAId: string;
  entityBId: string;
  overallScore: number;                // Weighted aggregate
  method: 'deterministic' | 'probabilistic' | 'ml_supervised' | 'hybrid';
  features: ERFeatureScore[];
  confidence: number;                  // Meta-confidence in score
  riskScore: number;                   // Risk of false positive
  modelVersion: string;
  timestamp: Date;
}

export interface ERDecision {
  id: string;
  matchScore: ERMatchScore;
  decision: 'MERGE' | 'NO_MERGE' | 'DEFER' | 'SPLIT';
  decisionMethod: 'auto' | 'manual' | 'bulk';
  decidedBy?: string;                  // User ID if manual
  decidedAt: Date;
  notes?: string;
  reviewRequired: boolean;
  entityType: CanonicalEntityType;

  // Provenance
  audit: {
    traceId: string;
    reviewedBy?: string[];
    approvedBy?: string;
    dissent?: string;                  // Minority opinion
  };
}

export interface ERReviewQueueItem {
  id: string;
  matchScore: ERMatchScore;
  status: 'PENDING' | 'IN_REVIEW' | 'DECIDED' | 'ESCALATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  dueAt?: Date;
  createdAt: Date;

  // UI helpers
  entityASnapshot: Partial<CanonicalEntityBase>;
  entityBSnapshot: Partial<CanonicalEntityBase>;
  conflictingAttributes: string[];
  sharedRelationships: number;
}

export interface ResolutionCluster {
  id: string;                          // Canonical entity ID
  tenantId: string;
  entityIds: string[];                 // All entities in cluster
  canonicalEntity: CanonicalEntityBase; // Master/golden record

  // Resolution metadata
  resolution: {
    method: 'deterministic' | 'probabilistic' | 'ml_supervised' | 'hybrid';
    algorithm: string;
    features: string[];
    threshold: number;
    confidence: number;
  };

  // Evidence
  evidence: Array<{
    type: 'name_match' | 'identifier_match' | 'address_match' | 'network_pattern';
    strength: number;
    details: Record<string, any>;
  }>;

  // Conflict resolution
  conflicts: Array<{
    attribute: string;
    values: Array<{
      entityId: string;
      value: any;
      confidence: number;
    }>;
    resolution: 'use_highest_confidence' | 'manual' | 'merge_array';
    resolvedValue: any;
  }>;

  // Audit
  audit: {
    createdAt: Date;
    lastUpdated: Date;
    reviewedBy?: string;
    approvedBy?: string;
    version: number;
    revertible: boolean;
    revertedFrom?: string;             // Previous cluster ID if split
  };
}

export interface ERThresholds {
  entityType: CanonicalEntityType;
  autoMergeThreshold: number;          // >= this: auto-merge
  manualReviewThreshold: number;       // Between this and auto: review
  rejectThreshold: number;             // <= this: no match

  // GA precision requirements
  targetPrecision: number;             // e.g., 0.90 for PERSON
  currentPrecision: number;
  sampleSize: number;
  lastCalibrated: Date;
}
```

---

## 4. Concrete ER Example: Person Entity Resolution

### 4.1 Person Entity Specialization

```typescript
// packages/canonical-schema/src/entities/person.ts

export interface PersonEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.PERSON;

  // Core attributes
  names: Array<{
    value: string;
    type: 'legal' | 'alias' | 'former' | 'aka' | 'maiden' | 'nickname';
    script?: string;                   // e.g., "Latin", "Cyrillic"
    confidence: number;
    validFrom?: Date;
    validTo?: Date;
  }>;

  identifiers: Array<{
    type: 'ssn' | 'passport' | 'license' | 'tax_id' | 'national_id' | 'employee_id';
    value: string;
    country?: string;
    issuedDate?: Date;
    expiryDate?: Date;
    confidence: number;
  }>;

  contactInfo: Array<{
    type: 'email' | 'phone' | 'address';
    value: string;
    primary: boolean;
    confidence: number;
  }>;

  demographics?: {
    dateOfBirth?: Date;
    dateOfBirthPrecision?: 'day' | 'month' | 'year';
    placeOfBirth?: string;
    gender?: 'M' | 'F' | 'NB' | 'U';
    nationality?: string[];
    occupation?: string;
  };

  // Derived/enriched
  riskScore?: number;
  screeningResults?: Array<{
    list: string;                      // e.g., "OFAC SDN"
    matched: boolean;
    score: number;
    matchedAt: Date;
  }>;
}
```

### 4.2 Person ER Feature Extractors

```typescript
// services/er/src/features/person-features.ts

export class PersonERFeatures {
  /**
   * Extracts all ER features for a person entity pair
   */
  static extractFeatures(
    personA: PersonEntity,
    personB: PersonEntity
  ): ERFeatureScore[] {
    const features: ERFeatureScore[] = [];

    // Feature 1: Exact identifier match
    const exactIdMatch = this.checkExactIdentifierMatch(personA, personB);
    if (exactIdMatch.matched) {
      features.push({
        feature: 'exact_identifier_match',
        score: 1.0,
        weight: 0.4,                   // High weight for deterministic
        explanation: `Exact match on ${exactIdMatch.type}: ${exactIdMatch.value}`,
        evidence: exactIdMatch,
      });
    }

    // Feature 2: Name similarity (Jaro-Winkler)
    const nameScore = this.computeNameSimilarity(personA, personB);
    features.push({
      feature: 'name_jaro_winkler',
      score: nameScore.score,
      weight: 0.25,
      explanation: `Name similarity: ${(nameScore.score * 100).toFixed(1)}% (${nameScore.nameA} vs ${nameScore.nameB})`,
      evidence: nameScore,
    });

    // Feature 3: Phonetic match
    const phoneticScore = this.computePhoneticMatch(personA, personB);
    features.push({
      feature: 'phonetic_match',
      score: phoneticScore.score,
      weight: 0.15,
      explanation: `Phonetic similarity: ${phoneticScore.codeA} vs ${phoneticScore.codeB}`,
      evidence: phoneticScore,
    });

    // Feature 4: Contact overlap
    const contactScore = this.computeContactOverlap(personA, personB);
    if (contactScore.overlapping > 0) {
      features.push({
        feature: 'contact_overlap',
        score: contactScore.score,
        weight: 0.2,
        explanation: `${contactScore.overlapping} overlapping contacts`,
        evidence: contactScore,
      });
    }

    // Feature 5: Shared relationships (network feature)
    // (Requires graph traversal - async/deferred)

    return features;
  }

  private static checkExactIdentifierMatch(
    personA: PersonEntity,
    personB: PersonEntity
  ): { matched: boolean; type?: string; value?: string } {
    for (const idA of personA.identifiers) {
      for (const idB of personB.identifiers) {
        if (idA.type === idB.type && idA.value === idB.value) {
          return { matched: true, type: idA.type, value: idA.value };
        }
      }
    }
    return { matched: false };
  }

  private static computeNameSimilarity(
    personA: PersonEntity,
    personB: PersonEntity
  ): { score: number; nameA: string; nameB: string } {
    // Get legal names
    const legalA = personA.names.find(n => n.type === 'legal');
    const legalB = personB.names.find(n => n.type === 'legal');

    if (!legalA || !legalB) {
      return { score: 0, nameA: '', nameB: '' };
    }

    // Use Jaro-Winkler from external library (e.g., natural, string-similarity)
    const score = this.jaroWinkler(
      legalA.value.toLowerCase(),
      legalB.value.toLowerCase()
    );

    return { score, nameA: legalA.value, nameB: legalB.value };
  }

  private static computePhoneticMatch(
    personA: PersonEntity,
    personB: PersonEntity
  ): { score: number; codeA: string; codeB: string } {
    const legalA = personA.names.find(n => n.type === 'legal');
    const legalB = personB.names.find(n => n.type === 'legal');

    if (!legalA || !legalB) {
      return { score: 0, codeA: '', codeB: '' };
    }

    // Double Metaphone encoding
    const codeA = this.doubleMetaphone(legalA.value)[0];
    const codeB = this.doubleMetaphone(legalB.value)[0];

    return {
      score: codeA === codeB ? 1.0 : 0.0,
      codeA,
      codeB,
    };
  }

  private static computeContactOverlap(
    personA: PersonEntity,
    personB: PersonEntity
  ): { score: number; overlapping: number; total: number } {
    const contactsA = new Set(personA.contactInfo.map(c => c.value.toLowerCase()));
    const contactsB = new Set(personB.contactInfo.map(c => c.value.toLowerCase()));

    const intersection = [...contactsA].filter(c => contactsB.has(c));
    const union = new Set([...contactsA, ...contactsB]);

    const score = union.size > 0 ? intersection.length / union.size : 0;

    return {
      score,
      overlapping: intersection.length,
      total: union.size,
    };
  }

  // Stub implementations (would use actual libraries)
  private static jaroWinkler(a: string, b: string): number {
    // Use library like 'jaro-winkler' or 'natural'
    return 0.85; // Stub
  }

  private static doubleMetaphone(s: string): [string, string] {
    // Use library like 'natural'
    return ['STUB', 'STUB'];
  }
}
```

### 4.3 Person ER Workflow Example

```typescript
// services/er/src/workflows/person-er-workflow.ts

import { PersonEntity, ERMatchScore, ERDecision, ERThresholds } from '@summit/canonical-schema';
import { PersonERFeatures } from '../features/person-features';
import { ERScoringService } from '../services/er-scoring-service';
import { ERDecisionService } from '../services/er-decision-service';

export class PersonERWorkflow {
  constructor(
    private scoringService: ERScoringService,
    private decisionService: ERDecisionService
  ) {}

  /**
   * Full ER workflow for two person entities
   */
  async resolvePair(
    personA: PersonEntity,
    personB: PersonEntity,
    thresholds: ERThresholds
  ): Promise<ERDecision> {
    // Step 1: Extract features
    const features = PersonERFeatures.extractFeatures(personA, personB);

    // Step 2: Compute weighted score
    const matchScore = this.scoringService.computeWeightedScore({
      entityAId: personA.id,
      entityBId: personB.id,
      features,
      method: 'hybrid',
      modelVersion: 'person-er-v1.0',
    });

    // Step 3: Route decision
    const decision = await this.decisionService.routeDecision(
      matchScore,
      thresholds,
      personA.type
    );

    return decision;
  }

  /**
   * Example: High-confidence auto-merge
   */
  async exampleAutoMerge(): Promise<void> {
    const personA: PersonEntity = {
      id: 'person-001',
      tenantId: 'tenant-acme',
      type: CanonicalEntityType.PERSON,
      label: 'John Smith',
      description: 'Software Engineer',
      properties: {},
      confidence: 0.95,
      source: 'hrms',
      provenance: {
        sourceId: 'hrms-connector',
        assertions: [],
        verificationStatus: VerificationStatus.VERIFIED,
        trustScore: 0.95,
      },
      policyLabels: {
        origin: 'hrms',
        sensitivity: SensitivityLevel.INTERNAL,
        clearance: ClearanceLevel.AUTHORIZED,
        legalBasis: 'employee-data-processing',
        needToKnow: ['hr', 'management'],
        purposeLimitation: ['hr-operations'],
        retentionClass: RetentionClass.LONG_TERM,
      },
      validFrom: new Date('2020-01-01'),
      recordedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      version: 1,

      // Person-specific
      names: [
        { value: 'John Smith', type: 'legal', confidence: 1.0 },
        { value: 'Johnny', type: 'nickname', confidence: 0.8 },
      ],
      identifiers: [
        { type: 'ssn', value: '123-45-6789', country: 'US', confidence: 1.0 },
        { type: 'employee_id', value: 'EMP-12345', confidence: 1.0 },
      ],
      contactInfo: [
        { type: 'email', value: 'john.smith@acme.com', primary: true, confidence: 1.0 },
        { type: 'phone', value: '+1-555-0123', primary: true, confidence: 0.9 },
      ],
      demographics: {
        dateOfBirth: new Date('1985-06-15'),
        dateOfBirthPrecision: 'day',
        gender: 'M',
        nationality: ['US'],
        occupation: 'Software Engineer',
      },
    };

    const personB: PersonEntity = {
      ...personA,
      id: 'person-002',
      source: 'email-archive',
      provenance: {
        sourceId: 'email-connector',
        assertions: [],
        verificationStatus: VerificationStatus.PARTIAL,
        trustScore: 0.75,
      },
      confidence: 0.85,
      names: [
        { value: 'John W. Smith', type: 'legal', confidence: 0.9 },
      ],
      identifiers: [
        { type: 'email', value: 'jsmith@acme.com', confidence: 0.85 },
      ],
      contactInfo: [
        { type: 'email', value: 'jsmith@acme.com', primary: true, confidence: 0.85 },
      ],
    };

    const thresholds: ERThresholds = {
      entityType: CanonicalEntityType.PERSON,
      autoMergeThreshold: 0.90,
      manualReviewThreshold: 0.70,
      rejectThreshold: 0.70,
      targetPrecision: 0.90,
      currentPrecision: 0.92,
      sampleSize: 1000,
      lastCalibrated: new Date(),
    };

    const decision = await this.resolvePair(personA, personB, thresholds);

    if (decision.decision === 'MERGE') {
      console.log('✓ Auto-merge approved');
      console.log(`  Score: ${decision.matchScore.overallScore.toFixed(3)}`);
      console.log(`  Features:`);
      for (const feat of decision.matchScore.features) {
        console.log(`    - ${feat.feature}: ${feat.score.toFixed(3)} (${feat.explanation})`);
      }
    }
  }
}
```

---

## 5. Schema Migration Plan

### 5.1 GraphQL Schema Extensions

**File:** `server/src/graphql/schema/canonical.graphql` (NEW)

```graphql
# Extended entity types
enum CanonicalEntityType {
  PERSON
  ORGANIZATION
  LOCATION
  ASSET
  ACCOUNT
  EVENT
  DOCUMENT
  COMMUNICATION
  DEVICE
  VEHICLE
  INFRASTRUCTURE
  FINANCIAL_INSTRUMENT
  INDICATOR
  CLAIM
  CASE
  NARRATIVE
  CAMPAIGN
  LICENSE
  AUTHORITY
  SENSOR
  RUNBOOK
  EVIDENCE
  HYPOTHESIS
}

# Policy labels
type PolicyLabels {
  origin: String!
  sensitivity: SensitivityLevel!
  clearance: ClearanceLevel!
  legalBasis: String!
  needToKnow: [String!]!
  purposeLimitation: [String!]!
  retentionClass: RetentionClass!
}

enum SensitivityLevel {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  RESTRICTED
  TOP_SECRET
}

# Provenance
type ProvenanceChain {
  sourceId: String!
  assertions: [ProvenanceAssertion!]!
  verificationStatus: VerificationStatus!
  trustScore: Float!
}

type ProvenanceAssertion {
  id: ID!
  timestamp: DateTime!
  actor: String!
  action: ProvenanceAction!
  input: [String!]!
  output: [String!]!
  method: String!
  parameters: JSON
  modelVersion: String
  confidence: Float!
  evidence: [String!]
}

enum ProvenanceAction {
  INGEST
  TRANSFORM
  ENRICH
  MERGE
  SPLIT
  VALIDATE
}

# ER Types
type ERMatchScore {
  candidateId: ID!
  entityAId: ID!
  entityBId: ID!
  overallScore: Float!
  method: String!
  features: [ERFeatureScore!]!
  confidence: Float!
  riskScore: Float!
  modelVersion: String!
  timestamp: DateTime!
}

type ERFeatureScore {
  feature: String!
  score: Float!
  weight: Float!
  explanation: String!
  evidence: JSON
}

type ERDecision {
  id: ID!
  matchScore: ERMatchScore!
  decision: ERDecisionType!
  decisionMethod: String!
  decidedBy: String
  decidedAt: DateTime!
  notes: String
  reviewRequired: Boolean!
  entityType: CanonicalEntityType!
}

enum ERDecisionType {
  MERGE
  NO_MERGE
  DEFER
  SPLIT
}

type ERReviewQueueItem {
  id: ID!
  matchScore: ERMatchScore!
  status: ERReviewStatus!
  priority: Priority!
  assignedTo: String
  dueAt: DateTime
  createdAt: DateTime!
  entityASnapshot: JSON!
  entityBSnapshot: JSON!
  conflictingAttributes: [String!]!
  sharedRelationships: Int!
}

enum ERReviewStatus {
  PENDING
  IN_REVIEW
  DECIDED
  ESCALATED
}

# Queries
extend type Query {
  # ER review queue
  erReviewQueue(
    status: ERReviewStatus
    entityType: CanonicalEntityType
    assignedTo: String
    limit: Int = 50
    offset: Int = 0
  ): [ERReviewQueueItem!]!

  # ER decision history
  erDecisions(
    entityId: ID
    entityType: CanonicalEntityType
    fromDate: DateTime
    toDate: DateTime
    limit: Int = 100
  ): [ERDecision!]!

  # ER metrics
  erPrecisionMetrics(
    entityType: CanonicalEntityType
    modelVersion: String
  ): ERPrecisionMetrics!

  # Resolution clusters
  resolutionCluster(id: ID!): ResolutionCluster
  resolutionClusters(
    entityType: CanonicalEntityType
    minSize: Int
    limit: Int = 50
  ): [ResolutionCluster!]!
}

# Mutations
extend type Mutation {
  # ER review actions
  erReviewDecide(
    reviewItemId: ID!
    decision: ERDecisionType!
    notes: String
  ): ERDecision!

  # Manual ER triggering
  erResolvePair(
    entityAId: ID!
    entityBId: ID!
  ): ERMatchScore!

  # Cluster management
  erMergeEntities(
    masterEntityId: ID!
    duplicateEntityIds: [ID!]!
    notes: String
  ): ResolutionCluster!

  erSplitCluster(
    clusterId: ID!
    entityIdsToSplit: [ID!]!
    reason: String!
  ): [ResolutionCluster!]!

  # Revert merge
  erRevertMerge(
    clusterId: ID!
    reason: String!
  ): [Entity!]!
}

type ERPrecisionMetrics {
  entityType: CanonicalEntityType!
  totalDecisions: Int!
  mergeDecisions: Int!
  noMergeDecisions: Int!
  uncertainDecisions: Int!
  precision: Float!
  avgMergeConfidence: Float!
  avgRiskScore: Float!
  reviewsRequired: Int!
  modelVersion: String!
  lastUpdated: DateTime!
}

type ResolutionCluster {
  id: ID!
  tenantId: String!
  entityIds: [ID!]!
  canonicalEntity: Entity!
  resolution: ResolutionMetadata!
  evidence: [ResolutionEvidence!]!
  conflicts: [AttributeConflict!]!
  audit: ClusterAudit!
}

type ResolutionMetadata {
  method: String!
  algorithm: String!
  features: [String!]!
  threshold: Float!
  confidence: Float!
}

type ResolutionEvidence {
  type: String!
  strength: Float!
  details: JSON!
}

type AttributeConflict {
  attribute: String!
  values: [ConflictValue!]!
  resolution: String!
  resolvedValue: JSON
}

type ConflictValue {
  entityId: ID!
  value: JSON!
  confidence: Float!
}

type ClusterAudit {
  createdAt: DateTime!
  lastUpdated: DateTime!
  reviewedBy: String
  approvedBy: String
  version: Int!
  revertible: Boolean!
  revertedFrom: ID
}
```

### 5.2 Neo4j Schema Migrations

**File:** `migrations/neo4j/003_canonical_entities.cypher` (NEW)

```cypher
// Add new entity type values to existing Entity nodes
// (Entities will gradually adopt new types via connectors)

// Create constraint for ResolutionCluster nodes
CREATE CONSTRAINT resolution_cluster_id IF NOT EXISTS
FOR (rc:ResolutionCluster) REQUIRE rc.id IS UNIQUE;

// Create constraint for canonical ID
CREATE INDEX entity_canonical_id IF NOT EXISTS
FOR (e:Entity) ON (e.canonicalId, e.tenantId);

// Create indexes for policy labels
CREATE INDEX entity_sensitivity IF NOT EXISTS
FOR (e:Entity) ON (e.sensitivity);

CREATE INDEX entity_clearance IF NOT EXISTS
FOR (e:Entity) ON (e.clearance);

CREATE INDEX entity_retention_class IF NOT EXISTS
FOR (e:Entity) ON (e.retentionClass);

// Temporal indexes
CREATE INDEX entity_valid_from IF NOT EXISTS
FOR (e:Entity) ON (e.validFrom);

CREATE INDEX entity_valid_to IF NOT EXISTS
FOR (e:Entity) ON (e.validTo);

// Relationship indexes for new types
CREATE INDEX rel_supports IF NOT EXISTS
FOR ()-[r:SUPPORTS]-() ON (r.confidence);

CREATE INDEX rel_authorized_by IF NOT EXISTS
FOR ()-[r:AUTHORIZED_BY]-() ON (r.validFrom, r.validTo);

CREATE INDEX rel_precedes IF NOT EXISTS
FOR ()-[r:PRECEDES]-() ON (r.since);

// Add ResolutionCluster node type
// (Will be created dynamically by ER service)
```

### 5.3 PostgreSQL Migrations

**File:** `server/db/migrations/postgres/2025-11-20_canonical_schema.sql` (NEW)

```sql
-- Extend existing entities table with canonical schema fields
ALTER TABLE entities ADD COLUMN IF NOT EXISTS canonical_id UUID;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE entities ADD COLUMN IF NOT EXISTS policy_labels JSONB;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS provenance JSONB;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS entities_canonical_id_idx ON entities(canonical_id);
CREATE INDEX IF NOT EXISTS entities_valid_from_idx ON entities(valid_from);
CREATE INDEX IF NOT EXISTS entities_policy_labels_gin ON entities USING GIN(policy_labels);

-- Extend relationships table
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS policy_labels JSONB;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS provenance JSONB;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS directed BOOLEAN DEFAULT TRUE;

-- ER review queue table
CREATE TABLE IF NOT EXISTS er_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_id UUID NOT NULL,
  entity_b_id UUID NOT NULL,
  match_score JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_REVIEW', 'DECIDED', 'ESCALATED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_to UUID REFERENCES users(id),
  due_at TIMESTAMPTZ,
  entity_a_snapshot JSONB NOT NULL,
  entity_b_snapshot JSONB NOT NULL,
  conflicting_attributes TEXT[],
  shared_relationships INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('MERGE', 'NO_MERGE', 'DEFER', 'SPLIT')),
  notes TEXT
);

CREATE INDEX er_review_queue_status_idx ON er_review_queue(status, priority);
CREATE INDEX er_review_queue_assigned_idx ON er_review_queue(assigned_to);
CREATE INDEX er_review_queue_created_idx ON er_review_queue(created_at);

-- Resolution clusters table
CREATE TABLE IF NOT EXISTS resolution_clusters (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  canonical_entity_id UUID NOT NULL REFERENCES entities(id),
  resolution JSONB NOT NULL,
  evidence JSONB,
  conflicts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  version INT DEFAULT 1,
  revertible BOOLEAN DEFAULT TRUE,
  reverted_from UUID REFERENCES resolution_clusters(id)
);

CREATE INDEX resolution_clusters_tenant_idx ON resolution_clusters(tenant_id);
CREATE INDEX resolution_clusters_entity_ids_idx ON resolution_clusters USING GIN(entity_ids);
CREATE INDEX resolution_clusters_canonical_idx ON resolution_clusters(canonical_entity_id);

-- ER thresholds configuration table
CREATE TABLE IF NOT EXISTS er_thresholds (
  entity_type TEXT PRIMARY KEY,
  auto_merge_threshold NUMERIC(5,4) NOT NULL,
  manual_review_threshold NUMERIC(5,4) NOT NULL,
  reject_threshold NUMERIC(5,4) NOT NULL,
  target_precision NUMERIC(5,4) NOT NULL,
  current_precision NUMERIC(5,4),
  sample_size INT DEFAULT 0,
  last_calibrated TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize default thresholds (from resolvers.er.ts)
INSERT INTO er_thresholds (entity_type, auto_merge_threshold, manual_review_threshold, reject_threshold, target_precision, current_precision)
VALUES
  ('PERSON', 0.90, 0.70, 0.70, 0.90, NULL),
  ('ORGANIZATION', 0.88, 0.70, 0.70, 0.88, NULL),
  ('LOCATION', 0.85, 0.65, 0.65, 0.85, NULL),
  ('ASSET', 0.82, 0.65, 0.65, 0.82, NULL)
ON CONFLICT (entity_type) DO NOTHING;

-- Function to compute current precision
CREATE OR REPLACE FUNCTION compute_er_precision(p_entity_type TEXT, p_days_back INT DEFAULT 30)
RETURNS TABLE(
  entity_type TEXT,
  current_precision NUMERIC,
  sample_size INT,
  meets_threshold BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    md.entity_type,
    CASE
      WHEN COUNT(*) FILTER (WHERE md.decision = 'MERGE') > 0 THEN
        COUNT(*) FILTER (WHERE md.decision = 'MERGE' AND md.confidence >= 0.8)::NUMERIC /
        COUNT(*) FILTER (WHERE md.decision = 'MERGE')::NUMERIC
      ELSE NULL
    END AS current_precision,
    COUNT(*)::INT AS sample_size,
    CASE
      WHEN COUNT(*) >= 100 THEN
        (COUNT(*) FILTER (WHERE md.decision = 'MERGE' AND md.confidence >= 0.8)::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE md.decision = 'MERGE'), 0)::NUMERIC) >=
        (SELECT target_precision FROM er_thresholds WHERE entity_type = p_entity_type)
      ELSE FALSE
    END AS meets_threshold
  FROM merge_decisions md
  WHERE md.entity_type = p_entity_type
    AND md.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY md.entity_type;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Implementation Roadmap

### Phase 1: Canonical Schema Foundation (Week 1-2)
- [ ] Create `packages/canonical-schema` package
- [ ] Implement base types (CanonicalEntityBase, CanonicalRelationship)
- [ ] Implement 23 entity type specializations
- [ ] Create GraphQL codegen scripts
- [ ] Write schema validation tests

### Phase 2: Database Migrations (Week 2-3)
- [ ] Run PostgreSQL migrations (canonical fields, ER tables)
- [ ] Run Neo4j migrations (new constraints, indexes)
- [ ] Update EntityRepo to use canonical types
- [ ] Backward compatibility layer for existing entities

### Phase 3: ER Pipeline Core (Week 3-5)
- [ ] Implement ERCandidateService (blocking)
- [ ] Implement ERScoringService (feature extraction)
- [ ] Implement ERDecisionService (threshold routing)
- [ ] Implement ERMergeService (provenance-aware merge)
- [ ] Create Redis job queue for async ER

### Phase 4: ER Examples & Testing (Week 5-6)
- [ ] Complete Person ER example
- [ ] Complete Organization ER example
- [ ] Write unit tests for feature extractors
- [ ] Write integration tests for full pipeline
- [ ] Create golden fixture datasets

### Phase 5: Review Queue UI (Week 6-7)
- [ ] GraphQL resolvers for ER queries/mutations
- [ ] React components for review queue
- [ ] Side-by-side entity comparison view
- [ ] Feature scorecard visualization
- [ ] Merge/split/defer actions

### Phase 6: Metrics & Observability (Week 7-8)
- [ ] ERMetricsService implementation
- [ ] Precision tracking dashboard
- [ ] Alert thresholds for precision drift
- [ ] CI/CD integration (precision gates)
- [ ] Grafana dashboards for ER KPIs

### Phase 7: Documentation & Training (Week 8)
- [ ] User guide for ER review queue
- [ ] Developer guide for adding entity types
- [ ] Runbooks for ER operations
- [ ] Demo video and walkthrough

---

## 7. Acceptance Criteria

### AC-1: Schema Coherence
- [ ] All 23 Wishbook entity types defined in canonical schema
- [ ] GraphQL, Neo4j, and PostgreSQL schemas generated from canonical
- [ ] Zero divergence between schema layers (validated by tests)

### AC-2: ER Explainability
- [ ] Every merge decision includes feature-level scores and explanations
- [ ] Scorecard UI shows human-readable rationales
- [ ] Provenance chain tracks all ER decisions

### AC-3: ER Precision (GA Requirement)
- [ ] Person ER precision >= 90% (100+ sample decisions)
- [ ] Organization ER precision >= 88%
- [ ] Location ER precision >= 85%
- [ ] Asset ER precision >= 82%

### AC-4: Manual Review Queue
- [ ] Review queue UI functional with filtering and assignment
- [ ] Analysts can approve/reject/defer merge candidates
- [ ] Full undo/revert capability for merged clusters

### AC-5: Performance
- [ ] ER scoring for 1,000 candidate pairs completes in < 60 seconds
- [ ] Review queue loads in < 2 seconds for 100 items
- [ ] Merge execution completes in < 5 seconds per cluster

### AC-6: Provenance Integrity
- [ ] Every ResolutionCluster has complete audit trail
- [ ] Merge history is revertible
- [ ] Export manifests include ER provenance

---

## 8. Open Questions & Risks

### Q1: AML Entity Resolver Integration
**Question:** Should we merge the AML entity resolver types with canonical schema or keep them specialized?
**Recommendation:** Keep AML specialized but create adapters to/from canonical types.

### Q2: Threshold Calibration Frequency
**Question:** How often should we recalibrate ER thresholds?
**Recommendation:** Weekly for first month, then monthly once stable.

### Q3: Cross-Tenant ER
**Question:** Should ER run across tenants for federation use cases?
**Recommendation:** GA feature only, with explicit consent and hashed identifiers.

### Risk-1: Schema Migration Breaking Changes
**Mitigation:** Comprehensive backward compatibility layer; phased rollout; feature flags.

### Risk-2: ER False Positives
**Mitigation:** Conservative thresholds initially; manual review queue; full revert capability.

### Risk-3: Performance Degradation
**Mitigation:** Redis job queue for async ER; batch processing; cached embeddings.

---

## 9. References

- **PRD:** `/home/user/summit/october2025/intel_graph_summit_mvp_2_ga_prd_full_360.md`
- **Wishbook:** `/home/user/summit/docs/ChatOps/council_feature_use_case_wishbook_final_product.md`
- **Current Schema:** `/home/user/summit/server/src/graphql/schema/crudSchema.ts`
- **AML ER:** `/home/user/summit/services/aml/src/entity-resolver.ts`
- **Neo4j ER:** `/home/user/summit/server/src/services/EntityResolutionService.ts`
- **Python ML ER:** `/home/user/summit/ml/er/pipeline.py`

---

**Next Steps:** Review this design doc with team, approve approach, begin Phase 1 implementation.
