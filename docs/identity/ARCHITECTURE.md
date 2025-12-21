# Identity North Star Architecture

## Overview
This document defines the "Identity North Star" for the platform, establishing a unified identity model, single source of truth, and standardized lifecycle management as per Epic 1.

## Canonical Identities
We define four canonical identity types that exist within the system. All identities must be subtypes of the `CanonicalIdentity` union.

### 1. User
A human operator accessing the system via a browser or client.
- **Source of Truth:** IdP (OIDC) for authentication; Internal Directory (`users` table) for metadata, roles, and authorization.
- **Lifecycle:** Invited -> Active -> Suspended -> Terminated.
- **Attributes:** `email`, `firstName`, `lastName`, `role`, `tenantId`.

### 2. Service Account
A machine identity representing an internal service or automated bot.
- **Source of Truth:** Internal Directory (`service_accounts` table).
- **Authentication:** API Keys (rotated, scoped).
- **Attributes:** `name`, `description`, `ownerId` (responsible human), `lastUsed`.

### 3. Integration
An external system or third-party application accessing the platform.
- **Source of Truth:** Internal Directory (`integrations` table).
- **Authentication:** OAuth Client Credentials or API Keys.
- **Attributes:** `provider`, `config`, `scopes`, `tenantId`.

### 4. Device/Session
A specific instance of access by a User.
- **Source of Truth:** Internal Directory (`user_sessions`, `devices` tables).
- **Attributes:** `fingerprint`, `ipAddress`, `userAgent`, `expiresAt`.

## Single Source of Truth
- **Authentication (AuthN):** The Identity Provider (IdP) is the ultimate authority for human credentials. We do not store passwords if possible (legacy support exists but is deprecated).
- **Authorization (AuthZ):** The Internal Directory (PostgreSQL) is the source of truth for permissions, roles, and resource access.
- **Identity Metadata:** The Internal Directory is the source of truth for application-specific metadata (preferences, tenant association).

## Standardized Identifiers
All identities must have:
- `id`: A Version 4 UUID.
- `urn`: A Uniform Resource Name in the format `urn:intelgraph:identity:{type}:{id}`.

## Data Model (Canonical)
The data model is implemented in `server/src/canonical/entities/` and enforced via database constraints.

### Schema Requirements
- All identity tables must include `tenant_id` for isolation.
- All identity tables must include `created_at` and `updated_at`.
- Critical tables (`users`, `service_accounts`) should support bitemporal auditing or have an associated audit log.
