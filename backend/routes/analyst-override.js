// Analyst Override & Feedback API - Threat Intel v3
// Allows analysts to override confidence scores and provide feedback

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Prometheus metrics
const { Counter, Histogram } = require('prom-client');

const OVERRIDE_COUNTER = new Counter({
  name: 'intel_analyst_overrides_total',
  help: 'Total analyst overrides',
  labelNames: ['override_type', 'analyst_id']
});

const FEEDBACK_COUNTER = new Counter({
  name: 'intel_analyst_feedback_total',
  help: 'Total analyst feedback submissions',
  labelNames: ['feedback_type', 'rating']
});

const OVERRIDE_IMPACT = new Histogram({
  name: 'intel_override_impact',
  help: 'Impact of override (difference from model score)',
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
});


/**
 * POST /api/intel/override
 * Override confidence score for an indicator
 */
router.post('/override',
  [
    body('indicator_value').notEmpty().withMessage('Indicator value required'),
    body('indicator_type').isIn(['ip', 'domain', 'hash', 'url']).withMessage('Invalid indicator type'),
    body('original_score').isFloat({ min: 0, max: 1 }).withMessage('Original score must be 0-1'),
    body('override_score').isFloat({ min: 0, max: 1 }).withMessage('Override score must be 0-1'),
    body('justification').isLength({ min: 10 }).withMessage('Justification required (min 10 chars)'),
    body('analyst_id').notEmpty().withMessage('Analyst ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      indicator_value,
      indicator_type,
      original_score,
      override_score,
      justification,
      analyst_id,
      override_type = 'manual'  // manual, false_positive, false_negative
    } = req.body;

    try {
      // Calculate impact
      const impact = Math.abs(override_score - original_score);
      OVERRIDE_IMPACT.observe(impact);

      // Create override record
      const override = {
        override_id: generateOverrideId(),
        indicator_value,
        indicator_type,
        original_score,
        override_score,
        impact,
        justification,
        analyst_id,
        override_type,
        created_at: new Date().toISOString(),
        status: 'active',
        reviewed: false
      };

      // Store override (mock - replace with actual DB)
      await storeOverride(override);

      // Update model if high-confidence override
      if (impact >= 0.3) {
        await triggerModelUpdate(override);
      }

      // Metrics
      OVERRIDE_COUNTER.labels(override_type, analyst_id).inc();

      logger.info(`Analyst override created: ${override.override_id} by ${analyst_id}`);

      res.status(201).json({
        success: true,
        override_id: override.override_id,
        impact,
        model_update_triggered: impact >= 0.3
      });

    } catch (error) {
      logger.error(`Override creation failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to create override'
      });
    }
  }
);


/**
 * POST /api/intel/feedback
 * Submit feedback on confidence score accuracy
 */
router.post('/feedback',
  [
    body('indicator_value').notEmpty().withMessage('Indicator value required'),
    body('indicator_type').isIn(['ip', 'domain', 'hash', 'url']).withMessage('Invalid indicator type'),
    body('predicted_score').isFloat({ min: 0, max: 1 }).withMessage('Predicted score must be 0-1'),
    body('actual_outcome').isIn(['true_positive', 'true_negative', 'false_positive', 'false_negative']).withMessage('Invalid outcome'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comments').optional().isString(),
    body('analyst_id').notEmpty().withMessage('Analyst ID required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      indicator_value,
      indicator_type,
      predicted_score,
      actual_outcome,
      rating,
      comments,
      analyst_id
    } = req.body;

    try {
      // Create feedback record
      const feedback = {
        feedback_id: generateFeedbackId(),
        indicator_value,
        indicator_type,
        predicted_score,
        actual_outcome,
        rating,
        comments: comments || '',
        analyst_id,
        created_at: new Date().toISOString(),
        incorporated: false
      };

      // Store feedback (mock - replace with actual DB)
      await storeFeedback(feedback);

      // Add to training queue for model retraining
      await addToTrainingQueue(feedback);

      // Metrics
      FEEDBACK_COUNTER.labels(actual_outcome, rating.toString()).inc();

      logger.info(`Analyst feedback submitted: ${feedback.feedback_id} by ${analyst_id}`);

      res.status(201).json({
        success: true,
        feedback_id: feedback.feedback_id,
        training_queue_added: true
      });

    } catch (error) {
      logger.error(`Feedback submission failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }
  }
);


/**
 * GET /api/intel/overrides/:analyst_id
 * Get all overrides by analyst
 */
router.get('/overrides/:analyst_id',
  [
    param('analyst_id').notEmpty().withMessage('Analyst ID required')
  ],
  async (req, res) => {
    const { analyst_id } = req.params;
    const { status = 'active', limit = 50 } = req.query;

    try {
      // Fetch overrides (mock - replace with actual DB query)
      const overrides = await fetchOverridesByAnalyst(analyst_id, status, limit);

      res.json({
        success: true,
        analyst_id,
        count: overrides.length,
        overrides
      });

    } catch (error) {
      logger.error(`Override fetch failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch overrides'
      });
    }
  }
);


/**
 * GET /api/intel/feedback/:analyst_id
 * Get all feedback by analyst
 */
router.get('/feedback/:analyst_id',
  [
    param('analyst_id').notEmpty().withMessage('Analyst ID required')
  ],
  async (req, res) => {
    const { analyst_id } = req.params;
    const { limit = 50 } = req.query;

    try {
      // Fetch feedback (mock - replace with actual DB query)
      const feedback = await fetchFeedbackByAnalyst(analyst_id, limit);

      res.json({
        success: true,
        analyst_id,
        count: feedback.length,
        feedback
      });

    } catch (error) {
      logger.error(`Feedback fetch failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch feedback'
      });
    }
  }
);


/**
 * GET /api/intel/override-stats
 * Get override statistics
 */
router.get('/override-stats', async (req, res) => {
  try {
    // Calculate override statistics (mock - replace with actual aggregation)
    const stats = await calculateOverrideStats();

    res.json({
      success: true,
      stats: {
        total_overrides: stats.total,
        avg_impact: stats.avg_impact,
        by_type: stats.by_type,
        top_analysts: stats.top_analysts,
        model_updates_triggered: stats.model_updates
      }
    });

  } catch (error) {
    logger.error(`Stats calculation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate stats'
    });
  }
});


// Helper functions (mock implementations)

function generateOverrideId() {
  return `override_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateFeedbackId() {
  return `feedback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function storeOverride(override) {
  // Mock - replace with actual DB storage
  logger.debug(`Storing override: ${override.override_id}`);
  return Promise.resolve();
}

async function storeFeedback(feedback) {
  // Mock - replace with actual DB storage
  logger.debug(`Storing feedback: ${feedback.feedback_id}`);
  return Promise.resolve();
}

async function triggerModelUpdate(override) {
  // Mock - replace with actual model update trigger
  logger.info(`Triggering model update for high-impact override: ${override.override_id}`);
  return Promise.resolve();
}

async function addToTrainingQueue(feedback) {
  // Mock - replace with actual training queue
  logger.debug(`Adding feedback to training queue: ${feedback.feedback_id}`);
  return Promise.resolve();
}

async function fetchOverridesByAnalyst(analyst_id, status, limit) {
  // Mock - replace with actual DB query
  return [
    {
      override_id: 'override_123',
      indicator_value: '1.2.3.4',
      indicator_type: 'ip',
      original_score: 0.3,
      override_score: 0.8,
      impact: 0.5,
      justification: 'Known C2 server from recent campaign',
      analyst_id,
      override_type: 'manual',
      created_at: new Date().toISOString(),
      status: 'active',
      reviewed: false
    }
  ];
}

async function fetchFeedbackByAnalyst(analyst_id, limit) {
  // Mock - replace with actual DB query
  return [
    {
      feedback_id: 'feedback_456',
      indicator_value: '5.6.7.8',
      indicator_type: 'ip',
      predicted_score: 0.7,
      actual_outcome: 'true_positive',
      rating: 4,
      comments: 'Accurate detection',
      analyst_id,
      created_at: new Date().toISOString(),
      incorporated: false
    }
  ];
}

async function calculateOverrideStats() {
  // Mock - replace with actual aggregation
  return {
    total: 150,
    avg_impact: 0.35,
    by_type: {
      manual: 100,
      false_positive: 30,
      false_negative: 20
    },
    top_analysts: [
      { analyst_id: 'analyst_1', count: 45 },
      { analyst_id: 'analyst_2', count: 38 }
    ],
    model_updates: 23
  };
}


module.exports = router;
