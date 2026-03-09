# 🚀 Summit WOW Demo

The fastest way to experience Summit's Agentic AI capabilities is running the **WOW Demo**.

## What is it?

The WOW Demo is a zero-to-insight automation script that:
1. Starts necessary infrastructure (Neo4j, etc.) if not already running.
2. Ingests the bundled dummy data found in `datasets/demo/`.
3. Triggers a full Maestro agent swarm investigation via GraphQL on "Acme Corp".
4. Opens your browser to view the generated provenance-rich report and graph visualizations.

## Running the Demo

From the root of the repository, execute:

```bash
./scripts/wow-demo.sh
```

## Behind the Scenes

When you run the script, you are testing our **Switchboard** ingestion wedge and **GraphRAG** semantic chunking engine.

- **Data Source**: Small synthetic dataset in `datasets/demo/` modeling companies, news, and relationships.
- **Orchestration**: A mutation hits `runAgentSwarm` to simulate multi-agent analysis.
- **Output**: You'll see a generated local report and populated Neo4j knowledge graph without needing any external API keys or paid tools.
