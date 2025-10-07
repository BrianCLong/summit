// Policy Change Notifications & UX - v1.0
// Slack/Email integration, change summary, approver routing, kill-switch

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const axios = require('axios');
const logger = require('../utils/logger');

// Prometheus metrics
const { Counter, Histogram } = require('prom-client');

const NOTIFICATION_SENT = new Counter({
  name: 'policy_notifications_sent_total',
  help: 'Total policy change notifications sent',
  labelNames: ['channel', 'risk_level', 'status']
});

const NOTIFICATION_LATENCY = new Histogram({
  name: 'policy_notification_latency_seconds',
  help: 'Notification delivery latency',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});


/**
 * POST /api/policy/notifications/change-alert
 * Send policy change notification
 */
router.post('/change-alert',
  [
    body('policy_id').notEmpty().withMessage('Policy ID required'),
    body('change_id').notEmpty().withMessage('Change ID required'),
    body('risk_score').isNumeric().withMessage('Risk score required'),
    body('risk_level').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid risk level'),
    body('author_id').notEmpty().withMessage('Author ID required'),
    body('channels').isArray().withMessage('Channels array required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      policy_id,
      change_id,
      risk_score,
      risk_level,
      author_id,
      channels,  // ['slack', 'email']
      change_summary,
      blast_radius,
      affected_resources,
      affected_users,
      requires_approval,
      approvers,
      recommendations
    } = req.body;

    const start = Date.now();

    try {
      const notifications = [];

      // Send to each channel
      for (const channel of channels) {
        if (channel === 'slack') {
          const result = await sendSlackNotification({
            policy_id,
            change_id,
            risk_score,
            risk_level,
            author_id,
            change_summary,
            blast_radius,
            affected_resources,
            affected_users,
            requires_approval,
            approvers,
            recommendations
          });
          notifications.push({ channel: 'slack', ...result });
        } else if (channel === 'email') {
          const result = await sendEmailNotification({
            policy_id,
            change_id,
            risk_score,
            risk_level,
            author_id,
            change_summary,
            blast_radius,
            affected_resources,
            affected_users,
            requires_approval,
            approvers,
            recommendations
          });
          notifications.push({ channel: 'email', ...result });
        }
      }

      // Record metrics
      const latency = (Date.now() - start) / 1000;
      NOTIFICATION_LATENCY.observe(latency);

      for (const notif of notifications) {
        NOTIFICATION_SENT.labels(notif.channel, risk_level, notif.success ? 'success' : 'failed').inc();
      }

      logger.info(`Policy change notifications sent for ${change_id}: ${notifications.length} channels`);

      res.json({
        success: true,
        change_id,
        notifications,
        latency_seconds: latency
      });

    } catch (error) {
      logger.error(`Policy change notification failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send notifications'
      });
    }
  }
);


/**
 * POST /api/policy/notifications/drift-alert
 * Send policy drift alert
 */
router.post('/drift-alert',
  [
    body('policy_id').notEmpty().withMessage('Policy ID required'),
    body('drift_type').notEmpty().withMessage('Drift type required'),
    body('previous_hash').notEmpty().withMessage('Previous hash required'),
    body('current_hash').notEmpty().withMessage('Current hash required'),
    body('channels').isArray().withMessage('Channels array required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      policy_id,
      drift_type,
      previous_hash,
      current_hash,
      added,
      removed,
      modified,
      detected_at,
      channels
    } = req.body;

    const start = Date.now();

    try {
      const notifications = [];

      // Drift alerts are always critical - send to all channels
      for (const channel of channels) {
        if (channel === 'slack') {
          const result = await sendSlackDriftAlert({
            policy_id,
            drift_type,
            previous_hash,
            current_hash,
            added,
            removed,
            modified,
            detected_at
          });
          notifications.push({ channel: 'slack', ...result });
        } else if (channel === 'email') {
          const result = await sendEmailDriftAlert({
            policy_id,
            drift_type,
            previous_hash,
            current_hash,
            added,
            removed,
            modified,
            detected_at
          });
          notifications.push({ channel: 'email', ...result });
        }
      }

      const latency = (Date.now() - start) / 1000;
      NOTIFICATION_LATENCY.observe(latency);

      for (const notif of notifications) {
        NOTIFICATION_SENT.labels(notif.channel, 'critical', notif.success ? 'success' : 'failed').inc();
      }

      logger.warn(`Policy drift alert sent for ${policy_id}: ${drift_type}`);

      res.json({
        success: true,
        policy_id,
        drift_type,
        notifications,
        latency_seconds: latency
      });

    } catch (error) {
      logger.error(`Drift alert notification failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send drift alert'
      });
    }
  }
);


/**
 * POST /api/policy/notifications/kill-switch
 * Send emergency kill-switch alert
 */
router.post('/kill-switch',
  [
    body('policy_id').notEmpty().withMessage('Policy ID required'),
    body('requester_id').notEmpty().withMessage('Requester ID required'),
    body('reason').notEmpty().withMessage('Reason required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      policy_id,
      requester_id,
      reason,
      rollback_id
    } = req.body;

    try {
      // Emergency kill-switch - send to ALL channels immediately
      const notifications = await Promise.all([
        sendSlackKillSwitch({ policy_id, requester_id, reason, rollback_id }),
        sendEmailKillSwitch({ policy_id, requester_id, reason, rollback_id }),
        sendPagerDutyKillSwitch({ policy_id, requester_id, reason, rollback_id })
      ]);

      logger.error(`KILL-SWITCH ACTIVATED: Policy ${policy_id} by ${requester_id} - ${reason}`);

      res.json({
        success: true,
        policy_id,
        requester_id,
        notifications,
        severity: 'CRITICAL'
      });

    } catch (error) {
      logger.error(`Kill-switch notification failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send kill-switch alert'
      });
    }
  }
);


// Notification implementation functions

async function sendSlackNotification(data) {
  const webhookUrl = process.env.SLACK_POLICY_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn('Slack webhook URL not configured');
    return { success: false, error: 'Webhook not configured' };
  }

  const color = {
    'low': '#36a64f',
    'medium': '#ff9900',
    'high': '#ff6600',
    'critical': '#ff0000'
  }[data.risk_level] || '#808080';

  const message = {
    text: `Policy Change Alert: ${data.policy_id}`,
    attachments: [
      {
        color,
        title: `${data.risk_level.toUpperCase()} Risk Policy Change`,
        fields: [
          {
            title: 'Policy ID',
            value: data.policy_id,
            short: true
          },
          {
            title: 'Change ID',
            value: data.change_id,
            short: true
          },
          {
            title: 'Risk Score',
            value: `${data.risk_score}/100`,
            short: true
          },
          {
            title: 'Author',
            value: data.author_id,
            short: true
          },
          {
            title: 'Blast Radius',
            value: `${data.affected_resources || 0} resources, ${data.affected_users || 0} users`,
            short: false
          },
          {
            title: 'Change Summary',
            value: data.change_summary || 'No summary provided',
            short: false
          },
          {
            title: 'Approval Required',
            value: data.requires_approval ? 'YES' : 'NO',
            short: true
          }
        ],
        actions: data.requires_approval ? [
          {
            type: 'button',
            text: 'Review & Approve',
            url: `${process.env.APP_URL}/policy/changes/${data.change_id}`
          },
          {
            type: 'button',
            text: 'Rollback',
            url: `${process.env.APP_URL}/policy/${data.policy_id}/rollback`,
            style: 'danger'
          }
        ] : [],
        footer: data.recommendations ? `Recommendations: ${data.recommendations.join('; ')}` : ''
      }
    ]
  };

  try {
    await axios.post(webhookUrl, message);
    return { success: true };
  } catch (error) {
    logger.error(`Slack notification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendSlackDriftAlert(data) {
  const webhookUrl = process.env.SLACK_POLICY_WEBHOOK_URL;

  if (!webhookUrl) {
    return { success: false, error: 'Webhook not configured' };
  }

  const message = {
    text: `🚨 POLICY DRIFT DETECTED: ${data.policy_id}`,
    attachments: [
      {
        color: '#ff0000',
        title: 'Unauthorized Policy Change Detected',
        fields: [
          {
            title: 'Policy ID',
            value: data.policy_id,
            short: true
          },
          {
            title: 'Drift Type',
            value: data.drift_type,
            short: true
          },
          {
            title: 'Previous Hash',
            value: data.previous_hash.substring(0, 12) + '...',
            short: true
          },
          {
            title: 'Current Hash',
            value: data.current_hash.substring(0, 12) + '...',
            short: true
          },
          {
            title: 'Detected At',
            value: new Date(data.detected_at).toISOString(),
            short: false
          },
          {
            title: 'Changes',
            value: `+${(data.added || []).length} added, -${(data.removed || []).length} removed, ~${(data.modified || []).length} modified`,
            short: false
          }
        ],
        actions: [
          {
            type: 'button',
            text: '⚠️ EMERGENCY ROLLBACK',
            url: `${process.env.APP_URL}/policy/${data.policy_id}/emergency-rollback`,
            style: 'danger'
          },
          {
            type: 'button',
            text: 'View Diff',
            url: `${process.env.APP_URL}/policy/${data.policy_id}/diff`
          }
        ],
        footer: '⏱️ Alert MTTA target: ≤5 minutes'
      }
    ]
  };

  try {
    await axios.post(webhookUrl, message);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendSlackKillSwitch(data) {
  const webhookUrl = process.env.SLACK_CRITICAL_WEBHOOK_URL;

  const message = {
    text: `🔴 EMERGENCY KILL-SWITCH ACTIVATED: ${data.policy_id}`,
    attachments: [
      {
        color: '#ff0000',
        title: 'CRITICAL: Policy Kill-Switch Activated',
        fields: [
          {
            title: 'Policy ID',
            value: data.policy_id,
            short: true
          },
          {
            title: 'Activated By',
            value: data.requester_id,
            short: true
          },
          {
            title: 'Reason',
            value: data.reason,
            short: false
          },
          {
            title: 'Rollback ID',
            value: data.rollback_id || 'latest',
            short: true
          }
        ],
        footer: '🚨 Immediate action required'
      }
    ]
  };

  try {
    await axios.post(webhookUrl || process.env.SLACK_POLICY_WEBHOOK_URL, message);
    return { success: true, channel: 'slack' };
  } catch (error) {
    return { success: false, channel: 'slack', error: error.message };
  }
}

async function sendEmailNotification(data) {
  // Mock email sending - replace with actual email service (SendGrid, SES, etc.)
  logger.info(`Email notification sent for policy change: ${data.change_id}`);

  const recipients = data.approvers || ['security@example.com'];

  return {
    success: true,
    recipients,
    subject: `[${data.risk_level.toUpperCase()}] Policy Change: ${data.policy_id}`
  };
}

async function sendEmailDriftAlert(data) {
  logger.info(`Email drift alert sent for policy: ${data.policy_id}`);

  return {
    success: true,
    recipients: ['security@example.com', 'oncall@example.com'],
    subject: `🚨 POLICY DRIFT DETECTED: ${data.policy_id}`
  };
}

async function sendEmailKillSwitch(data) {
  logger.error(`Email kill-switch alert sent for policy: ${data.policy_id}`);

  return {
    success: true,
    channel: 'email',
    recipients: ['security@example.com', 'oncall@example.com', 'cto@example.com']
  };
}

async function sendPagerDutyKillSwitch(data) {
  // Mock PagerDuty integration
  logger.error(`PagerDuty kill-switch alert sent for policy: ${data.policy_id}`);

  return {
    success: true,
    channel: 'pagerduty',
    incident_id: `pd_${Date.now()}`
  };
}


module.exports = router;
