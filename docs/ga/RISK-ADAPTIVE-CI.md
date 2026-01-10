# Risk-Adaptive CI Enforcement

The Predictive Risk Engine adjusts CI strictness before failures occur. Enforcement consumes `risk-report.json` emitted by `scripts/risk/score-change.ts` and applies adaptive controls via `scripts/ci/enforce-risk.ts`.

## Enforcement Matrix

| Band     | Actions                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low      | Standard CI. No additional controls.                                                                                                                                               |
| Medium   | Recommend targeted tests and validation of touched modules. Log advisory only.                                                                                                     |
| High     | Strong verification tier required (`VERIFICATION_TIER=strong`), agent scope must be `narrow`, and a risk decision artifact must be produced. Auto-merge disabled until satisfied.  |
| Critical | Auto-merge blocked. Governance escalation required with signed artifact in `artifacts/risk-decisions/{pr}.json`. Full regression, security sweep, and policy review are mandatory. |

## Inputs

- **Risk report**: JSON produced from the scoring model with `score`, `band`, and `contributions`.
- **Environment controls**:
  - `VERIFICATION_TIER`: must be `strong` or `paranoid` for High.
  - `AGENT_SCOPE`: must be `narrow` for High and Critical.
  - `PR_NUMBER`: used to locate the decision artifact under `artifacts/risk-decisions/`.

## Outputs

- Non-zero exit code on enforcement failure.
- Console diagnostics summarizing missing controls and required remediation.

## Escalation Path

- High risk: produce decision artifact, narrow scope, rerun flaky suites, and rerun CI.
- Critical risk: halt auto-merge, escalate to governance DRI, attach signed artifact, and require human approval.

## Provenance

`enforce-risk.ts` logs its decision path and preserves the contributing factors to keep audit and governance records reproducible.
