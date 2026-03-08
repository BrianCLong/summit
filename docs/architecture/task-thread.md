# TaskThread Integration Architecture

## Overview
This document outlines the architecture for integrating TaskThread (a collaborative chat layer for tasks) into the Summit platform. This feature aligns with the collaborative principles seen in Microsoft Planner.

## Components

1.  **GraphQL Schema (`src/api/graphql/taskThread`)**:
    *   Defines the `TaskThread` and `ThreadMessage` types.
    *   Provides basic resolvers to retrieve threads and messages.

2.  **OPA Policy (`.github/policies/task-thread-access.rego`)**:
    *   Enforces a deny-by-default access model.
    *   Grants read access only to users who are explicitly listed as participants in a thread or have an admin role.

3.  **GraphRAG Integration (`src/graphrag/relations`)**:
    *   Establishes the `HAS_THREAD` relationship between a `Task` entity and its corresponding `TaskThread`.
    *   Facilitates semantic reasoning and connection mapping within the knowledge graph.

## Data Model

*   **TaskThread**:
    *   `id`: ID!
    *   `taskId`: ID!
    *   `messages`: [ThreadMessage!]!
*   **ThreadMessage**:
    *   `id`: ID!
    *   `body`: String!
    *   `authorId`: ID!
    *   `createdAt`: String!

## Access Control

The policy engine evaluates access requests based on:
1.  The user's role (`admin` has global access).
2.  The user's presence in the thread's `participants` list.

## Security Considerations

*   **Data Minimization**: The schema exposes only essential fields.
*   **Immutable Logs**: Thread messages should be treated as an append-only log to prevent tampering.
*   **Policy Enforcement**: The OPA policy must be verified before any data is returned to the client.
