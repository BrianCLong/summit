# CDC Pipeline Configuration

This directory contains Kafka Connect configurations for streaming Postgres changes into Neo4j.

## Connectors

1.  **pg-cdc.json**: Debezium Postgres Source connector. Captures inserts, updates, and deletes from Postgres.
2.  **neo4j-sink.json**: Neo4j Sink connector. Consumes Debezium topics and writes to Neo4j using Cypher.

## Deployment

Use the Kafka Connect API to deploy these connectors:

```bash
curl -X POST -H "Content-Type: application/json" --data @pg-cdc.json http://kafka-connect:8083/connectors
curl -X POST -H "Content-Type: application/json" --data @neo4j-sink.json http://kafka-connect:8083/connectors
```
