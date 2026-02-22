# Runbook: Composer 1.5 Mode

## Enabling Mode

* Set feature flag `SUMMIT_COMPOSER15_MODE=1`.

## Tuning

* **Deliberation Budget:** Adjust based on task complexity.
* **Recursion Cap:** Default 3. Increase if context exhaustion is frequent but productive.

## Alerts

* **Drift Failures:** Check CI drift report.
* **Determinism Failures:** Investigate random seeds or unstable tool outputs.

## SLOs

* Evidence generation success rate ≥ 99% (ASSUMPTION).
