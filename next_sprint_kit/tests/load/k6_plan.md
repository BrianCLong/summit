# k6 Load Test Plan — Preview & Ledger

## Objectives
- Validate preview latency under concurrent usage.
- Ensure ledger ingest/export performance with sustained load.

## Scenarios
1. **Preview burst:** 100 VUs for 5 minutes sending NL prompts from fixture set; assert P95 latency <850 ms and error rate <2%.
2. **Ledger ingest:** 50 VUs posting provenance events (derived from demo executions) for 10 minutes; assert ingest success >95%.
3. **Export under load:** Every 2 minutes trigger export with last 1k events; assert completion <60s and hash verification success.
4. **Cost guard stress:** Simulate usage spikes to test guard decisions; expect alerts within 5 minutes and block rate ≥80% for adversarial batch.

## Metrics & Thresholds
- `http_req_duration{endpoint=preview}`: P95 <850 ms.
- `http_req_failed` <2% overall excluding intentional guardrails.
- `custom_metric_prov_export_duration`: <60s.
- `custom_metric_cost_guard_block_rate`: ≥0.8 during adversarial batch.

## Execution
- Command template: `k6 run -e TENANT=demo -e TOKEN=<token> k6/preview.js` (scripts to be added alongside service code).
- Seeded data: ensure `scripts/generate_demo_data.py --seed 42` executed and fixtures loaded before test.
- Outputs: store results under `tests/load/results/{date}` with JSON summary and thresholds.
