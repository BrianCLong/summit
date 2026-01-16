# Tenancy & Isolation Model

## Overview
Summit supports multi-tenancy with strict logical isolation.

## Isolation Layers

### 1. Data Layer
*   **Row-Level Security**: All queries are scoped by `tenant_id`.
*   **Schema Isolation** (Optional): Dedicated schemas per tenant for Enterprise tiers.

### 2. Application Layer
*   **Context Middleware**: Every request is authenticated and a `tenant_context` is established before reaching business logic.
*   **Leak Prevention**: API responses are filtered to ensure no cross-tenant data leakage.

### 3. Verification
*   **Tests**: Automated tests attempt to access Tenant A data with Tenant B credentials (negative testing).
*   **Audits**: Regular code reviews focus on tenant leakage paths.
