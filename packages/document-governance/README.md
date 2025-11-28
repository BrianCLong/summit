# @intelgraph/document-governance

Business Document Ontology and Governance Framework for Summit/IntelGraph/CompanyOS.

## Overview

This package provides comprehensive document governance capabilities for enterprise document management, including:

- **Document Type Ontology**: 50+ pre-defined business document types across categories (Corporate Governance, Finance, HR, Legal, Product, Engineering, Operations, Security, AI/ML, Compliance)
- **Lifecycle State Management**: Configurable state machines for different document types with approval workflows
- **Multi-dimensional Risk Scoring**: Six-dimension risk assessment (legal, financial, security, operational, regulatory, reputational)
- **Compliance Validation**: Built-in mappings for SOC2, ISO27001, GDPR, CCPA, SOX, HIPAA, PCI-DSS, NIST, EU AI Act
- **AI Provenance Tracking**: Full chain-of-custody for AI-assisted document creation
- **Document Relationships**: Graph-based relationship management (GOVERNS, DERIVES_FROM, REQUIRES, etc.)

## Installation

```bash
pnpm add @intelgraph/document-governance
```

## Quick Start

```typescript
import neo4j from 'neo4j-driver';
import { DocumentGovernanceManager } from '@intelgraph/document-governance';

// Initialize the driver
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

// Create the governance manager
const governance = new DocumentGovernanceManager(driver);

// Create a new document
const document = await governance.createDocument({
  document_type_id: 'doc.msa',
  title: 'Master Services Agreement - Acme Corp',
  classification: 'Confidential',
  owner_id: 'user-123',
  owner_department: 'Legal',
}, 'user-123');

// Check available lifecycle transitions
const transitions = await governance.getLifecycleEngine()
  .getAvailableTransitions(document.id);

// Request a state transition
const result = await governance.getLifecycleEngine()
  .requestTransition({
    document_id: document.id,
    target_state: 'Negotiation',
    comment: 'Starting negotiation with counterparty'
  }, 'user-123');

// Calculate risk score
const riskScore = await governance.getRiskScoringService()
  .calculateRiskScore({ document_id: document.id });

// Run compliance check
const compliance = await governance.getComplianceService()
  .checkCompliance(document.id);
```

## Document Types

The ontology includes 50+ document types organized by category:

### Corporate Governance
- Articles of Incorporation
- Operating Agreement
- Bylaws
- Board Minutes
- Board Resolutions
- Shareholder Agreements

### Finance
- General Ledger
- Financial Statements
- Invoices (Customer/Vendor)
- Budgets

### HR
- Employment Agreements
- Offer Letters
- Employee Handbook
- Performance Reviews

### Legal
- NDAs (Mutual/Unilateral)
- Master Services Agreements
- Statements of Work
- Data Processing Agreements
- Privacy Policy
- Terms of Service

### Product & Engineering
- Product Requirements Documents
- Technical Specifications
- Architecture Decision Records
- Product Roadmaps

### Operations & SRE
- Runbooks
- Incident Postmortems
- Change Requests

### Security & Compliance
- Security Policy
- Access Control Policy
- Incident Response Plan
- Business Continuity Plan
- Disaster Recovery Plan
- Vulnerability Assessments
- Penetration Test Reports
- SBOMs

### AI/ML Governance
- Model Cards
- Dataset Cards
- Model Evaluation Reports

## Lifecycle Management

Each document type has a defined lifecycle with states and transitions:

```typescript
// Get lifecycle definition
const lifecycle = governance.getLifecycleEngine()
  .getLifecycleDefinition('Contract');

// Available states: Draft, Negotiation, PendingApproval, Approved,
//                   Executed, Active, Expired, Terminated, Superseded, Archived

// Request transition with approval workflow
const result = await governance.getLifecycleEngine()
  .requestTransition({
    document_id: docId,
    target_state: 'PendingApproval'
  }, userId);

if (result.requires_approval) {
  // Handle approval workflow
  const approvalResult = await governance.getLifecycleEngine()
    .processApproval(result.approval_request_id!, 'approved', approverId);
}
```

## Risk Scoring

Multi-dimensional risk assessment with configurable weights:

```typescript
const riskScore = await governance.getRiskScoringService()
  .calculateRiskScore({ document_id: docId });

// Result includes:
// - dimension_scores: { legal, financial, security, operational, regulatory, reputational }
// - weighted_score: 0-10
// - risk_level: 'Low' | 'Medium' | 'High' | 'Critical'
// - modifiers_applied: classification level, external facing, etc.
```

## Compliance Validation

Check documents against compliance standards:

```typescript
const compliance = await governance.getComplianceService()
  .checkCompliance(documentId);

// Result includes:
// - applicable_standards: ['ISO27001', 'SOC2', ...]
// - section_results: per-section compliance status
// - missing_sections: required sections not found
// - risk_issues: identified compliance gaps
// - score: 0-100 compliance score
```

## AI Provenance

Track AI-assisted document creation:

```typescript
// Create provenance record
await governance.getProvenanceService().createProvenance(documentId, {
  created_by: 'hybrid',
  ai_model: 'claude-3-sonnet',
  source_documents: ['doc.prd'],
  retrieval_augmented: true,
  sign_off_required: true
});

// Record human review
await governance.getProvenanceService().recordHumanReview(
  documentId,
  'reviewer-123',
  'TechLead',
  'Reviewed and approved with minor edits'
);

// Record sign-off
await governance.getProvenanceService().recordSignOff(
  documentId,
  'approver-456',
  'CISO'
);
```

## Document Relationships

Create and query document relationships:

```typescript
// Create relationship
await governance.createRelationship(
  sourceDocId,
  targetDocId,
  'rel.GOVERNS',
  userId,
  'MSA governs this SOW'
);

// Query relationships
const relationships = await governance.getDocumentRelationships(
  documentId,
  'both' // 'outgoing' | 'incoming' | 'both'
);
```

## Neo4j Migration

Run the migration to set up constraints, indexes, and seed data:

```bash
# Set environment variables
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password

# Run migration
pnpm migrate
```

## GraphQL API

The package includes a complete GraphQL schema. Import and use with your Apollo Server:

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

const typeDefs = readFileSync(
  resolve(__dirname, 'node_modules/@intelgraph/document-governance/src/graphql/schema.graphql'),
  'utf-8'
);
```

## Configuration

### Ontology Files

The ontology is defined in YAML and JSON files in the `ontology/` directory:

- `document-ontology.json` - Complete canonical ontology
- `documents.yaml` - Document type definitions
- `relationships.yaml` - Relationship type definitions
- `lifecycles.yaml` - Lifecycle state machines
- `classifications.yaml` - Classification levels
- `compliance.yaml` - Compliance standard mappings
- `risk-model.yaml` - Risk scoring configuration

### Templates

Document templates are available in `src/templates/`:

- `prd.md` - Product Requirements Document
- `incident-postmortem.md` - Incident Postmortem
- `model-card.md` - AI/ML Model Card

## API Reference

### DocumentGovernanceManager

Main orchestrator for document governance operations.

| Method | Description |
|--------|-------------|
| `createDocument(input, userId)` | Create a new document |
| `getDocument(id)` | Get document by ID |
| `searchDocuments(query)` | Search documents |
| `createRelationship(...)` | Create document relationship |
| `getDocumentRelationships(...)` | Get document relationships |
| `getLifecycleEngine()` | Access lifecycle service |
| `getRiskScoringService()` | Access risk scoring service |
| `getComplianceService()` | Access compliance service |
| `getProvenanceService()` | Access provenance service |

### LifecycleEngine

| Method | Description |
|--------|-------------|
| `getLifecycleDefinition(type)` | Get lifecycle definition |
| `getAvailableTransitions(docId)` | Get available transitions |
| `requestTransition(request, userId)` | Request state transition |
| `processApproval(...)` | Process approval decision |
| `getLifecycleHistory(docId)` | Get transition history |

### RiskScoringService

| Method | Description |
|--------|-------------|
| `calculateRiskScore(request)` | Calculate risk score |
| `getRiskScore(docId)` | Get existing risk score |
| `getHighRiskDocuments(minLevel)` | Get high-risk documents |
| `getRiskDimensions()` | Get risk dimensions |
| `getRiskThresholds()` | Get risk thresholds |

### ComplianceService

| Method | Description |
|--------|-------------|
| `checkCompliance(docId)` | Run compliance check |
| `getComplianceStandards()` | Get all standards |
| `getApplicableStandards(typeId)` | Get applicable standards |
| `createAuditFinding(...)` | Create audit finding |
| `getAuditFindings(docId)` | Get audit findings |
| `generateComplianceReport(...)` | Generate compliance report |

### ProvenanceService

| Method | Description |
|--------|-------------|
| `createProvenance(docId, metadata)` | Create provenance record |
| `getProvenance(docId)` | Get provenance metadata |
| `addAIAssistSession(...)` | Add AI session |
| `recordHumanReview(...)` | Record human review |
| `recordSignOff(...)` | Record sign-off |
| `recordLineage(...)` | Record data lineage |
| `generateProvenanceReport(docId)` | Generate full report |

## License

UNLICENSED - Proprietary
