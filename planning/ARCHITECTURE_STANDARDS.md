# Architecture Standards

## Overview

This document defines the architectural standards for the IntelGraph platform, focusing on decoupling and stability.

## 1. Internal APIs & Modules

- **Encapsulation**: Code should be organized into "Modules" (e.g., `Identity`, `Graph`, `Billing`).
- **Public Interface**: Each module must have an `index.ts` that exports _only_ the public API.
- **No Deep Imports**: Do not import from `module/src/internal/helper.ts`. Import from `module/`.

## 2. Dependency Management

- **Dependency Budgets**:
  - **Core Services**: < 10 production dependencies.
  - **Feature Services**: < 20 production dependencies.
- **Review**: Adding a new dependency requires justification in the PR.

## 3. Contract Testing

- **Requirement**: Any service exposing an API (HTTP or Event) consumed by another team/service MUST have contract tests.
- **Format**: Tests should assert the shape of the request and response.

## 4. Database Access

- **Ownership**: Each table/collection is owned by ONE service.
- **No Shared Writes**: Service A cannot write to Service B's tables. It must call Service B's API.
- **Read Replicas**: Direct reads are permitted only if explicitly allowed by the owner (e.g., for Analytics).

## 5. Event-Driven Architecture

- **Async First**: Prefer emitting an event over synchronous calls for side effects.
- **Idempotency**: All event handlers must be idempotent.

## 6. Deprecation Policy

- **Internal APIs**: 1 month notice before breaking changes.
- **External APIs**: 6 months notice.
- **Fields**: Mark as `@deprecated` in code/GraphQL schema.
