# AgentPlace Data Handling & Classification

## Overview
This document outlines the data handling policies for the AgentPlace module within Summit. All agents must declare their data classification requirements in their manifest.

## Data Classification Levels
- **Public**: Data intended for public consumption. No restrictions.
- **Internal**: Data for internal use only. Not to be shared externally without authorization.
- **Confidential**: Sensitive information. Requires explicit access controls.
- **Restricted**: Highly sensitive data. Access is denied by default and requires high-level governance approval.

## Never Log Policy
The following fields MUST NEVER be logged by the AgentPlace evaluator or any associated runtime:
- API keys
- OAuth tokens
- User PII (Personally Identifiable Information) fields
- External service credentials

## Retention
- Evaluation reports (`report.json`) are stored for 30 days.
- Audit logs are retained for 1 year per compliance requirements.
