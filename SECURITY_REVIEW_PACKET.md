# Summit Security Review Packet

## 1. Architecture Overview (Security-Relevant Components)

The Summit platform is a multi-tiered application designed for intelligence analysis. The architecture consists of a React-based frontend, a Node.js/Express GraphQL API backend, and a suite of databases including Neo4j, PostgreSQL, TimescaleDB, and Redis.

### Key Components:

- **React Client:** The primary user interface for the platform. It communicates with the backend via the GraphQL API.
- **GraphQL API:** The main entry point for all client-server communication. It handles authentication, authorization, and business logic.
- **Databases:**
    - **Neo4j:** Stores graph data representing entities and their relationships.
    - **PostgreSQL:** Manages user data, audit logs, and other relational metadata.
    - **TimescaleDB:** Handles time-series data for metrics and events.
    - **Redis:** Used for caching, session management, and real-time messaging.

### System Architecture Diagram:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  GraphQL API    │◄──►│    Neo4j DB     │
│                 │    │                 │    │                 │
│ • Investigation │    │ • Authentication│    │ • Graph Data    │
│ • Graph Viz     │    │ • CRUD Ops      │    │ • Relationships │
│ • Real-time UI  │    │ • Subscriptions │    │ • Analytics     │
│ • Material-UI   │    │ • Rate Limiting │    │ • Constraints   │
└─────────────────┘    └─────────────────┘    └─────────────────┘

                       ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                       │  PostgreSQL DB  │    │   TimescaleDB   │    │    Redis Cache  │
                       │                 │    │                 │    │                 │
                       │ • User Data     │    │ • Time-series   │    │ • Sessions      │
                       │ • Audit Logs    │    │ • Metrics       │    │ • Real-time     │
                       │ • Metadata      │    │                 │    │ • Rate Limiting │
                       │ • Vector Store  │    │                 │    │ • Pub/Sub       │
                       └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 2. Trust Boundaries & Threat Model Summary

The primary trust boundary exists between the client and the GraphQL API. All client requests are untrusted and must be authenticated and authorized before being processed. The backend services and databases are considered to be within a trusted zone.

For a detailed breakdown of potential threats and their mitigations, please refer to the [THREAT_MODEL.md](THREAT_MODEL.md) document. It covers the following areas in depth:

- **Spoofing:** Impersonation of users or system components.
- **Tampering:** Unauthorized modification of data or code.
- **Repudiation:** Denying that an action was performed.
- **Information Disclosure:** Exposure of sensitive information.
- **Denial of Service:** Making the system unavailable to legitimate users.
- **Elevation of Privilege:** Gaining unauthorized access to system resources.

## 3. High-Risk Areas & Mitigations

Based on the threat model, the following are considered high-risk areas:

- **LLM Misuse:** The Large Language Model (LLM) integrated into the platform presents a novel attack surface. Mitigations include robust input validation, output encoding, and sandboxing of the LLM environment.
- **Data Poisoning:** The integrity of the data used for analysis is critical. Mitigations include data provenance checks, cryptographic signatures for datasets, and regular data audits.
- **Insider Threats:** Malicious insiders with valid credentials pose a significant risk. Mitigations include strict access controls (RBAC/OPA), MFA, and detailed audit logging.

## 4. How to Run Security-Relevant Tests

The project includes a comprehensive suite of tests that can be used to verify the security posture of the application. The most important of these is the "smoke test," which runs through the "Golden Path" of the application.

To run the smoke test, use the following command from the root of the repository:

```bash
make smoke
```

This will spin up the necessary services, run the test suite, and then tear down the environment.

## 5. One-Command Verification Path for Core Security Guarantees

The "Golden Path" for the application is defined as: **Investigation → Entities → Relationships → Copilot → Results**. This workflow can be verified with a single command:

```bash
make bootstrap && make up && make smoke
```

This command will:
1.  `make bootstrap`: Install all dependencies and set up the environment.
2.  `make up`: Start all the required services in Docker containers.
3.  `make smoke`: Run the end-to-end smoke test to validate the core functionality and, by extension, the core security guarantees of the application.

A successful run of this command indicates that the core components of the system are functioning correctly and that the basic security controls are in place.
