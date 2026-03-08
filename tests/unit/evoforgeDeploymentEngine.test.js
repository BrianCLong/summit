"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EvoForgeDeploymentEngine_1 = require("../../src/features/evoforge/EvoForgeDeploymentEngine");
describe('EvoForgeDeploymentEngine', () => {
    // The suite documents orchestration boundaries only: it verifies that
    // validation hooks, rollout requests, and rollback delegation are wired
    // without asserting any side effects beyond metrics accounting.
    const flagManager = {
        evaluateFlag: jest.fn().mockResolvedValue({ key: 'test-flag' }),
    };
    const successExecutor = {
        run: jest.fn(async () => ({
            command: 'echo',
            args: [],
            success: true,
            stdout: 'ok',
            stderr: '',
            code: 0,
        })),
    };
    const failingExecutor = {
        run: jest.fn(async () => ({
            command: 'echo',
            args: [],
            success: false,
            stdout: '',
            stderr: 'failed',
            code: 1,
        })),
    };
    const guardrails = {
        preDeploy: [
            {
                command: 'echo',
                args: ['"validate"'],
            },
        ],
        requiredHealthChecks: ['api-health', 'worker-heartbeat'],
    };
    const release = {
        flagKey: 'evoforge-agent',
        version: '1.0.0',
        artifactPath: '/tmp/agent.tar.gz',
        targetEnvironment: 'staging',
    };
    const mockPipeline = () => {
        const pipeline = {
            created: undefined,
            requests: [],
            createPipeline: jest.fn(async (config) => {
                pipeline.created = config;
                return { ...config, id: 'pipeline-1' };
            }),
            requestDeployment: jest.fn(async () => ({
                id: 'req-1',
                flagKey: release.flagKey,
                targetEnvironment: release.targetEnvironment,
                requestedBy: 'evoforge',
                requestedAt: new Date(),
                approvals: [],
                status: 'pending',
                rolloutPlan: {
                    strategy: 'canary',
                    phases: [],
                    rollbackPlan: {
                        strategy: 'gradual',
                        targetState: 'previous_version',
                        notificationDelay: 5,
                        postRollbackActions: [],
                    },
                    trafficSplitting: {
                        enabled: true,
                        initialPercentage: 10,
                        incrementPercentage: 10,
                        maxPercentage: 100,
                        duration: 5,
                    },
                },
                healthCheckResults: [],
                deploymentLog: [],
            })),
            triggerRollback: jest.fn(async () => undefined),
            getDeploymentRequest: jest.fn(),
        };
        return pipeline;
    };
    it('runs validations and requests deployment with rollout plan', async () => {
        const pipeline = mockPipeline();
        const metrics = new EvoForgeDeploymentEngine_1.DeploymentMetricsCollector();
        const engine = new EvoForgeDeploymentEngine_1.EvoForgeDeploymentEngine(flagManager, {
            pipeline,
            executor: successExecutor,
            metricsCollector: metrics,
        });
        const request = await engine.deployAgentRelease(release, guardrails);
        expect(pipeline.createPipeline).toHaveBeenCalledTimes(1);
        expect(pipeline.requestDeployment).toHaveBeenCalledWith(release.flagKey, release.targetEnvironment, 'evoforge', expect.objectContaining({ strategy: 'canary' }));
        expect(request.flagKey).toBe(release.flagKey);
        const snapshot = await engine.getMetrics();
        expect(snapshot.validations.passed).toBe(1);
        expect(snapshot.deployments.requested).toBe(1);
        expect(snapshot.deployments.failed).toBe(0);
    });
    it('fails deployment when validations fail', async () => {
        const pipeline = mockPipeline();
        const metrics = new EvoForgeDeploymentEngine_1.DeploymentMetricsCollector();
        const engine = new EvoForgeDeploymentEngine_1.EvoForgeDeploymentEngine(flagManager, {
            pipeline,
            executor: failingExecutor,
            metricsCollector: metrics,
        });
        await expect(engine.deployAgentRelease(release, guardrails)).rejects.toThrow('Pre-deployment validation failed');
        const snapshot = await engine.getMetrics();
        expect(snapshot.validations.failed).toBe(1);
        expect(snapshot.deployments.requested).toBe(0);
    });
    it('delegates rollback to the pipeline and records metrics', async () => {
        const pipeline = mockPipeline();
        const metrics = new EvoForgeDeploymentEngine_1.DeploymentMetricsCollector();
        const engine = new EvoForgeDeploymentEngine_1.EvoForgeDeploymentEngine(flagManager, {
            pipeline,
            executor: successExecutor,
            metricsCollector: metrics,
        });
        await engine.rollbackDeployment('req-1', 'manual rollback');
        expect(pipeline.triggerRollback).toHaveBeenCalledWith('req-1', 'manual rollback');
        const snapshot = await engine.getMetrics();
        expect(snapshot.deployments.rolledBack).toBe(1);
    });
});
