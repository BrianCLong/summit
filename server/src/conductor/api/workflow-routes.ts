// server/src/conductor/api/workflow-routes.ts

import { Router, Request, Response } from 'express';
import { workflowExecutor } from '../workflows/workflow-executor.js';
import {
  requirePermission,
  requireAnyPermission,
  AuthenticatedRequest,
} from '../auth/rbac-middleware.js';
import logger from '../../config/logger.js';

const router = Router();

/**
 * 🎭 WORKFLOW MANAGEMENT API: Comprehensive workflow execution and monitoring
 */

/**
 * Get available workflows
 */
router.get(
  '/workflows',
  requirePermission('workflow:read'),
  (req: Request, res: Response) => {
    try {
      const workflows = workflowExecutor.getAvailableWorkflows();

      res.json({
        success: true,
        data: workflows,
        meta: {
          total: workflows.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Failed to get available workflows', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflows',
        details: error.message,
      });
    }
  },
);

/**
 * Execute workflow by name
 */
router.post(
  '/workflows/:workflowName/execute',
  requirePermission('workflow:execute'),
  async (req: Request, res: Response) => {
    try {
      const { workflowName } = req.params;
      const { variables = {}, context = {} } = req.body;
      const user = (req as AuthenticatedRequest).user;

      const executionId = await workflowExecutor.executeWorkflow(
        workflowName,
        'manual',
        variables,
        {
          user_id: user.userId,
          tenant_id: user.tenantId || 'default',
          execution_context: {
            triggered_via: 'api',
            user_agent: req.headers['user-agent'],
            ip_address: req.ip,
            ...context,
          },
        },
      );

      logger.info('🚀 Workflow execution triggered via API', {
        workflowName,
        executionId,
        userId: user.userId,
        tenantId: user.tenantId,
      });

      res.json({
        success: true,
        data: {
          executionId,
          workflowName,
          status: 'pending',
          message: 'Workflow execution started successfully',
        },
      });
    } catch (error) {
      logger.error('❌ Failed to execute workflow', {
        workflowName: req.params.workflowName,
        error: error.message,
        userId: (req as AuthenticatedRequest).user?.userId,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to execute workflow',
        details: error.message,
      });
    }
  },
);

/**
 * Get workflow execution status
 */
router.get(
  '/executions/:executionId',
  requirePermission('workflow:read'),
  async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      const execution = await workflowExecutor.getExecutionStatus(executionId);

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found',
          executionId,
        });
      }

      // Check tenant isolation
      const user = (req as AuthenticatedRequest).user;
      if (
        execution.metadata.tenant_id !== user.tenantId &&
        !user.roles?.includes('admin')
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to execution from different tenant',
        });
      }

      res.json({
        success: true,
        data: execution,
      });
    } catch (error) {
      logger.error('❌ Failed to get execution status', {
        executionId: req.params.executionId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution status',
        details: error.message,
      });
    }
  },
);

/**
 * Cancel workflow execution
 */
router.post(
  '/executions/:executionId/cancel',
  requirePermission('workflow:execute'),
  async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      // First get the execution to check permissions
      const execution = await workflowExecutor.getExecutionStatus(executionId);
      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found',
        });
      }

      // Check tenant isolation and ownership
      if (
        execution.metadata.tenant_id !== user.tenantId &&
        !user.roles?.includes('admin')
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to execution from different tenant',
        });
      }

      await workflowExecutor.cancelExecution(executionId);

      logger.info('🛑 Workflow execution cancelled via API', {
        executionId,
        workflowName: execution.workflow_name,
        userId: user.userId,
      });

      res.json({
        success: true,
        message: 'Execution cancelled successfully',
        data: {
          executionId,
          status: 'cancelled',
        },
      });
    } catch (error) {
      logger.error('❌ Failed to cancel execution', {
        executionId: req.params.executionId,
        error: error.message,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to cancel execution',
        details: error.message,
      });
    }
  },
);

/**
 * List workflow executions with filtering and pagination
 */
router.get(
  '/executions',
  requirePermission('workflow:read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const {
        workflow_name,
        status,
        limit = '50',
        offset = '0',
        user_id,
        tenant_id,
      } = req.query;

      const filters: any = {
        limit: Math.min(parseInt(limit as string), 100),
        offset: parseInt(offset as string),
      };

      if (workflow_name) filters.workflow_name = workflow_name;
      if (status) filters.status = status;

      // Apply tenant isolation
      if (user.roles?.includes('admin')) {
        // Admins can specify tenant_id or see all
        if (tenant_id) filters.tenant_id = tenant_id;
      } else {
        // Regular users only see their tenant's executions
        filters.tenant_id = user.tenantId;
      }

      // Apply user isolation for non-admin users
      if (!user.roles?.includes('admin') && !user.roles?.includes('operator')) {
        filters.user_id = user.userId;
      } else if (user_id) {
        filters.user_id = user_id;
      }

      const result = await workflowExecutor.listExecutions(filters);

      res.json({
        success: true,
        data: result.executions,
        meta: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          filtered_by: Object.keys(filters).filter(
            (k) => k !== 'limit' && k !== 'offset',
          ),
        },
      });
    } catch (error) {
      logger.error('❌ Failed to list executions', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to list executions',
        details: error.message,
      });
    }
  },
);

/**
 * Get workflow execution metrics and statistics
 */
router.get(
  '/workflows/metrics',
  requirePermission('metrics:read'),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = '24h', workflow_name } = req.query;
      const user = (req as AuthenticatedRequest).user;

      // Mock metrics data - in production, aggregate from Redis/database
      const metrics = {
        timestamp: new Date().toISOString(),
        timeRange,
        workflow_name,
        summary: {
          total_executions: 1247,
          successful_executions: 1186,
          failed_executions: 61,
          success_rate: 95.1,
          average_duration_ms: 24567,
          total_runtime_hours: 8.52,
        },
        by_workflow: [
          {
            name: 'hello-world-health-check',
            executions: 288,
            success_rate: 99.7,
            avg_duration_ms: 1234,
            last_execution: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            name: 'hello-case-e2e-validation',
            executions: 48,
            success_rate: 95.8,
            avg_duration_ms: 187543,
            last_execution: new Date(
              Date.now() - 6 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
        by_status: {
          completed: 1186,
          failed: 61,
          running: 12,
          pending: 3,
          cancelled: 2,
        },
        performance: {
          p50_duration_ms: 15230,
          p95_duration_ms: 45120,
          p99_duration_ms: 89340,
          slowest_workflow: 'hello-case-e2e-validation',
          fastest_workflow: 'hello-world-health-check',
        },
        errors: [
          {
            workflow: 'hello-case-e2e-validation',
            error_type: 'timeout',
            count: 23,
            percentage: 37.7,
          },
          {
            workflow: 'data-pipeline-validation',
            error_type: 'dependency_failure',
            count: 18,
            percentage: 29.5,
          },
        ],
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('❌ Failed to get workflow metrics', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflow metrics',
        details: error.message,
      });
    }
  },
);

/**
 * Execute Hello World health check workflow
 */
router.post(
  '/workflows/hello-world/execute',
  requireAnyPermission('workflow:execute', 'workflow:health'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;

      const executionId = await workflowExecutor.executeWorkflow(
        'hello-world-health-check',
        'api-health-check',
        {
          test_message: `Health check triggered by ${user.email}`,
          expected_response_time_ms: 5000,
        },
        {
          user_id: user.userId,
          tenant_id: user.tenantId || 'default',
          execution_context: {
            triggered_via: 'health-api',
            user_agent: req.headers['user-agent'],
            purpose: 'system_health_verification',
          },
        },
      );

      logger.info('🏥 Hello World health check triggered', {
        executionId,
        userId: user.userId,
      });

      res.json({
        success: true,
        data: {
          executionId,
          workflowName: 'hello-world-health-check',
          status: 'pending',
          message: 'Health check workflow started',
          checkUrl: `/api/conductor/executions/${executionId}`,
        },
      });
    } catch (error) {
      logger.error('❌ Failed to execute Hello World health check', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to execute health check',
        details: error.message,
      });
    }
  },
);

/**
 * Execute Hello Case end-to-end validation workflow
 */
router.post(
  '/workflows/hello-case/execute',
  requirePermission('workflow:execute'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { analysis_target = 'Example Technology Company' } = req.body;

      const executionId = await workflowExecutor.executeWorkflow(
        'hello-case-e2e-validation',
        'api-e2e-test',
        {
          test_case_id: `hello-case-${Date.now()}`,
          analysis_target,
          evidence_sources: ['web', 'social', 'public_records'],
          confidence_threshold: 0.75,
          max_budget_usd: 10.0,
        },
        {
          user_id: user.userId,
          tenant_id: user.tenantId || 'default',
          execution_context: {
            triggered_via: 'e2e-api',
            user_agent: req.headers['user-agent'],
            purpose: 'end_to_end_validation',
          },
        },
      );

      logger.info('🔍 Hello Case E2E validation triggered', {
        executionId,
        analysisTarget: analysis_target,
        userId: user.userId,
      });

      res.json({
        success: true,
        data: {
          executionId,
          workflowName: 'hello-case-e2e-validation',
          status: 'pending',
          analysis_target,
          message: 'End-to-end validation workflow started',
          estimatedDuration: '5-8 minutes',
          checkUrl: `/api/conductor/executions/${executionId}`,
        },
      });
    } catch (error) {
      logger.error('❌ Failed to execute Hello Case E2E validation', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to execute E2E validation',
        details: error.message,
      });
    }
  },
);

/**
 * Get workflow execution logs (simplified implementation)
 */
router.get(
  '/executions/:executionId/logs',
  requirePermission('workflow:read'),
  async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;
      const { level = 'info', limit = '100' } = req.query;

      // Mock logs - in production, fetch from centralized logging system
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Workflow execution started',
          execution_id: executionId,
          task: null,
        },
        {
          timestamp: new Date(Date.now() - 30000).toISOString(),
          level: 'info',
          message: 'Executing task: api_health_check',
          execution_id: executionId,
          task: 'api_health_check',
        },
        {
          timestamp: new Date(Date.now() - 25000).toISOString(),
          level: 'info',
          message: 'Task completed successfully',
          execution_id: executionId,
          task: 'api_health_check',
          duration_ms: 1234,
        },
      ];

      res.json({
        success: true,
        data: logs.slice(0, parseInt(limit as string)),
        meta: {
          total: logs.length,
          level,
          execution_id: executionId,
        },
      });
    } catch (error) {
      logger.error('❌ Failed to get execution logs', {
        executionId: req.params.executionId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution logs',
        details: error.message,
      });
    }
  },
);

export { router as workflowRoutes };
