# IntelGraph Developer Guide

## 1. Introduction

This guide provides developers with the necessary information to set up, run, test, and contribute to the IntelGraph system. The IntelGraph is a core component of the platform, responsible for managing the provenance of intelligence data.

For a high-level overview of the system's design and data flows, please refer to the [ARCHITECTURE.md](./ARCHITECTURE.md) document.

## 2. System Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Docker & Docker Compose**: For running local database dependencies.
- **Neo4j**: v5.x
- **PostgreSQL**: v14.x

## 3. Local Development Setup

The IntelGraph system relies on Neo4j and PostgreSQL for its data storage. The easiest way to get these running locally is by using the provided Docker Compose configuration.

### Step 1: Start the Databases

From the root of the repository, run the Docker Compose command to start the required services in the background:

```bash
npm run docker:dev
```

This will start Neo4j and PostgreSQL containers with the configuration defined in `docker-compose.yml`.

- **Neo4j Browser**: Available at `http://localhost:7474`
- **PostgreSQL**: Available at `localhost:5432`

### Step 2: Install Dependencies

Install all necessary Node.js dependencies for the server:

```bash
# From the repository root
pnpm install --filter intelgraph-server
```

### Step 3: Run Database Migrations

Before starting the application, you need to apply the latest database schemas for both PostgreSQL and Neo4j.

```bash
# From the repository root
npm run db:migrate
```

This script will run all pending migrations located in `server/db/migrations/`.

## 4. Running the Application

To start the IntelGraph API server in development mode with hot-reloading, run the following command from the repository root:

```bash
# This starts the main server application
npm run dev
```

The API server will be available at `http://localhost:4000`.

## 5. Testing

The IntelGraph system has a comprehensive suite of tests to ensure correctness and stability.

### Running Unit & Integration Tests

To run all tests for the IntelGraph service and its related components, you can target the specific test files.

```bash
# Navigate to the server directory first
cd server

# Run a specific test file
npm test -- src/services/IntelGraphService.test.ts
```

*Note: There is a known, pre-existing issue with the Jest configuration that may cause tests to fail. A fix for this is planned as part of the hardening process.*

### Running Performance Tests

Performance tests are implemented using k6. To run the load test script for the IntelGraph API:

```bash
# Ensure the server is running first
npm run dev

# Run the k6 script
k6 run k6/intelgraph.js
```

*(Note: The `k6/intelgraph.js` script will be created as part of the hardening process.)*

## 6. Codebase Structure

The core files for the IntelGraph system are located within the `server/` directory:

- **`src/routes/intel-graph.ts`**: The Express router defining all API endpoints.
- **`src/services/IntelGraphService.ts`**: The central service class containing all business logic.
- **`src/graph/schema.ts`**: TypeScript interfaces defining the data model for all nodes and edges.
- **`src/provenance/ledger.ts`**: The service for writing to the immutable audit log.
- **`src/maestro/pipelines/decision-analysis-pipeline.ts`**: The Maestro pipeline for running decision analysis.
- **`policy/intelgraph_governance.rego`**: The OPA policy file for governance rules.

## 7. Contributing

1.  **Create a feature branch**: `git checkout -b feat/intelgraph/your-feature-name`
2.  Make your changes, ensuring you add or update tests as necessary.
3.  Add JSDoc comments for any new public functions or methods.
4.  Run the linter and formatter: `npm run lint && npm run format`.
5.  Submit a pull request to the `main` branch.
