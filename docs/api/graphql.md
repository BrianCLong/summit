# GraphQL API Quick Guide

This page provides copy/paste examples for demo ingestion and swarm analysis.

## Endpoint

- `http://localhost:4000/graphql`

## Mutation: `ingestBatch`

```graphql
mutation IngestBatch {
  ingestBatch(
    input: {
      source: "mit-sloan-startups-2026"
      format: JSONL
      uri: "file://datasets/wow/mit-sloan-startups-2026.jsonl"
    }
  ) {
    batchId
    accepted
    rejected
    lineageRef
  }
}
```

## Mutation: `runAgentSwarm`

```graphql
mutation RunAgentSwarm {
  runAgentSwarm(
    input: {
      objective: "Analyze MIT Sloan Startups 2026 for supply-chain, policy, and market risk"
      agentRoles: [JULES, CODEX, OBSERVER]
      evidenceBudget: { maxNodes: 120, maxHops: 3 }
      confidenceThreshold: 0.7
    }
  ) {
    runId
    status
    confidence
    reportUrl
    provenance {
      sourceId
      sourceUrl
      score
    }
  }
}
```

## cURL Example

```bash
curl -s http://localhost:4000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"mutation { runAgentSwarm(input:{ objective:\"Analyze MIT Sloan Startups 2026\", agentRoles:[JULES,CODEX,OBSERVER], evidenceBudget:{maxNodes:120,maxHops:3}, confidenceThreshold:0.7 }) { runId status confidence reportUrl } }"}'
```

## One-command local demo

```bash
pnpm demo:company
```
