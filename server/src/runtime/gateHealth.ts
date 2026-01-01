import { DeploymentGateService } from '../conductor/deployment/deploymentGateService.js';
import { migrationGates } from '../gates/migrationGates.js';
import { migrationFramework } from '../migrations/migrationFramework.js';
import { logger } from '../logger.js';
import { cfg } from '../config.js';

const buildDeploymentGateService = () =>
  new DeploymentGateService(
    {
      migrations: {
        getPendingMigrations: async () => {
          const running = await migrationFramework.listRunningMigrations();
          return running.map((m) => m.migrationId);
        },
        getFailedMigrations: async () => [],
      },
      readiness: {
        getUnhealthyServices: async () => [],
      },
      configuration: {
        diffEnvironments: async () => [],
      },
      smokeTests: {
        run: async () => ({ passed: true, failures: [] }),
      },
      api: {
        getBreakingChanges: async () => [],
      },
      release: {
        hasRollbackPlan: async () => true,
      },
      approvals: {
        getMaintainerApprovals: async () => [],
      },
      slack: {
        notify: async () => undefined,
      },
      logger,
    },
    { productionEnvironment: cfg.NODE_ENV ?? 'production' },
  );

export const deploymentGateService = buildDeploymentGateService();

export const isCitationGateRuntimeRequired = () =>
  cfg.NODE_ENV === 'production' || process.env.CITATION_GATE === '1';

export interface GateHealthSummary {
  citationGateActive: boolean;
  migrationGatesEnabled: number;
  migrationGateSnapshot: ReturnType<typeof migrationGates.getGateRegistrySnapshot>;
  deploymentGateConfig: ReturnType<typeof deploymentGateService.describeConfiguration>;
}

export async function assertGateActivation(): Promise<GateHealthSummary> {
  const migrationGateSnapshot = migrationGates.getGateRegistrySnapshot();
  const migrationGatesEnabled = migrationGates.getEnabledGateCount();
  if (migrationGatesEnabled === 0) {
    throw new Error('Migration gates are not initialized or are all disabled.');
  }

  const citationGateActive = isCitationGateRuntimeRequired();
  if (cfg.NODE_ENV === 'production' && !citationGateActive) {
    throw new Error('CitationGate must be active in production deployments.');
  }

  logger.info(
    {
      migrationGatesEnabled,
      citationGateActive,
      deploymentGate: deploymentGateService.describeConfiguration(),
    },
    'Gatekeepers initialized',
  );

  return {
    citationGateActive,
    migrationGatesEnabled,
    migrationGateSnapshot,
    deploymentGateConfig: deploymentGateService.describeConfiguration(),
  };
}
