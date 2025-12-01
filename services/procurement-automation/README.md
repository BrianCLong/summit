# @intelgraph/procurement-automation

Automated Government Procurement & Compliance Engine for rapid ATO and secure onboarding.

## Features

- **Requirements Parsing**: Auto-detect applicable frameworks (FedRAMP, CMMC, IL levels, etc.)
- **Form Auto-completion**: Pre-fill compliance forms with organization/system data
- **ATO Document Generation**: Generate SSP, SAR, POA&M, and other required documents
- **Compliance Tracking**: Dashboards, milestones, and checklists
- **SBOM Integration**: Analyze SBOMs for security and license compliance

## Quick Start

```typescript
import { ProcurementAutomationEngine } from '@intelgraph/procurement-automation';

const engine = new ProcurementAutomationEngine({
  organization: {
    name: 'Acme Corp',
    address: '123 Main St',
    // ... other org details
  },
  system: {
    systemName: 'MySystem',
    systemAcronym: 'MS',
    // ... other system details
  },
});

// Quick start with auto-analysis
const result = engine.quickStart({
  title: 'FedRAMP Authorization',
  description: 'Seeking FedRAMP Moderate ATO',
  frameworks: ['FedRAMP_Moderate'],
  dataClassification: 'cui',
});

console.log(result.requirements);
console.log(result.checklist);
console.log(result.timeline);
```

## Supported Frameworks

- FedRAMP (Low, Moderate, High)
- StateRAMP
- DoD IL2, IL4, IL5, IL6
- FISMA
- CMMC (L1, L2, L3)
- NIST 800-53, 800-171
- CJIS, ITAR
- SOC 2, HIPAA

## API Reference

### ProcurementAutomationEngine

Main orchestrator providing unified access to all features.

### RequirementsParser

Parse procurement requirements from text or structured input.

### FormAutoCompleteEngine

Auto-fill compliance forms with organization and system data.

### ATODocumentGenerator

Generate ATO package documents (SSP, SAR, POA&M, etc.).

### ComplianceTracker

Track compliance progress with milestones and dashboards.

### SBOMIntegration

Analyze SBOMs for vulnerability and license compliance.
