# 🏗️ Summit Platform: Architecture Overview

This document provides a high-level overview of the Summit platform's architecture, its key components, and the flow of data through the system.

---

### Core Principles

*   **Service-Oriented:** The platform is composed of distinct, containerized services that communicate over well-defined APIs.
*   **Polyglot Persistence:** We use the best database for the job. Neo4j for graph data, PostgreSQL for relational/transactional data, and Redis for caching and session management.
*   **Deployable First:** All components are designed to be built, tested, and deployed independently and as a whole, using Docker for containerization.

---

### System Components

The Summit platform is comprised of the following key services, all managed via `docker-compose.dev.yml` in the local environment:

*   **`client`:** A React-based single-page application that provides the user interface.
*   **`api`:** A Node.js/Express GraphQL server that serves as the primary backend for the client. It handles business logic, authentication, and data orchestration.
*   **`postgres`:** A PostgreSQL database that stores relational data, such as user accounts and audit logs.
*   **`neo4j`:** A Neo4j graph database that stores the core intelligence data: entities and their relationships.
*   **`redis`:** A Redis instance used for session storage, caching, and as a message broker for real-time updates.
*   **`prometheus` & `grafana`:** Our observability stack for collecting metrics and visualizing system health.

---

### Data Flow Diagram

This diagram illustrates the typical flow of a request from the user's browser to the backend services.

```
+------------------+      +------------------+      +------------------+
|                  |      |                  |      |                  |
|   React Client   |----->|   GraphQL API    |----->|   PostgreSQL DB  |
| (localhost:3000) |      | (localhost:4000) |      | (Users, Logs)    |
|                  |      |                  |      |                  |
+------------------+      +-------+----------+      +------------------+
                                  |
                                  |                 +------------------+
                                  |                 |                  |
                                  +---------------->|     Neo4j DB     |
                                  |                 | (Entities, Rels) |
                                  |                 |                  |
                                  |                 +------------------+
                                  |
                                  |                 +------------------+
                                  |                 |                  |
                                  +---------------->|      Redis       |
                                                    | (Cache, Sessions)|
                                                    |                  |
                                                    +------------------+
```

1.  The **React Client** sends a GraphQL query or mutation to the **GraphQL API**.
2.  The **API** processes the request, performing authentication and validation.
3.  The API's resolvers fetch or persist data from the appropriate database:
    *   **PostgreSQL** for user data and metadata.
    *   **Neo4j** for graph-centric intelligence data.
    *   **Redis** for cached query results or session information.
4.  The **API** returns the composed response to the **Client**.

---

### Development Environment

The entire stack is designed to run within a **Dev Container**, which provides a consistent, reproducible environment for all developers. This environment is defined by:

*   `.devcontainer/devcontainer.json`: Configures the VS Code environment, including extensions and settings.
*   `.devcontainer/Dockerfile`: Defines the base OS and system-level dependencies.
*   `docker-compose.dev.yml`: Defines the services that make up the development stack.

This approach eliminates "works on my machine" issues and ensures that the local environment closely mirrors the CI and production environments. For more details on the tooling, see [tooling.md](./tooling.md).
