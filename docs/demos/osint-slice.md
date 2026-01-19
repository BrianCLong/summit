# OSINT Capability Demo

This document describes how to demo the Thin OSINT Capability Slice.

## Prerequisites

*   The Summit platform stack should be running (specifically Postgres and the API server).
*   Ensure the database migrations are applied.

## Endpoints

The following endpoints are available under `/api/osint` (assuming api prefix):

*   `GET /iocs`: Fetch the latest IOCs and their risk assessments.
*   `POST /ingest`: Trigger ingestion from a default or specified RSS feed.
*   `POST /analyze`: Trigger LLM-based risk assessment for pending IOCs.

## Demo Steps

### 1. Ingestion

Trigger the ingestion of a sample OSINT feed (CISA Current Activity by default).

```bash
curl -X POST http://localhost:4000/api/osint/ingest \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "count": 15,
  "new": 10
}
```

### 2. Analysis

Trigger the analysis of newly ingested IOCs. This uses a mock LLM (simulating Llama) to generate a risk summary.

```bash
curl -X POST http://localhost:4000/api/osint/analyze \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}'
```

Response:
```json
{
  "success": true,
  "processed": 5,
  "results": [ ... ]
}
```

### 3. Surface Results

Retrieve the enriched IOCs with their risk scores and summaries.

```bash
curl -X GET "http://localhost:4000/api/osint/iocs?limit=10"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "type": "ipv4",
      "value": "198.51.100.1",
      "risk_score": 75,
      "summary": "Analysis for 198.51.100.1: Likely associated with recent ipv4 scanning activity...",
      ...
    }
  ]
}
```

## Implementation Details

*   **Ingestion**: `server/src/services/osint_service.ts` fetches RSS feeds and extracts potential IOCs (IPs, domains) using heuristics.
*   **Storage**: Data is stored in `iocs` and `risk_assessments` Postgres tables.
*   **Analysis**: `MockLLM` in `server/src/services/llm.ts` is used to simulate analysis.
