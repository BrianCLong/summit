"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentGateService = void 0;
const logger_js_1 = require("../../config/logger.js");
class DeploymentGateService {
    adapters;
    logger;
    requiredApprovals;
    productionEnvironment;
    constructor(adapters, options = {}) {
        this.adapters = adapters;
        this.logger = adapters.logger ?? logger_js_1.logger;
        this.requiredApprovals = Math.max(options.requiredMaintainerApprovals ?? 2, 1);
        this.productionEnvironment = options.productionEnvironment ?? 'production';
    }
    async validate(context) {
        const startedAt = new Date();
        const checks = [];
        const failures = [];
        this.logger.info({
            event: 'deployment_gate_started',
            buildId: context.buildId,
            requestedBy: context.requestedBy,
            environment: context.environment,
            timestamp: startedAt.toISOString(),
        }, 'Starting deployment gate validation');
        const runCheck = async (name, description, runner) => {
            const started = new Date();
            try {
                const result = await runner();
                const record = {
                    name,
                    description,
                    status: result.passed ? 'pass' : 'fail',
                    timestamp: new Date().toISOString(),
                    details: result.details,
                };
                checks.push(record);
                this.logger.info({
                    event: 'deployment_gate_check_completed',
                    buildId: context.buildId,
                    check: record,
                    durationMs: Date.now() - started.getTime(),
                }, `${name} completed`);
                if (!result.passed) {
                    failures.push(record);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                const record = {
                    name,
                    description,
                    status: 'fail',
                    timestamp: new Date().toISOString(),
                    details: message,
                };
                checks.push(record);
                failures.push(record);
                this.logger.error({
                    event: 'deployment_gate_check_error',
                    buildId: context.buildId,
                    check: record,
                    error: message,
                }, `${name} failed`);
            }
        };
        await runCheck('Database migrations', 'Verify all database migrations completed successfully', async () => {
            const pending = await this.adapters.migrations.getPendingMigrations(context);
            const failed = this.adapters.migrations.getFailedMigrations
                ? await this.adapters.migrations.getFailedMigrations(context)
                : [];
            if (pending.length === 0 && failed.length === 0) {
                return { passed: true, details: 'All migrations completed' };
            }
            const detailParts = [];
            if (pending.length > 0) {
                detailParts.push(`Pending migrations: ${pending.join(', ')}`);
            }
            if (failed.length > 0) {
                detailParts.push(`Failed migrations: ${failed.join(', ')}`);
            }
            return { passed: false, details: detailParts.join(' | ') };
        });
        await runCheck('Service readiness', 'Confirm all services are passing readiness probes', async () => {
            const unhealthy = await this.adapters.readiness.getUnhealthyServices(context);
            if (unhealthy.length === 0) {
                return { passed: true, details: 'All services healthy' };
            }
            return {
                passed: false,
                details: `Unhealthy services: ${unhealthy.join(', ')}`,
            };
        });
        await runCheck('Configuration parity', 'Validate configuration consistency between staging and production', async () => {
            const drift = await this.adapters.configuration.diffEnvironments(context.stagingEnvironment, this.productionEnvironment, context);
            if (!drift.length) {
                return { passed: true, details: 'No configuration drift detected' };
            }
            const driftSummary = drift
                .map((diff) => `${diff.key}: ${JSON.stringify(diff.sourceValue)} -> ${JSON.stringify(diff.targetValue)}`)
                .join('; ');
            return {
                passed: false,
                details: `Configuration drift detected: ${driftSummary}`,
            };
        });
        await runCheck('Staging smoke tests', 'Run smoke tests against staging endpoints', async () => {
            const result = await this.adapters.smokeTests.run(context);
            if (result.passed) {
                return {
                    passed: true,
                    details: `Smoke tests passed in ${result.durationMs ?? 0}ms`,
                };
            }
            const failuresText = result.failures?.join(', ') || 'Unknown failures';
            return {
                passed: false,
                details: `Smoke tests failed: ${failuresText}`,
            };
        });
        await runCheck('API contract', 'Check for breaking API changes', async () => {
            const changes = await this.adapters.api.getBreakingChanges(context);
            const breaking = changes.filter((change) => change.breaking);
            if (breaking.length === 0) {
                return { passed: true, details: 'No breaking API changes detected' };
            }
            return {
                passed: false,
                details: `Breaking changes: ${breaking.map((change) => change.name).join(', ')}`,
            };
        });
        await runCheck('Rollback readiness', 'Ensure rollback plan exists and is current', async () => {
            const hasPlan = await this.adapters.release.hasRollbackPlan(context);
            return {
                passed: hasPlan,
                details: hasPlan
                    ? 'Rollback plan documented'
                    : 'No rollback plan available',
            };
        });
        let approvals = [];
        await runCheck('Maintainer approvals', 'Require maintainer sign-off before promotion', async () => {
            approvals =
                await this.adapters.approvals.getMaintainerApprovals(context);
            const maintainerApprovals = approvals.filter((approval) => approval.role === 'maintainer');
            if (maintainerApprovals.length >= this.requiredApprovals) {
                return {
                    passed: true,
                    details: `${maintainerApprovals.length} maintainer approvals received`,
                };
            }
            return {
                passed: false,
                details: `Maintainer approvals received: ${maintainerApprovals.length}/${this.requiredApprovals}`,
            };
        });
        const completedAt = new Date();
        const status = failures.length ? 'fail' : 'pass';
        const report = {
            buildId: context.buildId,
            environment: context.environment,
            status,
            blocked: failures.length > 0,
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            checks,
            approvals,
        };
        this.logger.info({
            event: 'deployment_gate_completed',
            buildId: context.buildId,
            status,
            failures,
            totalChecks: checks.length,
            durationMs: completedAt.getTime() - startedAt.getTime(),
        }, 'Deployment gate validation completed');
        if (failures.length) {
            const failureSummary = failures
                .map((failure) => `${failure.name}: ${failure.details ?? 'failed'}`)
                .join('; ');
            try {
                await this.adapters.slack.notify('🚫 Deployment blocked', {
                    buildId: context.buildId,
                    environment: context.environment,
                    requestedBy: context.requestedBy,
                    failures,
                    summary: failureSummary,
                    releaseTag: context.releaseTag,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error({
                    event: 'deployment_gate_slack_notification_failed',
                    buildId: context.buildId,
                    error: message,
                }, 'Failed to notify Slack about deployment gate failure');
            }
        }
        return report;
    }
}
exports.DeploymentGateService = DeploymentGateService;
