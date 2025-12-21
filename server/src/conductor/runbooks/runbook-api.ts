// Runbook API for Conductor
// Provides endpoints for managing signed runbooks and approval workflows

import express from 'express';
import {
  runbookRegistry,
  Runbook,
  RunbookStep,
  ApprovalWorkflow,
} from './registry';
import { prometheusConductorMetrics } from '../observability/prometheus';
import crypto from 'crypto';

export const runbookRouter = express.Router();

interface CreateRunbookRequest {
  name: string;
  description: string;
  category:
    | 'incident_response'
    | 'maintenance'
    | 'security'
    | 'deployment'
    | 'backup'
    | 'monitoring';
  severity: 'low' | 'medium' | 'high' | 'critical';
  approvalRequired?: boolean;
  steps: RunbookStep[];
  tags?: string[];
  tenantId?: string;
  businessUnit?: string;
}

/**
 * Create new runbook
 */
runbookRouter.post('/create', async (req, res) => {
  const startTime = Date.now();

  try {
    const createRequest: CreateRunbookRequest = req.body;
    const author = req.user?.sub || 'unknown';

    // Validation
    if (
      !createRequest.name ||
      !createRequest.description ||
      !createRequest.steps?.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and steps are required',
        processingTime: Date.now() - startTime,
      });
    }

    // Generate runbook ID and version
    const runbookId = crypto.randomUUID();
    const version = '1.0.0';

    const runbook: Omit<Runbook, 'signature'> = {
      id: runbookId,
      name: createRequest.name,
      version,
      description: createRequest.description,
      category: createRequest.category,
      severity: createRequest.severity,
      approvalRequired:
        createRequest.approvalRequired ?? createRequest.severity !== 'low',
      steps: createRequest.steps.map((step, index) => ({
        ...step,
        id: step.id || crypto.randomUUID(),
        order: index + 1,
      })),
      metadata: {
        author,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: createRequest.tags || [],
        tenantId: createRequest.tenantId,
        businessUnit: createRequest.businessUnit,
      },
      approvals: [],
    };

    // Register runbook
    const signatureHash = await runbookRegistry.registerRunbook(
      runbook,
      author,
    );

    const response = {
      success: true,
      runbookId,
      version,
      signatureHash,
      message: 'Runbook created and signed successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent('runbook_created', true);
    prometheusConductorMetrics.recordOperationalMetric(
      'runbook_creation_time',
      response.processingTime,
    );

    res.status(201).json(response);
  } catch (error) {
    console.error('Runbook creation error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_creation_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to create runbook',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get runbook by ID
 */
runbookRouter.get('/:runbookId', async (req, res) => {
  try {
    const { runbookId } = req.params;
    const { version } = req.query;

    const runbook = await runbookRegistry.getRunbook(
      runbookId,
      version as string,
    );

    if (!runbook) {
      return res.status(404).json({
        success: false,
        message: 'Runbook not found',
      });
    }

    // Check tenant access if applicable
    const requestingTenantId = req.headers['x-tenant-id'] as string;
    if (
      runbook.metadata.tenantId &&
      runbook.metadata.tenantId !== requestingTenantId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    res.json({
      success: true,
      runbook,
    });
  } catch (error) {
    console.error('Runbook retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve runbook',
    });
  }
});

/**
 * List runbooks
 */
runbookRouter.get('/', async (req, res) => {
  try {
    const { category, tenantId } = req.query;

    const runbooks = await runbookRegistry.listRunbooks(
      category as string,
      tenantId as string,
    );

    res.json({
      success: true,
      runbooks,
      total: runbooks.length,
    });
  } catch (error) {
    console.error('Runbook listing error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to list runbooks',
    });
  }
});

/**
 * Execute runbook
 */
runbookRouter.post('/:runbookId/execute', async (req, res) => {
  const startTime = Date.now();

  try {
    const { runbookId } = req.params;
    const { version, context, priority } = req.body;
    const executorId = req.user?.sub || 'unknown';
    const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const executionId = await runbookRegistry.executeRunbook(
      runbookId,
      executorId,
      tenantId,
      context,
      version,
    );

    const response = {
      success: true,
      executionId,
      message: 'Runbook execution initiated',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent('runbook_executed', true);
    prometheusConductorMetrics.recordOperationalMetric(
      'runbook_execution_time',
      response.processingTime,
    );

    res.json(response);
  } catch (error) {
    console.error('Runbook execution error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_execution_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to execute runbook',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get execution status
 */
runbookRouter.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const execution = await runbookRegistry.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    // Check tenant access
    const requestingTenantId = req.headers['x-tenant-id'] as string;
    if (execution.tenantId !== requestingTenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    res.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('Execution retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve execution',
    });
  }
});

/**
 * Process approval for runbook execution
 */
runbookRouter.post('/approvals/:approvalId/process', async (req, res) => {
  const startTime = Date.now();

  try {
    const { approvalId } = req.params;
    const { decision, comments } = req.body;
    const approverId = req.user?.sub || 'unknown';

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be "approved" or "rejected"',
      });
    }

    const result = await runbookRegistry.processApproval(
      approvalId,
      approverId,
      decision,
      comments,
    );

    const response = {
      ...result,
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_approval_processed',
      result.success,
    );

    if (result.success) {
      prometheusConductorMetrics.recordOperationalEvent(
        `runbook_${decision}`,
        true,
      );
    }

    res.json(response);
  } catch (error) {
    console.error('Approval processing error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_approval_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to process approval',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Update runbook (creates new version)
 */
runbookRouter.put('/:runbookId', async (req, res) => {
  const startTime = Date.now();

  try {
    const { runbookId } = req.params;
    const updateRequest: CreateRunbookRequest & {
      versionIncrement?: 'patch' | 'minor' | 'major';
    } = req.body;
    const author = req.user?.sub || 'unknown';

    // Get current runbook to determine new version
    const currentRunbook = await runbookRegistry.getRunbook(runbookId);
    if (!currentRunbook) {
      return res.status(404).json({
        success: false,
        message: 'Runbook not found',
      });
    }

    // Generate new version
    const versionParts = currentRunbook.version.split('.').map(Number);
    const increment = updateRequest.versionIncrement || 'patch';

    switch (increment) {
      case 'major':
        versionParts[0]++;
        versionParts[1] = 0;
        versionParts[2] = 0;
        break;
      case 'minor':
        versionParts[1]++;
        versionParts[2] = 0;
        break;
      case 'patch':
      default:
        versionParts[2]++;
        break;
    }

    const newVersion = versionParts.join('.');

    const updatedRunbook: Omit<Runbook, 'signature'> = {
      id: runbookId,
      name: updateRequest.name || currentRunbook.name,
      version: newVersion,
      description: updateRequest.description || currentRunbook.description,
      category: updateRequest.category || currentRunbook.category,
      severity: updateRequest.severity || currentRunbook.severity,
      approvalRequired:
        updateRequest.approvalRequired ?? currentRunbook.approvalRequired,
      steps: updateRequest.steps || currentRunbook.steps,
      metadata: {
        ...currentRunbook.metadata,
        updatedAt: Date.now(),
        tags: updateRequest.tags || currentRunbook.metadata.tags,
        tenantId: updateRequest.tenantId || currentRunbook.metadata.tenantId,
        businessUnit:
          updateRequest.businessUnit || currentRunbook.metadata.businessUnit,
      },
      approvals: [],
    };

    // Register new version
    const signatureHash = await runbookRegistry.registerRunbook(
      updatedRunbook,
      author,
    );

    const response = {
      success: true,
      runbookId,
      version: newVersion,
      signatureHash,
      message: 'Runbook updated successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent('runbook_updated', true);

    res.json(response);
  } catch (error) {
    console.error('Runbook update error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_update_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to update runbook',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Validate runbook signature
 */
runbookRouter.post('/:runbookId/validate', async (req, res) => {
  try {
    const { runbookId } = req.params;
    const { version } = req.query;

    const runbook = await runbookRegistry.getRunbook(
      runbookId,
      version as string,
    );

    if (!runbook) {
      return res.status(404).json({
        success: false,
        message: 'Runbook not found',
      });
    }

    // Signature verification is done automatically in getRunbook
    // If we get here, the signature is valid
    res.json({
      success: true,
      valid: true,
      signature: {
        algorithm: runbook.signature.algorithm,
        hash: runbook.signature.hash,
        signer: runbook.signature.signer,
        timestamp: runbook.signature.timestamp,
      },
      message: 'Runbook signature is valid',
    });
  } catch (error) {
    console.error('Runbook validation error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to validate runbook',
    });
  }
});

/**
 * Get runbook categories and statistics
 */
runbookRouter.get('/stats/overview', async (req, res) => {
  try {
    const { tenantId } = req.query;

    const allRunbooks = await runbookRegistry.listRunbooks(
      undefined,
      tenantId as string,
    );

    // Calculate statistics
    const stats = {
      totalRunbooks: allRunbooks.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recentActivity: {
        created: 0,
        executed: 0,
      },
    };

    // Count by category and severity
    allRunbooks.forEach((runbook) => {
      stats.byCategory[runbook.category] =
        (stats.byCategory[runbook.category] || 0) + 1;
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Stats retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
    });
  }
});

/**
 * Health check
 */
runbookRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    service: 'runbook-api',
  });
});

// Request logging middleware
runbookRouter.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `Runbook API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );

    prometheusConductorMetrics.recordOperationalMetric(
      'runbook_api_request_duration',
      duration,
    );
    prometheusConductorMetrics.recordOperationalEvent(
      `runbook_api_${req.method.toLowerCase()}`,
      res.statusCode < 400,
    );
  });

  next();
});

export default runbookRouter;
