# Global Data Trading and Reuse Platform

> **Version**: 1.0.0
> **Status**: Design Complete
> **Last Updated**: 2025-11-21

## Executive Summary

A secure, scalable marketplace enabling seamless public/private sector data sharing, trading, and reuse with built-in consent management, privacy controls, and automated compliance/risk scoring.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Models](#data-models)
5. [Security & Privacy](#security--privacy)
6. [Compliance Framework](#compliance-framework)
7. [API Design](#api-design)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Vision & Goals

### Primary Objectives

1. **Seamless Data Exchange**: Enable frictionless discovery, negotiation, and transfer of datasets
2. **Trust & Transparency**: Built-in provenance tracking and seller verification
3. **Privacy-First**: Consent management, differential privacy, and data anonymization
4. **Automated Compliance**: Risk scoring, regulatory checks (GDPR, CCPA, HIPAA)
5. **Global Scalability**: Multi-region, multi-currency, federated architecture

### Key Differentiators

- **Automated Risk Scoring**: ML-powered assessment of data sensitivity and compliance risk
- **Smart Contracts**: Blockchain-anchored usage agreements with automated enforcement
- **Data Lineage**: Complete chain-of-custody from source to consumer
- **Federated Search**: Query across multiple data providers without centralized storage

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA MARKETPLACE PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │  Mobile App │  │   API SDK   │  │  Partner Portals    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │           │
│  ┌──────┴────────────────┴────────────────┴─────────────────────┴─────────┐ │
│  │                         API GATEWAY (GraphQL + REST)                   │ │
│  │         Rate Limiting | Auth | Caching | Load Balancing                │ │
│  └────────────────────────────────┬───────────────────────────────────────┘ │
│                                   │                                         │
│  ┌────────────────────────────────┴───────────────────────────────────────┐ │
│  │                         CORE SERVICES LAYER                            │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │  Catalog    │ │ Transaction │ │   Access    │ │   Compliance    │   │ │
│  │  │  Service    │ │   Service   │ │   Control   │ │    Engine       │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │  Consent    │ │    Risk     │ │   Pricing   │ │    Analytics    │   │ │
│  │  │  Manager    │ │   Scorer    │ │   Engine    │ │    Service      │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         DATA LAYER                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │ PostgreSQL│  │  Neo4j   │  │  Redis   │  │ S3/Blob  │  │ Blockchain│ │ │
│  │  │ Metadata │  │ Lineage  │  │  Cache   │  │ Storage  │  │  Ledger   │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Architecture

| Service | Responsibility | Tech Stack |
|---------|---------------|------------|
| **Catalog Service** | Dataset discovery, search, metadata | GraphQL, Elasticsearch |
| **Transaction Service** | Purchase flow, payments, settlements | PostgreSQL, Stripe |
| **Access Control** | Permissions, tokens, usage limits | OPA, Redis |
| **Compliance Engine** | Regulatory checks, certifications | Python ML, Rules Engine |
| **Consent Manager** | User consent, preferences, DSAR | PostgreSQL, Event Sourcing |
| **Risk Scorer** | Sensitivity analysis, PII detection | ML Pipeline, NLP |
| **Pricing Engine** | Dynamic pricing, negotiations | PostgreSQL, Redis |
| **Analytics Service** | Usage metrics, reporting | TimescaleDB, Grafana |

---

## Core Components

### 1. Data Product Catalog

```typescript
interface DataProduct {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: DataCategory;
  tags: string[];

  // Metadata
  schema: DataSchema;
  sampleData?: string; // Anonymized preview
  rowCount: number;
  lastUpdated: Date;
  updateFrequency: UpdateFrequency;

  // Quality & Trust
  qualityScore: number; // 0-100
  completeness: number;
  accuracy: number;
  freshness: number;
  providerVerified: boolean;

  // Compliance
  riskScore: RiskScore;
  dataClassification: Classification;
  piiFields: string[];
  regulations: Regulation[];
  certifications: string[];

  // Pricing
  pricingModel: PricingModel;
  basePrice: Money;
  usageTiers?: UsageTier[];

  // Access
  deliveryMethods: DeliveryMethod[];
  accessTypes: AccessType[];
  geographicRestrictions?: string[];
}
```

### 2. Consent Management

```typescript
interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  dataProductId: string;
  providerId: string;

  // Consent Details
  purposes: ConsentPurpose[];
  scope: ConsentScope;
  grantedAt: Date;
  expiresAt?: Date;

  // Revocation
  revocable: boolean;
  revokedAt?: Date;
  revocationReason?: string;

  // Audit
  consentMethod: 'explicit' | 'opt-in' | 'contractual';
  evidenceHash: string; // Blockchain anchored
  version: number;
}

enum ConsentPurpose {
  ANALYTICS = 'analytics',
  RESEARCH = 'research',
  MARKETING = 'marketing',
  AI_TRAINING = 'ai_training',
  RESALE = 'resale',
  INTERNAL_USE = 'internal_use'
}
```

### 3. Risk Scoring Engine

```typescript
interface RiskAssessment {
  dataProductId: string;
  assessedAt: Date;

  // Overall Score (0-100, higher = more risk)
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  // Component Scores
  piiScore: number;         // Personal data exposure
  sensitivityScore: number;  // Data sensitivity
  regulatoryScore: number;   // Regulatory complexity
  reputationScore: number;   // Provider reputation
  technicalScore: number;    // Security controls

  // Findings
  piiDetected: PIIFinding[];
  complianceGaps: ComplianceGap[];
  recommendations: string[];

  // Automated Checks
  automatedChecks: {
    name: string;
    passed: boolean;
    details: string;
  }[];
}

interface PIIFinding {
  fieldName: string;
  piiType: PIIType;
  confidence: number;
  recommendation: 'mask' | 'encrypt' | 'remove' | 'consent_required';
}
```

### 4. Transaction & Settlement

```typescript
interface DataTransaction {
  id: string;
  buyerId: string;
  sellerId: string;
  dataProductId: string;

  // Pricing
  agreedPrice: Money;
  platformFee: Money;
  sellerPayout: Money;
  currency: string;

  // Terms
  licenseType: LicenseType;
  usageTerms: UsageTerms;
  duration?: Duration;

  // Status
  status: TransactionStatus;
  createdAt: Date;
  completedAt?: Date;

  // Delivery
  deliveryMethod: DeliveryMethod;
  accessCredentials?: EncryptedCredentials;
  downloadUrl?: string;
  expiresAt?: Date;

  // Audit
  consentVerified: boolean;
  complianceChecked: boolean;
  contractHash: string; // Blockchain anchored
}

enum TransactionStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_RECEIVED = 'payment_received',
  COMPLIANCE_CHECK = 'compliance_check',
  PREPARING_DATA = 'preparing_data',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}
```

---

## Data Models

### PostgreSQL Schema

```sql
-- Core marketplace tables
CREATE TABLE data_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'individual', 'organization', 'government'
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  rating DECIMAL(3,2),
  total_transactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES data_providers(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]',

  -- Metadata
  schema_definition JSONB NOT NULL,
  row_count BIGINT,
  size_bytes BIGINT,
  last_updated TIMESTAMPTZ,
  update_frequency VARCHAR(50),

  -- Quality
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  completeness DECIMAL(5,2),
  accuracy DECIMAL(5,2),

  -- Compliance
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20),
  classification VARCHAR(50) NOT NULL,
  pii_fields JSONB DEFAULT '[]',
  regulations JSONB DEFAULT '[]',

  -- Pricing
  pricing_model VARCHAR(50) NOT NULL,
  base_price_cents BIGINT,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES data_providers(id),
  product_id UUID NOT NULL REFERENCES data_products(id),

  -- Pricing
  agreed_price_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  seller_payout_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Terms
  license_type VARCHAR(50) NOT NULL,
  usage_terms JSONB NOT NULL,
  duration_days INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',

  -- Compliance
  consent_verified BOOLEAN DEFAULT false,
  compliance_checked BOOLEAN DEFAULT false,
  risk_accepted BOOLEAN DEFAULT false,

  -- Audit
  contract_hash VARCHAR(256),
  blockchain_tx_id VARCHAR(256),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES data_products(id),
  provider_id UUID NOT NULL REFERENCES data_providers(id),

  purposes JSONB NOT NULL,
  scope JSONB NOT NULL,

  granted_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  consent_method VARCHAR(50) NOT NULL,
  evidence_hash VARCHAR(256) NOT NULL,

  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES data_products(id),

  overall_score INTEGER NOT NULL,
  risk_level VARCHAR(20) NOT NULL,

  pii_score INTEGER,
  sensitivity_score INTEGER,
  regulatory_score INTEGER,
  reputation_score INTEGER,
  technical_score INTEGER,

  findings JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  automated_checks JSONB DEFAULT '[]',

  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_by VARCHAR(100) -- 'system' or user_id
);

-- Indexes
CREATE INDEX idx_products_provider ON data_products(provider_id);
CREATE INDEX idx_products_category ON data_products(category);
CREATE INDEX idx_products_status ON data_products(status);
CREATE INDEX idx_products_risk ON data_products(risk_level);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_consent_subject ON consent_records(data_subject_id);
```

### Neo4j Graph Model

```cypher
// Data Lineage Graph
(:DataProvider {id, name, type, verified})
  -[:OFFERS]->
(:DataProduct {id, name, category, riskLevel})
  -[:DERIVED_FROM]->
(:DataSource {id, type, origin})

(:DataProduct)
  -[:HAS_FIELD]->
(:DataField {name, type, piiType, sensitivity})

(:Transaction {id, status, amount})
  -[:PURCHASED_BY]->(:User)
  -[:SOLD_BY]->(:DataProvider)
  -[:INVOLVES]->(:DataProduct)

// Consent Graph
(:DataSubject {id})
  -[:GRANTED_CONSENT {purposes, scope, grantedAt}]->
(:DataProduct)

// Usage Tracking
(:User)
  -[:ACCESSED {timestamp, method, volume}]->
(:DataProduct)
```

---

## Security & Privacy

### Privacy Controls

| Control | Implementation |
|---------|---------------|
| **PII Detection** | ML-based scanning of all datasets |
| **Anonymization** | k-anonymity, l-diversity, differential privacy |
| **Encryption** | AES-256 at rest, TLS 1.3 in transit |
| **Access Tokens** | Short-lived JWTs with usage limits |
| **Audit Trail** | Immutable blockchain-anchored logs |
| **Data Minimization** | Field-level access control |

### Access Control Matrix

```yaml
roles:
  data_provider:
    - create:own_products
    - update:own_products
    - view:own_transactions
    - view:own_analytics

  data_consumer:
    - search:catalog
    - view:product_preview
    - purchase:products
    - download:purchased_data
    - view:own_purchases

  compliance_officer:
    - view:all_products
    - approve:high_risk_products
    - view:compliance_reports
    - manage:consent_records

  platform_admin:
    - manage:providers
    - manage:products
    - manage:transactions
    - view:platform_analytics
    - configure:risk_thresholds
```

---

## Compliance Framework

### Automated Compliance Checks

```typescript
interface ComplianceCheck {
  regulation: Regulation;
  requirements: Requirement[];
  automatedChecks: AutomatedCheck[];
}

const complianceMatrix: ComplianceCheck[] = [
  {
    regulation: 'GDPR',
    requirements: [
      { id: 'lawful_basis', description: 'Lawful basis for processing' },
      { id: 'consent', description: 'Valid consent obtained' },
      { id: 'data_minimization', description: 'Only necessary data' },
      { id: 'right_to_erasure', description: 'Deletion capability' },
      { id: 'portability', description: 'Export in standard format' }
    ],
    automatedChecks: [
      { name: 'consent_record_exists', type: 'database_check' },
      { name: 'pii_fields_documented', type: 'schema_check' },
      { name: 'retention_policy_set', type: 'config_check' },
      { name: 'dpo_contact_available', type: 'metadata_check' }
    ]
  },
  {
    regulation: 'CCPA',
    requirements: [
      { id: 'disclosure', description: 'Categories disclosed' },
      { id: 'opt_out', description: 'Opt-out mechanism' },
      { id: 'non_discrimination', description: 'Equal service' }
    ],
    automatedChecks: [
      { name: 'categories_documented', type: 'metadata_check' },
      { name: 'opt_out_link_present', type: 'ui_check' }
    ]
  },
  {
    regulation: 'HIPAA',
    requirements: [
      { id: 'phi_identified', description: 'PHI fields identified' },
      { id: 'baa_signed', description: 'BAA in place' },
      { id: 'encryption', description: 'PHI encrypted' }
    ],
    automatedChecks: [
      { name: 'phi_fields_encrypted', type: 'schema_check' },
      { name: 'baa_document_exists', type: 'document_check' }
    ]
  }
];
```

### Risk Scoring Algorithm

```typescript
function calculateRiskScore(product: DataProduct): RiskAssessment {
  const weights = {
    pii: 0.30,
    sensitivity: 0.25,
    regulatory: 0.20,
    reputation: 0.15,
    technical: 0.10
  };

  const piiScore = assessPIIRisk(product.schema, product.piiFields);
  const sensitivityScore = assessSensitivity(product.classification);
  const regulatoryScore = assessRegulatoryComplexity(product.regulations);
  const reputationScore = assessProviderReputation(product.providerId);
  const technicalScore = assessTechnicalControls(product);

  const overallScore = Math.round(
    piiScore * weights.pii +
    sensitivityScore * weights.sensitivity +
    regulatoryScore * weights.regulatory +
    reputationScore * weights.reputation +
    technicalScore * weights.technical
  );

  return {
    overallScore,
    riskLevel: getRiskLevel(overallScore),
    piiScore,
    sensitivityScore,
    regulatoryScore,
    reputationScore,
    technicalScore,
    // ... additional findings
  };
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}
```

---

## API Design

### GraphQL Schema

```graphql
type DataProduct {
  id: ID!
  provider: DataProvider!
  name: String!
  description: String
  category: DataCategory!
  tags: [String!]!

  # Metadata
  schema: DataSchema!
  sampleData: String
  rowCount: Int
  lastUpdated: DateTime
  updateFrequency: UpdateFrequency

  # Quality
  qualityScore: Int
  completeness: Float
  accuracy: Float

  # Compliance
  riskAssessment: RiskAssessment
  classification: Classification!
  regulations: [Regulation!]!

  # Pricing
  pricing: PricingInfo!

  # Access
  deliveryMethods: [DeliveryMethod!]!
  accessTypes: [AccessType!]!
}

type Query {
  # Catalog
  searchProducts(
    query: String
    category: DataCategory
    maxRiskLevel: RiskLevel
    priceRange: PriceRange
    regulations: [Regulation!]
    pagination: PaginationInput
  ): ProductSearchResult!

  product(id: ID!): DataProduct

  # Provider
  provider(id: ID!): DataProvider
  myListings: [DataProduct!]!

  # Transactions
  myPurchases(status: TransactionStatus): [Transaction!]!
  mySales(status: TransactionStatus): [Transaction!]!

  # Compliance
  complianceReport(productId: ID!): ComplianceReport!
}

type Mutation {
  # Catalog Management
  createProduct(input: CreateProductInput!): DataProduct!
  updateProduct(id: ID!, input: UpdateProductInput!): DataProduct!
  publishProduct(id: ID!): DataProduct!

  # Transactions
  initiateTransaction(
    productId: ID!
    licenseType: LicenseType!
    usageTerms: UsageTermsInput!
  ): Transaction!

  confirmPayment(transactionId: ID!, paymentDetails: PaymentInput!): Transaction!

  # Consent
  recordConsent(input: ConsentInput!): ConsentRecord!
  revokeConsent(id: ID!, reason: String): ConsentRecord!

  # Reviews
  submitReview(transactionId: ID!, rating: Int!, review: String): Review!
}

type Subscription {
  transactionUpdated(transactionId: ID!): Transaction!
  newProductInCategory(category: DataCategory!): DataProduct!
}
```

### REST Endpoints

```yaml
# Data Products
GET    /api/v1/products                    # List/search products
GET    /api/v1/products/:id                # Get product details
POST   /api/v1/products                    # Create product
PUT    /api/v1/products/:id                # Update product
POST   /api/v1/products/:id/publish        # Publish product
GET    /api/v1/products/:id/sample         # Get sample data
GET    /api/v1/products/:id/compliance     # Get compliance report

# Transactions
POST   /api/v1/transactions                # Initiate purchase
GET    /api/v1/transactions/:id            # Get transaction status
POST   /api/v1/transactions/:id/pay        # Process payment
GET    /api/v1/transactions/:id/download   # Download data

# Consent
POST   /api/v1/consent                     # Record consent
DELETE /api/v1/consent/:id                 # Revoke consent
GET    /api/v1/consent/subject/:id         # Get subject's consents

# Providers
GET    /api/v1/providers/:id               # Get provider profile
GET    /api/v1/providers/:id/products      # Get provider's products
GET    /api/v1/providers/:id/reviews       # Get provider reviews

# Risk Assessment
POST   /api/v1/risk/assess                 # Assess dataset risk
GET    /api/v1/risk/report/:productId      # Get risk report
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

- [ ] Core database schema (PostgreSQL + Neo4j)
- [ ] Data Provider registration & verification
- [ ] Basic catalog service with search
- [ ] Product listing & metadata management
- [ ] Authentication & authorization integration

### Phase 2: Compliance (Weeks 5-8)

- [ ] PII detection ML pipeline
- [ ] Risk scoring engine
- [ ] Consent management system
- [ ] Compliance check automation
- [ ] Audit logging to prov-ledger

### Phase 3: Transactions (Weeks 9-12)

- [ ] Transaction workflow engine
- [ ] Payment integration (Stripe)
- [ ] License management
- [ ] Secure data delivery
- [ ] Usage tracking

### Phase 4: Trust & Quality (Weeks 13-16)

- [ ] Provider verification workflow
- [ ] Quality scoring algorithms
- [ ] Review & rating system
- [ ] Dispute resolution
- [ ] Data lineage visualization

### Phase 5: Scale & Optimize (Weeks 17-20)

- [ ] Federated search across providers
- [ ] Dynamic pricing engine
- [ ] Advanced analytics dashboard
- [ ] Multi-region deployment
- [ ] Performance optimization

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Transaction | < 30 min | From signup to purchase |
| Compliance Check Time | < 5 sec | Automated assessment |
| Platform Availability | 99.9% | Uptime SLA |
| Data Delivery Time | < 1 min | For datasets < 1GB |
| Provider Onboarding | < 1 day | Verification complete |
| Risk Assessment Accuracy | > 95% | PII detection F1 score |

---

## Appendix

### Glossary

- **Data Product**: A packaged dataset available for purchase/licensing
- **Data Provider**: Entity offering data products on the marketplace
- **Data Consumer**: Entity purchasing/licensing data products
- **Consent**: Explicit permission from data subjects for data use
- **Risk Score**: Quantified assessment of data sensitivity (0-100)
- **Data Lineage**: Chain of custody from source to consumer

### References

- GDPR: https://gdpr.eu/
- CCPA: https://oag.ca.gov/privacy/ccpa
- HIPAA: https://www.hhs.gov/hipaa/
- Data Mesh: https://martinfowler.com/articles/data-mesh-principles.html
