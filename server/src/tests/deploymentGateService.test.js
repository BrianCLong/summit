"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
let DeploymentGateService;
describe('DeploymentGateService', () => {
    beforeAll(async () => {
        globals_1.jest.unstable_mockModule('../../config/logger', () => ({
            logger: {
                info: globals_1.jest.fn(),
                warn: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
            },
        }));
        ({ DeploymentGateService } = await Promise.resolve().then(() => __importStar(require('../conductor/deployment/deploymentGateService'))));
    });
    const buildContext = {
        buildId: 'build-123',
        environment: 'pre-production',
        stagingEnvironment: 'staging',
        requestedBy: 'release.bot',
        releaseTag: 'v2024.10.01',
    };
    const asyncContextMock = (value) => globals_1.jest
        .fn()
        .mockResolvedValue(value);
    const asyncDiffMock = (value) => globals_1.jest
        .fn()
        .mockResolvedValue(value);
    const slackMock = () => globals_1.jest
        .fn()
        .mockResolvedValue(undefined);
    const createAdapters = (overrides = {}) => {
        const logger = {
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
        };
        const base = {
            migrations: {
                getPendingMigrations: asyncContextMock([]),
                getFailedMigrations: asyncContextMock([]),
            },
            readiness: {
                getUnhealthyServices: asyncContextMock([]),
            },
            configuration: {
                diffEnvironments: asyncDiffMock([]),
            },
            smokeTests: {
                run: asyncContextMock({
                    passed: true,
                    durationMs: 1200,
                }),
            },
            api: {
                getBreakingChanges: asyncContextMock([]),
            },
            release: {
                hasRollbackPlan: asyncContextMock(true),
            },
            approvals: {
                getMaintainerApprovals: asyncContextMock([
                    {
                        user: 'alice',
                        role: 'maintainer',
                        approvedAt: new Date().toISOString(),
                    },
                    {
                        user: 'bob',
                        role: 'maintainer',
                        approvedAt: new Date().toISOString(),
                    },
                ]),
            },
            slack: {
                notify: slackMock(),
            },
            logger,
            ...overrides,
        };
        return base;
    };
    it('passes validation when all checks succeed', async () => {
        const adapters = createAdapters();
        const service = new DeploymentGateService(adapters);
        const report = await service.validate(buildContext);
        expect(report.status).toBe('pass');
        expect(report.blocked).toBe(false);
        expect(report.checks).toHaveLength(7);
        expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
        expect(adapters.slack.notify).not.toHaveBeenCalled();
        expect(adapters.logger.info).toHaveBeenCalledWith(expect.objectContaining({
            event: 'deployment_gate_completed',
            status: 'pass',
        }), 'Deployment gate validation completed');
    });
    it('blocks deployment and notifies Slack when any check fails', async () => {
        const adapters = createAdapters({
            readiness: {
                getUnhealthyServices: asyncContextMock([
                    'api-service',
                    'worker',
                ]),
            },
            smokeTests: {
                run: asyncContextMock({
                    passed: false,
                    failures: ['GET /health returned 500'],
                }),
            },
            approvals: {
                getMaintainerApprovals: asyncContextMock([
                    {
                        user: 'alice',
                        role: 'maintainer',
                        approvedAt: new Date().toISOString(),
                    },
                ]),
            },
        });
        const service = new DeploymentGateService(adapters);
        const report = await service.validate(buildContext);
        expect(report.status).toBe('fail');
        expect(report.blocked).toBe(true);
        expect(report.checks.some((check) => check.status === 'fail')).toBe(true);
        expect(adapters.slack.notify).toHaveBeenCalledWith('🚫 Deployment blocked', expect.objectContaining({
            buildId: buildContext.buildId,
            environment: buildContext.environment,
            failures: expect.any(Array),
        }));
        expect(adapters.logger.error).not.toHaveBeenCalledWith(expect.objectContaining({
            event: 'deployment_gate_slack_notification_failed',
        }), expect.any(String));
    });
    it('requires the configured number of maintainer approvals', async () => {
        const adapters = createAdapters({
            approvals: {
                getMaintainerApprovals: asyncContextMock([
                    {
                        user: 'alice',
                        role: 'maintainer',
                        approvedAt: new Date().toISOString(),
                    },
                    {
                        user: 'sam',
                        role: 'contributor',
                        approvedAt: new Date().toISOString(),
                    },
                ]),
            },
        });
        const service = new DeploymentGateService(adapters, {
            requiredMaintainerApprovals: 2,
        });
        const report = await service.validate(buildContext);
        const approvalsCheck = report.checks.find((check) => check.name === 'Maintainer approvals');
        expect(approvalsCheck?.status).toBe('fail');
        expect(approvalsCheck?.details).toContain('1/2');
        expect(report.blocked).toBe(true);
    });
});
