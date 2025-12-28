/**
 * Plugin Installation Saga
 *
 * Example saga for installing a plugin with rollback support.
 * Demonstrates the saga pattern for distributed transactions.
 *
 * SOC 2 Controls: CC5.2 (Process Integrity), CC7.2 (Change Management)
 *
 * @module saga/examples/PluginInstallationSaga
 */

import { createSaga, SagaOrchestrator } from '../SagaOrchestrator.js';
import { createStep } from '../SagaStep.js';
import { SagaRepository } from '../SagaRepository.js';
import logger from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface PluginInstallPayload {
  pluginId: string;
  pluginVersion: string;
  tenantId: string;
  userId: string;
  config: Record<string, unknown>;
  permissions: string[];
}

export interface PluginInstallResult {
  installationId: string;
  pluginId: string;
  tenantId: string;
  status: 'active';
  installedAt: string;
}

// ============================================================================
// Step Definitions
// ============================================================================

/**
 * Step 1: Validate plugin and tenant permissions
 */
const validateStep = createStep<PluginInstallPayload, { validated: boolean }>('validate-plugin')
  .description('Validate plugin compatibility and tenant permissions')
  .execute(async (context) => {
    const { payload } = context;

    logger.info(
      { pluginId: payload.pluginId, tenantId: payload.tenantId },
      'Validating plugin installation'
    );

    // Simulate validation
    // In real implementation: check plugin exists, is compatible, tenant has permission
    const isValid = payload.pluginId && payload.tenantId;

    if (!isValid) {
      return {
        success: false,
        error: 'Plugin validation failed',
      };
    }

    return {
      success: true,
      result: { validated: true },
      compensationData: null, // No compensation needed for validation
    };
  })
  .compensate(async () => {
    // Validation has no side effects, nothing to compensate
    return { success: true };
  })
  .timeout(5000)
  .build();

/**
 * Step 2: Reserve resources for the plugin
 */
const reserveResourcesStep = createStep<PluginInstallPayload, { reservationId: string }>('reserve-resources')
  .description('Reserve compute and storage resources for the plugin')
  .execute(async (context) => {
    const { payload } = context;

    logger.info(
      { pluginId: payload.pluginId, tenantId: payload.tenantId },
      'Reserving resources for plugin'
    );

    // Simulate resource reservation
    const reservationId = `res-${Date.now()}`;

    return {
      success: true,
      result: { reservationId },
      compensationData: { reservationId },
    };
  })
  .compensate(async (context, compensationData) => {
    const { reservationId } = compensationData as { reservationId: string };

    logger.info(
      { reservationId },
      'Releasing reserved resources'
    );

    // Simulate resource release
    // In real implementation: call resource manager to release

    return { success: true };
  })
  .retry(2, 1000)
  .timeout(10000)
  .build();

/**
 * Step 3: Deploy plugin container/sandbox
 */
const deployPluginStep = createStep<PluginInstallPayload, { deploymentId: string }>('deploy-plugin')
  .description('Deploy the plugin in isolated sandbox')
  .execute(async (context) => {
    const { payload, previousResults } = context;
    const reservationResult = previousResults.get('reserve-resources') as { reservationId: string };

    logger.info(
      { pluginId: payload.pluginId, reservationId: reservationResult?.reservationId },
      'Deploying plugin'
    );

    // Simulate deployment
    const deploymentId = `deploy-${Date.now()}`;

    return {
      success: true,
      result: { deploymentId },
      compensationData: { deploymentId, reservationId: reservationResult?.reservationId },
    };
  })
  .compensate(async (context, compensationData) => {
    const { deploymentId } = compensationData as { deploymentId: string };

    logger.info(
      { deploymentId },
      'Removing plugin deployment'
    );

    // Simulate deployment removal
    // In real implementation: call orchestrator to remove deployment

    return { success: true };
  })
  .retry(3, 2000)
  .timeout(60000)
  .build();

/**
 * Step 4: Configure plugin with tenant settings
 */
const configurePluginStep = createStep<PluginInstallPayload, { configId: string }>('configure-plugin')
  .description('Apply tenant-specific plugin configuration')
  .execute(async (context) => {
    const { payload, previousResults } = context;
    const deploymentResult = previousResults.get('deploy-plugin') as { deploymentId: string };

    logger.info(
      { pluginId: payload.pluginId, deploymentId: deploymentResult?.deploymentId },
      'Configuring plugin'
    );

    // Simulate configuration
    const configId = `cfg-${Date.now()}`;

    return {
      success: true,
      result: { configId },
      compensationData: { configId, deploymentId: deploymentResult?.deploymentId },
    };
  })
  .compensate(async (context, compensationData) => {
    const { configId } = compensationData as { configId: string };

    logger.info(
      { configId },
      'Removing plugin configuration'
    );

    // Simulate config removal
    // In real implementation: remove config from database

    return { success: true };
  })
  .timeout(10000)
  .build();

/**
 * Step 5: Grant permissions to plugin
 */
const grantPermissionsStep = createStep<PluginInstallPayload, { permissionGrants: string[] }>('grant-permissions')
  .description('Grant requested permissions to the plugin')
  .execute(async (context) => {
    const { payload } = context;

    logger.info(
      { pluginId: payload.pluginId, permissions: payload.permissions },
      'Granting permissions to plugin'
    );

    // Simulate permission grants
    const permissionGrants = payload.permissions.map(p => `grant-${p}-${Date.now()}`);

    return {
      success: true,
      result: { permissionGrants },
      compensationData: { permissionGrants, tenantId: payload.tenantId, pluginId: payload.pluginId },
    };
  })
  .compensate(async (context, compensationData) => {
    const { permissionGrants, pluginId } = compensationData as {
      permissionGrants: string[];
      tenantId: string;
      pluginId: string;
    };

    logger.info(
      { pluginId, grantCount: permissionGrants.length },
      'Revoking plugin permissions'
    );

    // Simulate permission revocation
    // In real implementation: revoke from RBAC system

    return { success: true };
  })
  .timeout(5000)
  .build();

/**
 * Step 6: Activate and register plugin
 */
const activatePluginStep = createStep<PluginInstallPayload, PluginInstallResult>('activate-plugin')
  .description('Activate the plugin and update registry')
  .execute(async (context) => {
    const { payload, previousResults } = context;

    const deploymentResult = previousResults.get('deploy-plugin') as { deploymentId: string };
    const configResult = previousResults.get('configure-plugin') as { configId: string };

    logger.info(
      { pluginId: payload.pluginId, deploymentId: deploymentResult?.deploymentId },
      'Activating plugin'
    );

    // Simulate activation
    const result: PluginInstallResult = {
      installationId: `inst-${Date.now()}`,
      pluginId: payload.pluginId,
      tenantId: payload.tenantId,
      status: 'active',
      installedAt: new Date().toISOString(),
    };

    return {
      success: true,
      result,
      compensationData: {
        installationId: result.installationId,
        pluginId: payload.pluginId,
        tenantId: payload.tenantId,
      },
    };
  })
  .compensate(async (context, compensationData) => {
    const { installationId, pluginId } = compensationData as {
      installationId: string;
      pluginId: string;
      tenantId: string;
    };

    logger.info(
      { installationId, pluginId },
      'Deactivating plugin'
    );

    // Simulate deactivation
    // In real implementation: mark as inactive in registry

    return { success: true };
  })
  .timeout(10000)
  .build();

// ============================================================================
// Saga Factory
// ============================================================================

/**
 * Create a new plugin installation saga
 */
export function createPluginInstallationSaga(
  repository?: SagaRepository
): SagaOrchestrator<PluginInstallPayload, PluginInstallResult> {
  const builder = createSaga<PluginInstallPayload, PluginInstallResult>('plugin-installation')
    .description('Install and configure a plugin for a tenant')
    .maxExecutionTime(120000) // 2 minutes
    .persistState(true)
    .compensateOnFailure(true)
    .step(validateStep)
    .step(reserveResourcesStep)
    .step(deployPluginStep)
    .step(configurePluginStep)
    .step(grantPermissionsStep)
    .step(activatePluginStep);

  if (repository) {
    builder.repository(repository);
  }

  return builder.build();
}

export default createPluginInstallationSaga;
