---
title: API Reference (Stub)
summary: Overview of API surfaces. See Swagger/Playground for live docs.
version: v2.0.0
lastUpdated: 2025-12-29
---

# API Reference

Summit exposes two primary API surfaces.

## 1. GraphQL API (Primary)

Used by the frontend client for 90% of operations (CRUD, Graph traversal).

- **Endpoint**: `/graphql`
- **Playground**: `http://localhost:4000/graphql`
- **Schema**: [schema.graphql](../../server/src/schema.graphql) (Relative link example)

### Common Operations

- `query GetInvestigation($id: ID!)`
- `mutation CreateEntity($input: EntityInput!)`

## 2. REST API (System/Streams)

Used for file uploads, health checks, and simulation control.

- **Base URL**: `/api`
- **Docs (Swagger)**: `http://localhost:4000/api/docs`

### Key Endpoints

- `GET /health`: System health.
- `POST /api/upload`: Multipart file upload.
- `POST /api/narrative-sim/*`: Simulation control.

## Authentication

All private endpoints require the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```
