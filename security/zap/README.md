# OWASP ZAP automation

This folder tracks the ZAP coverage targets and the baseline exceptions that keep the CI gate stable. The GitHub Actions workflow **CI Security (OWASP ZAP)** will:

- start the docker-compose stack and crawl each configured target;
- upload HTML/JSON reports for traceability;
- fail pull requests when new high/critical findings appear that are not part of the baseline; and
- open/close remediation issues to make ownership visible.

## Adding services

Update [`targets.json`](./targets.json) to add each service you want scanned. Each entry supports:

- `name`: A short identifier used in comments and tracking issues.
- `target`: The URL ZAP should scan (for example, `http://localhost:3000`).
- `rules`: Optional path to a ZAP rules TSV (defaults to `.zap/rules.tsv`).
- `accepted_alerts`: List of plugin IDs that are tolerated for now. These stay visible in the report but do not block PRs.

Keep the `accepted_alerts` list small and time-bound. When a tolerated issue is fixed, remove its plugin ID from the baseline so the gate enforces the improved posture across services.
