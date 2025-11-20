/**
 * Workflow management API routes
 */

import { Router } from 'express';
import { WorkflowManager } from '@summit/reporting';

const router = Router();

// Initialize workflow manager
const workflowManager = new WorkflowManager();

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post('/', (req, res) => {
  try {
    const { reportId, steps } = req.body;
    const workflow = workflowManager.createWorkflow(reportId, steps);

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get workflow by ID
 */
router.get('/:id', (req, res) => {
  try {
    const workflow = workflowManager.getWorkflow(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/workflows/:id/complete
 * Complete current step
 */
router.post('/:id/complete', (req, res) => {
  try {
    const { userId, comment } = req.body;
    const workflow = workflowManager.completeStep(req.params.id, userId, comment);

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/workflows/:id/reject
 * Reject current step
 */
router.post('/:id/reject', (req, res) => {
  try {
    const { userId, reason } = req.body;
    const workflow = workflowManager.rejectStep(req.params.id, userId, reason);

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/workflows/:id/approve
 * Add approval to a step
 */
router.post('/:id/approve', (req, res) => {
  try {
    const { stepId, userId, approved, comment } = req.body;
    const workflow = workflowManager.addApproval(
      req.params.id,
      stepId,
      userId,
      approved,
      comment
    );

    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/workflows/user/:userId/pending
 * Get pending workflows for user
 */
router.get('/user/:userId/pending', (req, res) => {
  try {
    const workflows = workflowManager.getPendingWorkflows(req.params.userId);

    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/workflows/comments
 * Add comment to report
 */
router.post('/comments', (req, res) => {
  try {
    const { reportId, userId, content, section, lineNumber } = req.body;
    const comment = workflowManager.addComment(
      reportId,
      userId,
      content,
      section,
      lineNumber
    );

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/workflows/comments/:reportId
 * Get comments for report
 */
router.get('/comments/:reportId', (req, res) => {
  try {
    const comments = workflowManager.getComments(req.params.reportId);

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as workflowRoutes };
