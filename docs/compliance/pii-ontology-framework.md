# PII Ontology Mapping System

## Overview

The PII Ontology Mapping System provides automated detection, contextual classification, and governance workflows for personally identifiable information (PII) across the IntelGraph platform. The engine combines deterministic pattern recognition, adaptive machine learning signals, and deep regulatory mappings to maintain compliance with GDPR, CCPA, and HIPAA.

## Core Capabilities

- **Hybrid Detection Pipeline**
  - Configurable pattern registry with weighted confidence boosts.
  - Feature-driven ML signaler that learns from positive and negative samples.
  - Contextual classifier that elevates sensitivity based on field semantics, business tags, and lineage annotations.
- **Regulatory Taxonomy Mapping**
  - Native coverage for GDPR (Articles 6, 32, 33), CCPA (1798.100, 1798.110, 1798.115), and HIPAA (164.306, 164.308, 164.502).
  - Automatic aggregation of obligations and recommended controls per framework.
  - Validation engine that reports framework-specific coverage gaps.
- **Metadata & Lineage Enrichment**
  - Deterministic lineage reconstruction for every detected entity, including systems, collections, and transformation steps.
  - Risk scoring calibrated by ML confidence, contextual weight, and regulatory breadth.
  - Control catalog with encryption, RBAC, PCI, HIPAA, and credential-hardening guidance.

## Operational Workflow

1. **Training & Calibration**
   - Supply `TrainingSample` collections representing PII and non-PII values.
   - Register bespoke patterns for identifiers (SSN, Passport, National IDs), communications (email, phone), and sector-specific artifacts.
   - Run `processRecords` on baseline datasets to tune thresholds and validate signal-to-noise ratios.
2. **Continuous Classification**
   - Stream `DataRecord` batches with contextual metadata (system, field, tags, lineage, retention policy).
   - Capture `ClassificationReport` outputs for storage in compliance data stores or monitoring dashboards.
3. **Regulatory Assurance**
   - Execute `validateAgainstFrameworks` during CI/CD gates to guarantee obligation coverage prior to deployments.
   - Export `regulatorySummary` sections for audit binders and Data Protection Impact Assessments (DPIAs).

## Compliance Validation Matrix

| Framework | Required Categories                                                                      | Automated Obligations                                                 | Operational Controls                                              |
| --------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| GDPR      | Identifier, Contact, Financial, Health, Location, Biometric, Demographic, Authentication | Lawful basis tracking, minimization, DSAR enablement                  | Encryption, RBAC, access monitoring                               |
| CCPA      | Identifier, Contact, Financial, Health, Location, Demographic, Authentication            | Disclosure notices, opt-out enforcement, consumer request fulfillment | Consent auditing, preference management, deletion workflows       |
| HIPAA     | Health, Identifier, Contact, Location                                                    | Safeguards, minimum necessary use, breach readiness                   | HIPAA audit logging, restricted clinical zones, contingency plans |

## Testing & Validation

- Unit coverage for entity detection, metadata enrichment, regulatory summarization, and validation flows (`server/src/tests/piiOntologyEngine.test.ts`).
- Deterministic lineage verification across all detected entities.
- Regression hook for targeted validation across GDPR/CCPA/HIPAA to ensure CI gates fail when required categories are missing.

## Deployment Guidance

- **Thresholds:** Default detection threshold of `0.55` balances recall and precision; adjust per data domain.
- **Risk Bands:** `MEDIUM` risk at ≥0.5, `HIGH` at ≥0.65, `CRITICAL` at ≥0.85 (configurable via enrichment options).
- **Observability:** Forward `ClassificationReport` metrics to the platform telemetry pipeline; alert on spikes in newly detected categories or failed compliance validations.
- **Change Management:** Document new pattern registrations and training datasets in the compliance runbook; rerun validation matrix after schema changes.

This framework is production-ready and provides end-to-end compliance documentation for audit, privacy, and risk stakeholders.
