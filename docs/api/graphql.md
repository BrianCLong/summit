# GraphQL API

Summit provides a comprehensive GraphQL API for interacting with the IntelGraph, triggering workflows, and querying data.

## Core Mutations

### Ingesting Data (Batch)
Use the `ingestBatch` mutation to push an array of entities into Switchboard.

```graphql
mutation IngestBatch($input: IngestBatchInput!) {
  ingestBatch(input: $input) {
    batchId
    status
    processedCount
    errorCount
  }
}
```

*Example Variables:*
```json
{
  "input": {
    "source": "MIT_Sloan_Startups_2026",
    "entities": [
      {
        "type": "Company",
        "data": {
          "name": "NeuroLink AI",
          "industry": "NeuralTech",
          "funding": 12000000
        }
      }
    ]
  }
}
```

### Running Agent Swarms
Trigger the Maestro orchestration layer using the `runAgentSwarm` mutation.

```graphql
mutation RunAgentSwarm($input: SwarmInput!) {
  runAgentSwarm(input: $input) {
    runId
    status
    estimatedCompletionTime
  }
}
```

*Example Variables:*
```json
{
  "input": {
    "targetEntity": "NeuroLink AI",
    "agents": ["Jules", "Codex", "Observer"],
    "objective": "Generate full OSINT provenance report"
  }
}
```

## Core Queries
(Documentation for `getEntity`, `searchGraph`, etc. coming soon)
