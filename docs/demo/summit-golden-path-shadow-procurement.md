# Summit Golden Path Demo Spec: Shadow Procurement Network

## Purpose
One-command scenario proving Summit's end-to-end value chain and GA trajectory alignment.

## Demo Goals
1. Ingest multi-source data.
2. Build IntelGraph relationships.
3. Detect patterns and generate insights.
4. Enforce governance policies.
5. Produce a verifiable evidence bundle.

## Scenario Narrative
A shell company network funnels funds to a sanctioned entity through layered intermediaries.

## Data Sources
- CSV: `transactions.csv`
- JSON: `company_registry.json`
- OSINT: `sanctions_list.json`
- Log: `email_metadata.log`

## Demo Flow

### Step 1 — Launch
```bash
make summit-up
make demo-shadow-network
```

### Step 2 — Ingestion
Expected behavior:
- Normalize entities.
- Deduplicate records.
- Attach provenance.

Artifacts:
- `/runs/demo-shadow/ingestion.log`
- `/runs/demo-shadow/normalized_entities.json`

### Step 3 — Graph Construction
Nodes:
- Companies
- Individuals
- BankAccounts
- Transactions

Relationships:
- `OWNS`
- `TRANSFERS_TO`
- `DIRECTOR_OF`
- `REGISTERED_AT`

### Step 4 — Insight Engine Trigger
Expected findings:
- Hub entity detection.
- Circular transactions.
- Sanctions proximity.

Example output:
```json
{
  "insight_id": "hub_detection_001",
  "entity": "Orion Trade LLC",
  "confidence": 0.87,
  "reason": "High betweenness centrality and transaction clustering"
}
```

### Step 5 — Governance Enforcement
Policies enforced:
- No external calls to unverified sources.
- Sanctioned entity escalation required.
- Risk score threshold triggers human review.

### Step 6 — Evidence Bundle Generation
Output path:
- `/evidence-bundle/demo-shadow/`

## Success Criteria
- First insight produced in less than 2 minutes.
- Evidence bundle complete.
- Policy enforcement logged.
- Graph query returns the expected hub entity.
