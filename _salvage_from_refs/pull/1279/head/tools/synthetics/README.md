Synthetic NLQ Probes

Purpose
- Continuously validate end-to-end latency and correctness for NL→Cypher from edge → gateway → Neo4j.

Files
- nlq-probe.js: Node 18+ script that runs golden NL prompts against `GATEWAY_URL`.
- golden-queries.json: Curated golden NL prompts and expected response patterns.

Usage
1) Set environment:
   - `GATEWAY_URL` (e.g., https://api.example.com)
   - `API_KEY` (if required by gateway)
   - `TIMEOUT_MS` (optional; default 5000)
   - `CONCURRENCY` (optional; default 2)
2) Run:
   - `node tools/synthetics/nlq-probe.js`

Outputs
- JSONL on stdout with latency, status, and match results per query.
- Exit code 1 if any golden query fails pattern checks.

Notes
- Endpoint path and payload are configurable via ENV to match your gateway.
- This is safe for read-only NLQ; for write-intent detection, keep shadow mode enabled server-side.

