# Upgrade Guide: v1.9.x -> v2.0.0

## Overview

Summit v2.0.0 introduces unified authentication and strict attributes-based access control (ABAC). These changes increase security but require configuration updates.

## Breaking Changes

### 1. Authentication

The legacy auth middleware has been removed. You must provide a valid `API_KEY` for service-to-service calls or a JWT for user calls.

**Action Required:**

- Update your `.env` file to include `SUMMIT_API_KEY`.
- Rotate any keys that were generated prior to 2025-01-01.

### 2. Graph Query API

The endpoint `POST /api/v1/graph/query` strictly enforces `Content-Type: application/json`.

**Action Required:**

- Audit your client code (Python SDK, cURL scripts) to ensure headers are set correctly.

## Database Migrations

Run the following command to apply schema changes for the new Provenance Ledger:

```bash
npm run migrate:up
```

## Configuration Changes

| Env Var       | Description                            | Default              |
| :------------ | :------------------------------------- | :------------------- |
| `ENABLE_ABAC` | Enforce attribute-based access control | `true` (New default) |
| `STRICT_MODE` | Reject requests with unknown fields    | `true`               |
