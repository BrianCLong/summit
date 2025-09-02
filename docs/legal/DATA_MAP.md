# Data Map and Retention Summary

This document provides an overview of the data stored by [Company Name]'s platform, including its location, retention periods, and associated processors.

## 1. Data Categories and Storage Locations

| Data Category           | Description                                     | Storage Location(s) | Processors (if applicable) |
| :---------------------- | :---------------------------------------------- | :------------------ | :------------------------- |
| **User Profile Data**   | Usernames, email addresses, roles               | PostgreSQL          | Authentication Service     |
| **Run Metadata**        | Details of Maestro runs, pipelines, status      | PostgreSQL          | Orchestration Service      |
| **Logs (Operational)**  | System logs, application logs                   | Loki, S3            | Logging Service            |
| **Evidence (WORM)**     | Immutable records, audit trails, provider DPAs  | S3 (WORM bucket)    | Audit Service              |
| **Artifacts (Builds)**  | Build outputs, deployment packages              | S3                  | CI/CD Pipeline             |
| **PII Cache**           | Temporary PII for processing (e.g., for masking) | Redis               | PII Masking Service        |
| **Telemetry Data**      | Usage metrics, performance data                 | Prometheus, Grafana | Monitoring Service         |

## 2. Data Retention Summary

Our data retention policies are designed to comply with legal and regulatory requirements while minimizing data storage. For detailed retention periods, please refer to our [Data Retention Policy](./DATA_RETENTION_POLICY.md).

## 3. Data Processors

We engage various third-party data processors to provide our services. A list of our primary data processors and their respective Data Processing Addendums (DPAs) can be found in the [Provider DPA Registry](./PROVIDER_DPA_REGISTRY.md).

## 4. Data Flow Overview

[Conceptual diagram or description of data flow, e.g., UI -> Gateway -> Backend Services -> Databases/Storage -> External APIs]

## 5. Cross-linking to Related Documentation

- **Data Retention Policy**: For detailed retention periods and disposal procedures.
- **Provider DPA Registry**: For information on third-party data processors.
- **TLS Policy**: For details on encryption in transit and at rest.
- **CIS Controls Checklist**: For security control implementation details.
