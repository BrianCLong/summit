# EvoForge Deployment Engine

## Overview
The EvoForge Deployment Engine provides a staged, observable rollout path for agent releases. It layers validation hooks, health checks, and rollback automation over the existing `FeatureDeploymentPipeline`, with Prometheus-ready metrics and CI-friendly commands.

## Architecture
- **EvoForgeDeploymentEngine**: Orchestrates validations, rollout requests, post-deploy checks, and manual rollback triggers.
- **DeploymentMetricsCollector**: Prometheus-backed counters and histograms for validations, deployment states, and rollout duration per environment.
- **ShellCommandExecutor**: Runs validation hooks (smoke, regression, security, or contract suites) before and after deployments.
- **Default pipeline topology**: Staging → Canary → Production with automated promotion when health checks and metrics thresholds are satisfied.
- **Guardrails**: Required health checks (`api-health`, `worker-heartbeat`), metric-based rollback triggers, and change-approval stop points on the final phase.
- **Non-goal**: This engine documents orchestration boundaries only; the defaults avoid mutating runtime infrastructure and are intended as safe examples rather than prescriptive configs.

## Staged rollout defaults
- **Phase 1 (Canary 10%)**: Quick health verification and error-rate rollback.
- **Phase 2 (50%)**: Latency guardrails plus automatic rollback on error/latency regression.
- **Phase 3 (100%)**: Manual approval gate, health-check rollback trigger, and gradual rollback plan to the previous version if needed.
- **Rollback plan**: Gradual, notification delay of 5 seconds, with post-rollback actions to notify Slack, drain traffic, and enforce a freeze window.

## Validation hooks
Supply `DeploymentGuardrails.preDeploy` (and optionally `postDeploy`) with shell commands:

```ts
const guardrails = {
  preDeploy: [
    { command: 'npm', args: ['run', 'lint'], cwd: '.', timeoutMs: 600000 },
    { command: 'npm', args: ['run', 'test:jest'], cwd: '.', timeoutMs: 900000 },
  ],
  requiredHealthChecks: ['api-health', 'worker-heartbeat'],
};
```

## Metrics and observability
- Counters: `evoforge_validation_total`, `evoforge_deployment_total` (by status).
- Histogram: `evoforge_rollout_duration_seconds` (by environment).
- Programmatic snapshot: `engine.getMetrics()` returns aggregated counts for dashboards or CI assertions.

## Usage example
```ts
const engine = new EvoForgeDeploymentEngine(flagManager);
const request = await engine.deployAgentRelease(
  {
    flagKey: 'evoforge-agent',
    version: '1.2.0',
    artifactPath: '/artifacts/evoforge-agent.tar.gz',
    targetEnvironment: 'staging',
  },
  guardrails,
);

// Optional post-deploy verification
await engine.postDeploymentValidation([
  { command: 'npm', args: ['run', 'test:smoke'], cwd: '.' },
]);
```

## Testing
Run the focused unit suite for the deployment engine:

```bash
npx jest tests/unit/evoforgeDeploymentEngine.test.ts
```

## Rollback and safety
- Trigger manual rollback via `engine.rollbackDeployment(requestId, reason)`.
- Automatic rollback is enabled in the rollout plan with thresholds for error rate, response time, and health-check degradation.
- Health checks default to the platform API (`/health`) and Prometheus-driven worker heartbeats.
