# Summit Agent Eval Data Handling

Public and private artifacts must be carefully separated during evaluation evidence generation:
* **Private Data:** Logs containing PII or customer-specific details must not be committed to the public ledger.
* **Public Artifacts:** Deterministic, canonical output metrics only (metrics.json, report.json, stamp.json).

Scripts under `scripts/ci/public-private-validator` must ensure no private scope leaks into the deterministic evidence bundle.
