// SOAR Batch Approval API - v1.3
// Batch approval workflow with parallelization

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Prometheus metrics
const { Counter, Histogram, Gauge } = require('prom-client');

const APPROVAL_REQUESTS = new Counter({
  name: 'soar_approval_requests_total',
  help: 'Total approval requests',
  labelNames: ['type', 'status']
});

const APPROVAL_LATENCY = new Histogram({
  name: 'soar_approval_latency_seconds',
  help: 'Approval decision latency',
  buckets: [1, 5, 10, 30, 60, 120, 300, 600]
});

const PENDING_APPROVALS = new Gauge({
  name: 'soar_pending_approvals',
  help: 'Number of pending approvals'
});

// In-memory storage (replace with Redis/DB in production)
const approvalRequests = new Map();
const approvalDecisions = new Map();


/**
 * POST /api/soar/approval/batch
 * Create batch approval request
 */
router.post('/batch',
  [
    body('playbook_id').notEmpty().withMessage('Playbook ID required'),
    body('tasks').isArray({ min: 1 }).withMessage('Tasks array required'),
    body('tasks.*.task_id').notEmpty().withMessage('Task ID required'),
    body('tasks.*.name').notEmpty().withMessage('Task name required'),
    body('tasks.*.action').notEmpty().withMessage('Task action required'),
    body('requester_id').notEmpty().withMessage('Requester ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      playbook_id,
      tasks,
      entity_context,
      risk_level = 'medium',
      requester_id,
      auto_approve_low_risk = false
    } = req.body;

    try {
      const request_id = generateRequestId();

      // Create approval request
      const approval_request = {
        request_id,
        playbook_id,
        tasks,
        entity_context: entity_context || {},
        risk_level,
        requester_id,
        created_at: new Date().toISOString(),
        status: 'pending',
        approved_tasks: [],
        rejected_tasks: [],
        approver_id: null,
        approved_at: null
      };

      // Auto-approve if low risk and enabled
      if (auto_approve_low_risk && risk_level === 'low') {
        approval_request.status = 'approved';
        approval_request.approved_tasks = tasks.map(t => t.task_id);
        approval_request.approver_id = 'system_auto';
        approval_request.approved_at = new Date().toISOString();

        APPROVAL_REQUESTS.labels('batch', 'auto_approved').inc();

        return res.status(201).json({
          success: true,
          request_id,
          status: 'approved',
          auto_approved: true,
          approved_tasks: approval_request.approved_tasks
        });
      }

      // Store request
      approvalRequests.set(request_id, approval_request);

      // Update metrics
      APPROVAL_REQUESTS.labels('batch', 'pending').inc();
      PENDING_APPROVALS.set(approvalRequests.size);

      logger.info(`Batch approval request created: ${request_id} (${tasks.length} tasks)`);

      res.status(201).json({
        success: true,
        request_id,
        status: 'pending',
        task_count: tasks.length,
        requires_manual_approval: true
      });

    } catch (error) {
      logger.error(`Batch approval request failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to create approval request'
      });
    }
  }
);


/**
 * POST /api/soar/approval/:request_id/approve
 * Approve batch request
 */
router.post('/:request_id/approve',
  [
    param('request_id').notEmpty().withMessage('Request ID required'),
    body('approver_id').notEmpty().withMessage('Approver ID required'),
    body('approved_tasks').optional().isArray().withMessage('Approved tasks must be array'),
    body('rejected_tasks').optional().isArray().withMessage('Rejected tasks must be array'),
    body('justification').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { request_id } = req.params;
    const {
      approver_id,
      approved_tasks,  // Optional: specific tasks to approve (default: all)
      rejected_tasks,  // Optional: specific tasks to reject
      justification
    } = req.body;

    try {
      const approval_request = approvalRequests.get(request_id);

      if (!approval_request) {
        return res.status(404).json({
          success: false,
          error: 'Approval request not found'
        });
      }

      if (approval_request.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `Request already ${approval_request.status}`
        });
      }

      // Calculate approval latency
      const created_at = new Date(approval_request.created_at);
      const latency = (Date.now() - created_at.getTime()) / 1000;
      APPROVAL_LATENCY.observe(latency);

      // Determine which tasks are approved/rejected
      const all_task_ids = approval_request.tasks.map(t => t.task_id);

      if (approved_tasks) {
        approval_request.approved_tasks = approved_tasks;
        approval_request.rejected_tasks = rejected_tasks || all_task_ids.filter(id => !approved_tasks.includes(id));
      } else {
        // Approve all tasks if not specified
        approval_request.approved_tasks = all_task_ids;
        approval_request.rejected_tasks = rejected_tasks || [];
      }

      approval_request.status = 'approved';
      approval_request.approver_id = approver_id;
      approval_request.approved_at = new Date().toISOString();
      approval_request.justification = justification;

      // Update metrics
      APPROVAL_REQUESTS.labels('batch', 'approved').inc();
      PENDING_APPROVALS.set(Array.from(approvalRequests.values()).filter(r => r.status === 'pending').length);

      logger.info(`Batch approval granted: ${request_id} by ${approver_id} (${approval_request.approved_tasks.length}/${all_task_ids.length} tasks approved)`);

      res.json({
        success: true,
        request_id,
        status: 'approved',
        approved_tasks: approval_request.approved_tasks,
        rejected_tasks: approval_request.rejected_tasks,
        approver_id,
        latency_seconds: latency
      });

    } catch (error) {
      logger.error(`Approval grant failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to approve request'
      });
    }
  }
);


/**
 * POST /api/soar/approval/:request_id/reject
 * Reject batch request
 */
router.post('/:request_id/reject',
  [
    param('request_id').notEmpty().withMessage('Request ID required'),
    body('approver_id').notEmpty().withMessage('Approver ID required'),
    body('reason').isLength({ min: 10 }).withMessage('Rejection reason required (min 10 chars)')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { request_id } = req.params;
    const { approver_id, reason } = req.body;

    try {
      const approval_request = approvalRequests.get(request_id);

      if (!approval_request) {
        return res.status(404).json({
          success: false,
          error: 'Approval request not found'
        });
      }

      if (approval_request.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `Request already ${approval_request.status}`
        });
      }

      // Reject all tasks
      approval_request.status = 'rejected';
      approval_request.approver_id = approver_id;
      approval_request.approved_at = new Date().toISOString();
      approval_request.rejection_reason = reason;
      approval_request.rejected_tasks = approval_request.tasks.map(t => t.task_id);

      // Update metrics
      APPROVAL_REQUESTS.labels('batch', 'rejected').inc();
      PENDING_APPROVALS.set(Array.from(approvalRequests.values()).filter(r => r.status === 'pending').length);

      logger.info(`Batch approval rejected: ${request_id} by ${approver_id}`);

      res.json({
        success: true,
        request_id,
        status: 'rejected',
        rejected_tasks: approval_request.rejected_tasks,
        approver_id,
        reason
      });

    } catch (error) {
      logger.error(`Approval rejection failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to reject request'
      });
    }
  }
);


/**
 * GET /api/soar/approval/pending
 * Get all pending approvals
 */
router.get('/pending', async (req, res) => {
  const { approver_id, limit = 50 } = req.query;

  try {
    let pending = Array.from(approvalRequests.values())
      .filter(r => r.status === 'pending');

    // Filter by approver if specified (check approver groups/permissions)
    if (approver_id) {
      // Mock - replace with actual authorization check
      pending = pending.filter(r => canApprove(approver_id, r));
    }

    // Limit results
    pending = pending.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: pending.length,
      requests: pending
    });

  } catch (error) {
    logger.error(`Pending approvals fetch failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
});


/**
 * GET /api/soar/approval/:request_id
 * Get approval request details
 */
router.get('/:request_id', async (req, res) => {
  const { request_id } = req.params;

  try {
    const approval_request = approvalRequests.get(request_id);

    if (!approval_request) {
      return res.status(404).json({
        success: false,
        error: 'Approval request not found'
      });
    }

    res.json({
      success: true,
      request: approval_request
    });

  } catch (error) {
    logger.error(`Approval request fetch failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval request'
    });
  }
});


/**
 * GET /api/soar/approval/stats
 * Get approval statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const all_requests = Array.from(approvalRequests.values());

    const stats = {
      total: all_requests.length,
      pending: all_requests.filter(r => r.status === 'pending').length,
      approved: all_requests.filter(r => r.status === 'approved').length,
      rejected: all_requests.filter(r => r.status === 'rejected').length,
      auto_approved: all_requests.filter(r => r.approver_id === 'system_auto').length,
      avg_latency_seconds: calculateAverageLatency(all_requests.filter(r => r.status !== 'pending'))
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error(`Stats calculation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate stats'
    });
  }
});


// Helper functions

function generateRequestId() {
  return `approval_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function canApprove(approver_id, request) {
  // Mock - replace with actual authorization logic
  // Check if approver has permission for this risk level
  return true;
}

function calculateAverageLatency(requests) {
  if (requests.length === 0) return 0;

  const total_latency = requests.reduce((sum, req) => {
    const created = new Date(req.created_at).getTime();
    const approved = new Date(req.approved_at).getTime();
    return sum + (approved - created) / 1000;
  }, 0);

  return total_latency / requests.length;
}


module.exports = router;
