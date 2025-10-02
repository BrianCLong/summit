# Policy Backtest Simulator (PBS)

PBS replays historical trust-and-safety decisions under a new policy snapshot to quantify the impact of proposed changes. The Go engine performs deterministic re-adjudication, generates a signed backtest report, and emits a diff-friendly rollout recommendation. A companion TypeScript dashboard renders reports for rapid review.

## Getting Started

```bash
cd pbs
# run tests
go test ./...

# execute a backtest
go run ./cmd/pbs \
  --history testdata/history_sample.json \
  --policy testdata/policy_hardened.json \
  --report /tmp/report.json \
  --recommendation /tmp/recommendation.txt \
  --signing-key testdata/signing_key.json
```

The CLI prints paths for generated artifacts. Without `--report`/`--recommendation` it streams the recommendation to stdout.

## Dashboard Generator

The dashboard lives under `tools/pbs-dashboard`. After installing dependencies run:

```bash
cd tools/pbs-dashboard
npm install
npm run build
npx tsx src/cli.ts --report ../../testdata/report_sample.json --out dist/dashboard.html
```

Pass `--recommendation` to include the rollout summary inside the page. The generated HTML is deterministic and suitable for artifact storage.

## Determinism and Verification

* Reports embed a deterministic `deterministic_run_id` derived from the policy digest, history digest, and engine version.
* Engine tests cover deterministic reproduction, policy delta expectations, and signature integrity.
* Golden recommendations prevent accidental drift in rollout guidance.

## File Layout

```
pbs/
  cmd/pbs            # CLI entrypoint
  internal/pbs       # Engine, report builder, signing, recommendation helpers
  testdata           # Fixtures for regression tests
  tools/pbs-dashboard# TypeScript dashboard generator
```
