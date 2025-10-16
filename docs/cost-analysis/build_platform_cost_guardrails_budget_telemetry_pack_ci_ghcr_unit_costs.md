# Cost Guardrails & Budget Telemetry Pack

#

# Enforce CI and registry cost guardrails, track unit costs, and surface budgets.

# Files are separated by `=== FILE: <path> ===`.

=== FILE: .github/workflows/ci-cost-guardrails.yml ===
name: ci-cost-guardrails
on:
push:
branches: [ main ]
schedule: - cron: '15 3 \* \* _' # daily budget sweep
workflow_dispatch:
inputs:
soft_fail:
description: 'Do not fail the workflow (report only)'
default: 'false'
required: false
permissions:
contents: read
actions: read
packages: read
id-token: write
jobs:
budget:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Setup Node
uses: actions/setup-node@v4
with: { node-version: 20 } - name: Install deps
run: npm i -g zx - name: CI Budget Check (this run + month-to-date)
env:
ORG: ${{ github.repository_owner }}
          REPO: ${{ github.repository }}
          RUN_ID: ${{ github.run_id }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Guardrails (edit to your targets)
          CI_COST_USD_MONTHLY_LIMIT: '5000'   # Prod limit for CI minutes & storage combined
          CI_COST_ALERT_THRESHOLD: '0.8'      # 80%
          RUN_COST_MAX_USD: '30'              # single-run cost cap
          RUNNER_COST_PER_MIN_USD: '0.008'    # est. for GitHub-hosted linux runners
        run: |
          npx zx <<'ZX'
          import 'zx/globals';
          const org = process.env.ORG;
          const repo = process.env.REPO;
          const runId = process.env.RUN_ID;
          const perMin = parseFloat(process.env.RUNNER_COST_PER_MIN_USD);
          const run = await $`gh api repos/${repo}/actions/runs/${runId}`.then(r=>JSON.parse(r.stdout));
const durMin = (run.run_duration_ms ?? 0) / 60000;
const runCost = +(durMin _ perMin).toFixed(2);
console.log(`Run duration: ${durMin.toFixed(1)} min, est cost: $${runCost}`);

          // Month-to-date usage: sum workflow runs (approx). Admin-only billing API is not assumed.
          const since = new Date(); since.setDate(1);
          const sinceIso = since.toISOString();
          let page=1, totalMs=0;
          while (true) {
            const resp = await $`gh api repos/${repo}/actions/runs --paginate -X GET -F per_page=100 -F created=>=${sinceIso} -F status=completed -F page=${page}`.then(r=>JSON.parse(r.stdout));
            const runs = resp.workflow_runs || resp;
            if (!runs.length) break;
            for (const wr of runs) totalMs += wr.run_duration_ms || 0;
            page++;
            if (runs.length < 100) break;
          }
          const monthMin = totalMs / 60000;
          const monthCost = +(monthMin * perMin).toFixed(2);
          console.log(`Month-to-date runtime: ${monthMin.toFixed(0)} min, est cost: $${monthCost}`);

          const limit = parseFloat(process.env.CI_COST_USD_MONTHLY_LIMIT);
          const alertThresh = parseFloat(process.env.CI_COST_ALERT_THRESHOLD);
          const alert = monthCost >= limit * alertThresh;
          const hardFail = monthCost > limit || runCost > parseFloat(process.env.RUN_COST_MAX_USD);

          if (alert) console.log(`WARNING: CI cost over ${alertThresh*100}% of budget.`);
          if (hardFail) {
            console.error(`FAIL: CI budget exceeded (run>$${process.env.RUN_COST_MAX_USD} or month>$${limit}).`);
            if ((process.env.INPUT_SOFT_FAIL||'false') !== 'true') process.exit(1);
          }
          ZX

ghcr:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Setup crane
uses: imjasonh/setup-crane@v0.3 - name: GHCR Image Size Budget
env:
REGISTRY: ghcr.io
IMAGE: ${{ github.repository }}
          MAX_IMAGE_SIZE_MB: '350'   # cap per image
        run: |
          set -euo pipefail
          TAGS=$(gh api /orgs/${GITHUB_REPOSITORY_OWNER}/packages/container/${IMAGE##\*/}/versions --paginate | jq -r '.[].metadata.container.tags[]' | sort -u | head -n 10)
FAIL=0
for t in $TAGS; do
            ref=${REGISTRY}/${IMAGE}:$t
size=$(crane manifest ${ref} | jq -r '.layers | map(.size) | add')
            mb=$((size/1024/1024))
echo "$ref -> ${mb}MB"
            if [ $mb -gt ${MAX_IMAGE_SIZE_MB} ]; then echo "FAIL size>${MAX_IMAGE_SIZE_MB}MB"; FAIL=1; fi
done
exit $FAIL

=== FILE: tools/cost/unit-cost.mjs ===
#!/usr/bin/env node
/\*\*

- Estimate unit costs using Prometheus export files or API (optional).
- - cost per 1k ingested events
- - cost per 1M GraphQL calls
- Provide: --events=N --events-cost=USD --graphql=N --graphql-cost=USD
  \*/
  import yargs from 'yargs/yargs';
  import { hideBin } from 'yargs/helpers';
  const argv = yargs(hideBin(process.argv))
  .option('events', { type: 'number', describe: 'Events processed in period' })
  .option('events-cost', { type: 'number', describe: 'Infra cost attributed to ingest' })
  .option('graphql', { type: 'number', describe: 'GraphQL requests in period' })
  .option('graphql-cost', { type: 'number', describe: 'Infra cost attributed to API' })
  .demandOption(['events','events-cost','graphql','graphql-cost']).argv;

const per1k = (argv.events_cost / (argv.events/1000)).toFixed(4);
const per1M = (argv.graphql_cost / (argv.graphql/1_000_000)).toFixed(4);
console.log(JSON.stringify({ unit_cost_events_per_1k: +per1k, unit_cost_graphql_per_1M: +per1M }, null, 2));

=== FILE: .github/workflows/unit-cost-report.yml ===
name: unit-cost-report
on:
workflow_dispatch:
inputs:
events:
description: 'Events processed this period'
required: true
eventsCost:
description: 'USD cost for ingest infra'
required: true
graphql:
description: 'GraphQL requests this period'
required: true
graphqlCost:
description: 'USD cost for API infra'
required: true
permissions: { contents: write }
jobs:
calc:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - uses: actions/setup-node@v4
with: { node-version: 20 } - run: node tools/cost/unit-cost.mjs --events ${{ inputs.events }} --events-cost ${{ inputs.eventsCost }} --graphql ${{ inputs.graphql }} --graphql-cost ${{ inputs.graphqlCost }} | tee unit-cost.json - uses: actions/upload-artifact@v4
with:
name: unit-cost
path: unit-cost.json - uses: stefanzweifel/git-auto-commit-action@v5
with:
commit_message: 'chore(cost): update unit-cost snapshot'
file_pattern: unit-cost.json

=== FILE: .github/workflows/artifact-retention.yml ===
name: artifact-retention
on:
schedule: - cron: '42 2 \* \* 1' # weekly
workflow_dispatch: {}
permissions:
actions: write
jobs:
prune:
runs-on: ubuntu-latest
steps: - name: Reduce artifact retention to 7d for large artifacts (>200MB)
env:
GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          for id in $(gh api repos/${GITHUB_REPOSITORY}/actions/artifacts --paginate | jq -r '.artifacts[] | select(.size_in_bytes>200000000) | .id'); do
gh api -X PATCH repos/${GITHUB_REPOSITORY}/actions/artifacts/$id -f retention_days=7 >/dev/null || true
echo "Set retention 7d for artifact $id"
done

=== FILE: docs/cost-guardrails.md ===

# Cost Guardrails & Budgets

**Defaults**

- Prod budget: ≤ $18,000/mo infra with LLM ≤ $5,000/mo (alert at 80%).
- CI budget: ≤ $5,000/mo (alert at 80%).
- Unit targets: ≤ $0.10 / 1k ingested events, ≤ $2 / 1M GraphQL calls.

**Enforcement**

- `.github/workflows/ci-cost-guardrails.yml` estimates run and monthly cost by summing run durations × runner rate; fails if run>$30 or month>$5,000 (or ≥80% alert).
- GHCR image size budget: each image ≤ 350MB; CI fails if exceeded.
- `artifact-retention.yml` reduces storage spend by pruning large artifacts to 7 days.

**Playbooks**

- If CI spend >80% mid-month: introduce `--since` and test matrix reduction; disable redundant jobs on forks; turn on Turbo remote cache; spot-check flakey tests.
- If unit costs breach targets: profile hottest endpoints; lower log verbosity; adjust resources/limits; enable gzip/br; adopt incremental data loads.

**Reporting**

- Run `unit-cost-report` with inputs from Prometheus/Grafana billing dashboards to snapshot current unit costs into `unit-cost.json`.
