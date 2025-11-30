/**
 * Case Workflow API Routes
 * RESTful API endpoints for case workflow operations
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { CaseWorkflowService } from '../cases/workflow/index.js';
import logger from '../config/logger.js';

const routeLogger = logger.child({ name: 'CaseWorkflowRoutes' });

export function createCaseWorkflowRouter(pg: Pool): Router {
  const router = Router();
  const workflowService = new CaseWorkflowService(pg);

  // ==================== WORKFLOW TRANSITIONS ====================

  /**
   * POST /api/cases/:id/transition
   * Transition case to a new stage
   */
  router.post('/cases/:id/transition', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const { toStage, reason, legalBasis, metadata } = req.body;
      const userId = req.user?.id || 'unknown'; // TODO: Get from auth context

      if (!toStage || !reason) {
        return res.status(400).json({
          error: 'toStage and reason are required',
        });
      }

      const result = await workflowService.transitionStage(
        {
          caseId,
          toStage,
          userId,
          reason,
          legalBasis,
          metadata,
        },
        {
          legalBasis: legalBasis || 'investigation',
        },
      );

      if (!result.success) {
        return res.status(400).json({
          error: 'Transition failed',
          errors: result.errors,
        });
      }

      res.json({
        success: true,
        newStage: result.newStage,
        newStatus: result.newStatus,
        warnings: result.warnings,
      });
    } catch (error) {
      routeLogger.error({ error }, 'Stage transition failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/cases/:id/available-transitions
   * Get available transitions for a case
   */
  router.get('/cases/:id/available-transitions', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const userId = req.user?.id || 'unknown';

      const transitions = await workflowService.getAvailableTransitions(
        caseId,
        userId,
      );

      res.json({ transitions });
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get available transitions');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== TASK MANAGEMENT ====================

  /**
   * POST /api/cases/:id/tasks
   * Create a task
   */
  router.post('/cases/:id/tasks', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const {
        title,
        description,
        taskType,
        priority,
        assignedTo,
        dueDate,
        requiredRoleId,
        metadata,
      } = req.body;
      const userId = req.user?.id || 'unknown';

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const task = await workflowService.createTask(
        {
          caseId,
          title,
          description,
          taskType,
          priority,
          assignedTo,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          requiredRoleId,
          metadata,
          createdBy: userId,
        },
        {
          legalBasis: 'investigation',
          reason: `Task created: ${title}`,
        },
      );

      res.status(201).json(task);
    } catch (error) {
      routeLogger.error({ error }, 'Task creation failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/cases/:id/tasks
   * List tasks for a case
   */
  router.get('/cases/:id/tasks', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const { status, priority, assignedTo } = req.query;

      const tasks = await workflowService.listTasks({
        caseId,
        status: status as any,
        priority: priority as any,
        assignedTo: assignedTo as string,
      });

      res.json(tasks);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to list tasks');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/tasks/:id/assign
   * Assign task to user
   */
  router.put('/tasks/:id/assign', async (req, res) => {
    try {
      const { id: taskId } = req.params;
      const { userId: assignedTo } = req.body;
      const userId = req.user?.id || 'unknown';

      if (!assignedTo) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const task = await workflowService.assignTask(taskId, assignedTo, userId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      routeLogger.error({ error }, 'Task assignment failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/tasks/:id/complete
   * Complete a task
   */
  router.put('/tasks/:id/complete', async (req, res) => {
    try {
      const { id: taskId } = req.params;
      const { resultData } = req.body;
      const userId = req.user?.id || 'unknown';

      const task = await workflowService.completeTask(taskId, userId, resultData);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      routeLogger.error({ error }, 'Task completion failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/cases/:id/tasks/overdue
   * Get overdue tasks for a case
   */
  router.get('/cases/:id/tasks/overdue', async (req, res) => {
    try {
      const { id: caseId } = req.params;

      const overdueTasks = await workflowService.getOverdueTasks(caseId);

      res.json(overdueTasks);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get overdue tasks');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== PARTICIPANT MANAGEMENT ====================

  /**
   * POST /api/cases/:id/participants
   * Add participant to case
   */
  router.post('/cases/:id/participants', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const { userId, roleId, metadata } = req.body;
      const assignedBy = req.user?.id || 'unknown';

      if (!userId || !roleId) {
        return res.status(400).json({ error: 'userId and roleId are required' });
      }

      const participant = await workflowService.addParticipant({
        caseId,
        userId,
        roleId,
        assignedBy,
        metadata,
      });

      res.status(201).json(participant);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to add participant');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/cases/:id/participants
   * Get case participants
   */
  router.get('/cases/:id/participants', async (req, res) => {
    try {
      const { id: caseId } = req.params;

      const participants = await workflowService.getCaseParticipants(caseId);

      res.json(participants);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get participants');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/cases/:caseId/participants/:userId/:roleId
   * Remove participant from case
   */
  router.delete('/cases/:caseId/participants/:userId/:roleId', async (req, res) => {
    try {
      const { caseId, userId, roleId } = req.params;
      const removedBy = req.user?.id || 'unknown';

      const participant = await workflowService.removeParticipant(
        caseId,
        userId,
        roleId,
        removedBy,
      );

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      res.json(participant);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to remove participant');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== APPROVAL MANAGEMENT ====================

  /**
   * POST /api/cases/:id/approvals
   * Request approval
   */
  router.post('/cases/:id/approvals', async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const {
        taskId,
        approvalType,
        requiredApprovers,
        requiredRoleId,
        reason,
        metadata,
      } = req.body;
      const userId = req.user?.id || 'unknown';

      if (!approvalType || !reason) {
        return res.status(400).json({
          error: 'approvalType and reason are required',
        });
      }

      const approval = await workflowService.requestApproval({
        caseId,
        taskId,
        approvalType,
        requiredApprovers,
        requiredRoleId,
        requestedBy: userId,
        reason,
        metadata,
      });

      res.status(201).json(approval);
    } catch (error) {
      routeLogger.error({ error }, 'Approval request failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/approvals/:id/vote
   * Submit approval vote
   */
  router.post('/approvals/:id/vote', async (req, res) => {
    try {
      const { id: approvalId } = req.params;
      const { decision, reason, metadata } = req.body;
      const userId = req.user?.id || 'unknown';

      if (!decision) {
        return res.status(400).json({ error: 'decision is required' });
      }

      const vote = await workflowService.submitApprovalVote({
        approvalId,
        approverUserId: userId,
        decision,
        reason,
        metadata,
      });

      res.status(201).json(vote);
    } catch (error) {
      routeLogger.error({ error }, 'Approval vote failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/approvals/pending
   * Get pending approvals for current user
   */
  router.get('/approvals/pending', async (req, res) => {
    try {
      const userId = req.user?.id || 'unknown';

      const approvals = await workflowService.getPendingApprovalsForUser(userId);

      res.json(approvals);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get pending approvals');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== SLA MANAGEMENT ====================

  /**
   * GET /api/cases/:id/slas
   * Get SLAs for a case
   */
  router.get('/cases/:id/slas', async (req, res) => {
    try {
      const { id: caseId } = req.params;

      const slas = await workflowService.getCaseSLAs(caseId);

      res.json(slas);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get SLAs');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/cases/:id/slas/summary
   * Get SLA summary for a case
   */
  router.get('/cases/:id/slas/summary', async (req, res) => {
    try {
      const { id: caseId } = req.params;

      const summary = await workflowService.getCaseSLASummary(caseId);

      res.json(summary);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to get SLA summary');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== ROLE MANAGEMENT ====================

  /**
   * GET /api/roles
   * List all roles
   */
  router.get('/roles', async (req, res) => {
    try {
      const { systemOnly } = req.query;

      const roles = await workflowService.listRoles(systemOnly === 'true');

      res.json(roles);
    } catch (error) {
      routeLogger.error({ error }, 'Failed to list roles');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        roles?: string[];
      };
    }
  }
}
