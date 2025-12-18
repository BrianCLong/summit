# Data Governance & Retention Policy

## 1. Overview
This document outlines the policies and technical controls for data integrity, retention, and deletion within the IntelGraph platform. These policies ensure compliance with SOC 2, GDPR, and other regulatory frameworks.

## 2. Data Retention Policy

### 2.1 Active Data
*   **Investigations & Entities**: Retained indefinitely while the account is active, unless manually deleted by an authorized user.
*   **Audit Logs**: Retained for a minimum of 7 years (2555 days) to meet compliance requirements.
*   **System Logs**: Retained for 90 days for operational troubleshooting.

### 2.2 Deleted Data
*   **Soft Deletion**: Investigations and Entities are "soft deleted" (marked as `deletedAt` in the database) for 30 days to allow for recovery.
*   **Hard Deletion**: After 30 days, soft-deleted records are permanently purged from the primary database.

## 3. Account Termination & Data Wiping
Upon termination of a customer account (Tenant):
1.  **Immediate Action**: All user access tokens are revoked.
2.  **Grace Period**: Data remains in a "suspended" state for 30 days.
3.  **Permanent Wipe**: After the grace period, all Tenant-specific data (Investigations, Entities, Evidence) is permanently deleted using a cryptographic shredding or row-deletion process.
4.  **Audit Exception**: Audit logs associated with the Tenant are **NOT** deleted and are retained for the full 7-year retention period to ensure historical accountability.

## 4. Audit Log Integrity
*   **Immutability**: Audit logs are stored in a Write-Once-Read-Many (WORM) compliant storage system (or simulated equivalent in non-production environments).
*   **Encryption**: All audit logs are encrypted at rest.
*   **Access Control**: Read access to audit logs is restricted to the Security & Compliance team.
*   **Traceability**: Every state-changing API operation (Create, Update, Delete) logs the `User ID`, `Tenant ID`, `Action`, `Resource ID`, and `Timestamp`.

## 5. Tenant Isolation
*   **Logical Isolation**: All database queries are scoped by `tenant_id`.
*   **Verification**: Automated integration tests run as part of the CI/CD pipeline to verify that users from one tenant cannot access data belonging to another tenant.
