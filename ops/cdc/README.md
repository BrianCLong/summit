# CDC Pipeline: Postgres -> Kafka -> Neo4j

This directory contains a production-ready CDC (Change Data Capture) stack using Debezium and Kafka Connect.

## Architecture

1. **Postgres** (Source): Configured with `wal_level=logical`.
2. **Debezium** (Source Connector): Captures changes from Postgres.
3. **Kafka**: Message broker.
4. **Neo4j Sink** (Sink Connector): Consumes from Kafka and writes to Neo4j.
5. **Neo4j** (Target): Graph database.

## Quick Start

1. **Start the stack:**
   ```bash
   docker compose up --build -d
   ```
   *Note: This starts separate Postgres and Neo4j instances. Ensure ports 5432 and 7474 are free, or stop the main dev stack.*

2. **Wait for services to be healthy.**
   Check status:
   ```bash
   docker compose ps
   ```

3. **Register Connectors:**
   Register the Postgres source connector:
   ```bash
   curl -X POST -H "Content-Type: application/json" --data @connector-postgres.json http://localhost:8083/connectors
   ```

   Register the Neo4j sink connector:
   ```bash
   curl -X POST -H "Content-Type: application/json" --data @connector-neo4j.json http://localhost:8083/connectors
   ```

4. **Verify Replication:**
   - Connect to Postgres: `psql -h localhost -U maestro -d maestro`
   - Insert data: `INSERT INTO maestro.users (id, email, name) VALUES (gen_random_uuid(), 'alice@example.com', 'Alice');`
   - Connect to Neo4j: Open `http://localhost:7474`
   - Query: `MATCH (n:User) RETURN n`

## Drift Check

A script is provided to verify consistency between Postgres and Neo4j.

1. **Install dependencies:**
   ```bash
   cd scripts
   npm install
   ```

2. **Run check:**
   ```bash
   node drift-check.js
   ```

   The script runs canonical queries defined in `scripts/users.sql` and `scripts/users.cypher` (logic embedded or file-based).

## CI Integration

A sample GitHub Action workflow is provided in `ci-drift-check.yml`.

## Configuration

- **Postgres Connector**: `connector-postgres.json`
- **Neo4j Connector**: `connector-neo4j.json`
- **Docker Compose**: `docker-compose.yml`
- **Init SQL**: `init-cdc-db.sql`
