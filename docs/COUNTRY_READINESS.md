# Country Readiness Matrix

This document defines the explicit requirements for Summit to operate in specific countries.
No country is implicitly supported. Expansion requires validating these constraints against the `RegionalConfig`.

## Supported Countries

| Country | Code | Residency Requirement | Privacy Law | Retention Limit | Support SLA | Status  |
| ------- | ---- | --------------------- | ----------- | --------------- | ----------- | ------- |
| USA     | US   | US-East/West          | CCPA/Varies | 7 Years         | 24/7        | Live    |
| Germany | DE   | EU (Frankfurt)        | GDPR        | 10 Years        | 9-5 CET     | Pilot   |
| UK      | UK   | UK (London)           | UK GDPR     | 7 Years         | 9-5 BST     | Planned |

## Requirement Definitions

### 1. Data Residency & Sovereignty

- **Constraints**: Where must data be stored? Is cross-border transfer allowed?
- **Control**: `RegionalConfig.residency.region` and `RegionalConfig.residency.allowed_transfer_targets`.

### 2. Privacy Requirements

- **Constraints**: Consent collection, Right to be Forgotten (RTBF), Export rights.
- **Control**: `RegionalConfig.privacy.requires_consent` and `DataLifecycleService`.

### 3. Availability Expectations

- **Constraints**: Uptime guarantees, maintenance windows.
- **Control**: `RegionalConfig.sla.uptime_target` and `RegionalConfig.maintenance_window`.

### 4. Support Hours & Escalation

- **Constraints**: Local language support, response times.
- **Control**: `RegionalConfig.support.hours` and `SupportRouter`.

## Gap Analysis

| Requirement  | Gap                         | Owner |
| ------------ | --------------------------- | ----- |
| DE Support   | Need German-speaking L1     | Ops   |
| UK Residency | No dedicated UK cluster yet | Infra |
