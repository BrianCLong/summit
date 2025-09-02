# Data Retention Matrix and Classifications

This document defines the data retention policies and classifications for various data types within the Maestro platform. Our policies are designed to comply with legal and regulatory requirements, optimize storage, and ensure data is not retained longer than necessary.

## 1. Data Classification Principles

- **Purpose Limitation**: Data is collected and retained only for specified, explicit, and legitimate purposes.
- **Storage Limitation**: Data is stored for no longer than is necessary for the purposes for which it is processed.
- **Data Minimization**: Only data that is adequate, relevant, and limited to what is necessary for the processing purposes is collected and retained.
- **Integrity and Confidentiality**: Appropriate technical and organizational measures are in place to ensure the security of data, including protection against unauthorized or unlawful processing and against accidental loss, destruction, or damage.

## 2. Data Retention Matrix

| Data Class             | Purpose                                     | System of Record | Retention (Hot/Cold) | Lawful Basis      | Deletion Method (TTL/Soft/Hard) | Owner       |
| :--------------------- | :------------------------------------------ | :--------------- | :------------------- | :---------------- | :------------------------------ | :---------- |
| **Run Metadata**       | Operational insights, debugging, historical analysis | PostgreSQL       | Hot: 180d / Cold: 1y | Legitimate Interest | TTL (soft delete)               | Platform    |
| **Node Execution Logs**| Debugging, performance analysis, audit trail | Loki / S3        | Hot: 30d / Cold: 90d | Legitimate Interest | TTL (hard delete)               | Observability |
| **Metrics**            | Performance monitoring, capacity planning   | Prometheus       | Hot: 30d / Cold: 90d | Legitimate Interest | TTL (hard delete)               | Observability |
| **CI Annotations**     | Build traceability, CI/CD history           | PostgreSQL       | 1y                   | Legitimate Interest | TTL (hard delete)               | Platform    |
| **SBOM/SLSA Evidence** | Supply chain security, compliance           | S3 (WORM)        | 7y                   | Legal Obligation    | WORM Expiry (hard delete)       | Security    |
| **Audit Logs**         | Security monitoring, compliance, forensics  | PostgreSQL / S3  | 10y                  | Legal Obligation    | Hard delete                     | Security    |
| **Router Pins/History**| Routing policy enforcement, debugging       | PostgreSQL       | 90d                  | Legitimate Interest | TTL (hard delete)               | Platform    |
| **DSAR Requests**      | Compliance with data subject rights         | Internal System  | 7y                   | Legal Obligation    | Hard delete                     | Legal       |
| **Provider DPAs**      | Legal compliance, vendor management         | S3 (WORM)        | Indefinite           | Legal Obligation    | WORM Expiry (hard delete)       | Legal       |

## 3. Deletion Methods

- **TTL (Time-To-Live)**: Automated deletion based on predefined retention periods.
- **Soft Delete**: Data is marked as deleted but retained for a period, allowing for recovery.
- **Hard Delete**: Data is permanently removed from all systems.
- **WORM Expiry**: Data stored in Write Once, Read Many (WORM) buckets is deleted only after the configured object lock retention period expires.

## 4. Data Ownership

Each data class has a designated owner responsible for defining and enforcing its retention policy, ensuring data quality, and managing its lifecycle.

## 5. Policy Review

This Data Retention Matrix will be reviewed annually or as required by changes in regulations, business practices, or data types.