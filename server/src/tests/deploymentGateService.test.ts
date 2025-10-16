import { jest } from '@jest/globals';
import {
  DeploymentGateService,
  DeploymentGateAdapters,
  DeploymentValidationContext,
  MaintainerApproval,
  ConfigDrift,
  SmokeTestResult,
  ApiChange,
} from '../conductor/deployment/deploymentGateService';

describe('DeploymentGateService', () => {
  const buildContext: DeploymentValidationContext = {
    buildId: 'build-123',
    environment: 'pre-production',
    stagingEnvironment: 'staging',
    requestedBy: 'release.bot',
    releaseTag: 'v2024.10.01',
  };

  const asyncContextMock = <T>(value: T) =>
    jest
      .fn<(context: DeploymentValidationContext) => Promise<T>>()
      .mockResolvedValue(value);

  const asyncDiffMock = <T>(value: T) =>
    jest
      .fn<
        (
          source: string,
          target: string,
          context: DeploymentValidationContext,
        ) => Promise<T>
      >()
      .mockResolvedValue(value);

  const slackMock = () =>
    jest
      .fn<
        (message: string, payload: Record<string, unknown>) => Promise<void>
      >()
      .mockResolvedValue(undefined);

  const createAdapters = (
    overrides: Partial<Record<keyof DeploymentGateAdapters, any>> = {},
  ): DeploymentGateAdapters => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const base = {
      migrations: {
        getPendingMigrations: asyncContextMock<string[]>([]),
        getFailedMigrations: asyncContextMock<string[]>([]),
      },
      readiness: {
        getUnhealthyServices: asyncContextMock<string[]>([]),
      },
      configuration: {
        diffEnvironments: asyncDiffMock<ConfigDrift[]>([]),
      },
      smokeTests: {
        run: asyncContextMock<SmokeTestResult>({
          passed: true,
          durationMs: 1200,
        }),
      },
      api: {
        getBreakingChanges: asyncContextMock<ApiChange[]>([]),
      },
      release: {
        hasRollbackPlan: asyncContextMock<boolean>(true),
      },
      approvals: {
        getMaintainerApprovals: asyncContextMock<MaintainerApproval[]>([
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
    } as unknown as DeploymentGateAdapters;

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
    expect(adapters.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'deployment_gate_completed',
        status: 'pass',
      }),
      'Deployment gate validation completed',
    );
  });

  it('blocks deployment and notifies Slack when any check fails', async () => {
    const adapters = createAdapters({
      readiness: {
        getUnhealthyServices: asyncContextMock<string[]>([
          'api-service',
          'worker',
        ]),
      },
      smokeTests: {
        run: asyncContextMock<SmokeTestResult>({
          passed: false,
          failures: ['GET /health returned 500'],
        }),
      },
      approvals: {
        getMaintainerApprovals: asyncContextMock<MaintainerApproval[]>([
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
    expect(adapters.slack.notify).toHaveBeenCalledWith(
      '🚫 Deployment blocked',
      expect.objectContaining({
        buildId: buildContext.buildId,
        environment: buildContext.environment,
        failures: expect.any(Array),
      }),
    );
    expect(adapters.logger.error).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'deployment_gate_slack_notification_failed',
      }),
      expect.any(String),
    );
  });

  it('requires the configured number of maintainer approvals', async () => {
    const adapters = createAdapters({
      approvals: {
        getMaintainerApprovals: asyncContextMock<MaintainerApproval[]>([
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

    const approvalsCheck = report.checks.find(
      (check) => check.name === 'Maintainer approvals',
    );
    expect(approvalsCheck?.status).toBe('fail');
    expect(approvalsCheck?.details).toContain('1/2');
    expect(report.blocked).toBe(true);
  });
});
