# R1: Rapid Attribution Runbook

**Purpose:** Standardize the path from raw indicators (IOCs) to a high-confidence hypothesis report with citations.

**Owner:** CTI Team
**SLA:** 30 minutes for initial triage

## Phase 1: Ingestion & Enrichment

1. **Input:** List of IOCs (IPs, Domains, Hashes).
2. **Action:** Run `IngestIOCs` pipeline.
   - Connector: MISP / Elastic
   - Enrichment: VirusTotal, AlienVault (via OSINT Connectors)
3. **Verification:** Check `GraphRAG` for new nodes linked to existing Campaigns.

## Phase 2: Hypothesis Generation (Copilot)

1. **Prompt:** "Find shared infrastructure between input IPs and known APT29 campaigns from the last 6 months."
2. **Copilot Action:** Generates Cypher to traverse `(IP)-[:HOSTS]->(Domain)<-[:USES]-(Campaign)`.
3. **Analysis:** Review `path` rationale in Copilot panel.

## Phase 3: Evidence Collection

1. **Retrieval:** Use `GraphRAG` to pull snippets confirming the infrastructure usage.
2. **Citation:** Ensure every claim in the draft report links to a `SourceDocument` node.

## Phase 4: Reporting

1. **Draft:** Generate PDF via `AttributionReportTemplate`.
2. **Export:** Generate verifiable bundle using `ProvenanceLedger`.
   - `npm run verify-export <bundle.json>`
3. **Distribution:** Upload to Trust Center.
