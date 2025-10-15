# MC Learning Module

## Purpose & Architecture
- **Champion/Challenger routing.** `chooseArm` routes Maestro Conductor traffic between a production champion and an optional challenger by drawing a random number against the rollout split, enabling incremental experiments without disrupting baseline service quality.【F:services/learner/traffic.ts†L1-L7】
- **Operational telemetry.** `logLearnerMetric` appends structured JSON lines to `runs/learner-metrics.jsonl`, preserving end-to-end learner metrics for audit, promotion reviews, and offline analysis.【F:services/learner/logger.ts†L1-L8】
- **Promotion orchestration.** The `scripts/promote.ts` workflow simulates promotion checks, evaluates champion/challenger utility uplift, emits telemetry, and surfaces whether an automated promotion should fire—establishing the control points where real production hooks (PRs, config updates) will attach.【F:services/learner/scripts/promote.ts†L1-L32】

Together these components provide the MC Learning control loop: traffic splitting feeds observation, metrics are logged for downstream review, and promotions advance only when uplift thresholds are met.

## API Surface
| Surface | Type | Description |
| --- | --- | --- |
| `chooseArm(task, model, state)` | Function | Returns the challenger when the sampled probability falls below the rollout split; otherwise the champion stays active. The task/model arguments enable future routing analytics while the `state` payload carries live rollout parameters.【F:services/learner/traffic.ts†L1-L7】 |
| `logLearnerMetric(data)` | Function | Serializes arbitrary metric payloads to newline-delimited JSON and persists them to the learner metrics log for replay and inspection.【F:services/learner/logger.ts†L1-L8】 |
| `scripts/promote.ts` | CLI Script | Runs the promotion check, computes uplift, records the event, and prints whether an automatic promotion should proceed—placeholder hooks for wiring into CI/CD and change-management workflows.【F:services/learner/scripts/promote.ts†L3-L32】 |

## Example Usage
```ts
import { chooseArm } from 'services/learner/traffic';
import { logLearnerMetric } from 'services/learner/logger';

const rollout = {
  champion: 'gpt-4.1',
  challenger: 'gpt-4.1-mini',
  split: 0.2,
};

const selected = chooseArm('routing', 'mc-learning', rollout);

logLearnerMetric({
  type: 'assignment',
  selected,
  task: 'routing',
  challengerShare: rollout.split,
  timestamp: new Date().toISOString(),
});
```
This mirrors the production control loop: request routing consults the configured split, and the assignment plus contextual details are logged for downstream analytics and promotion decisions.【F:services/learner/traffic.ts†L1-L7】【F:services/learner/logger.ts†L1-L8】

## Test Coverage
- **`services/learner/__tests__/traffic.test.ts`** validates that `chooseArm` properly selects the challenger below the rollout split, reverts to the champion otherwise, and defaults to the champion when no challenger is configured.【F:services/learner/__tests__/traffic.test.ts†L1-L39】
- **`services/learner/__tests__/logger.test.ts`** stubs `fs.appendFileSync` to ensure telemetry is written to the expected log file, tagged with the event type, and persisted as newline-delimited UTF-8 JSON.【F:services/learner/__tests__/logger.test.ts†L1-L30】

## Technical Debt & Upstream Notes
- The promotion script currently simulates uplift and success probabilities; wiring real champion/challenger evaluation data and change-management hooks remains future work.【F:services/learner/scripts/promote.ts†L6-L27】
- Metrics stream to a local JSONL file; production deployment should swap in durable storage (e.g., object storage or telemetry pipelines) and rotate logs to avoid growth concerns.【F:services/learner/logger.ts†L4-L8】
- Routing randomness is unseeded; introduce deterministic seeding in test or canary environments to produce reproducible experiments when required.【F:services/learner/traffic.ts†L1-L7】
