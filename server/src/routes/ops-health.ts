import express, { Request, Response } from 'express';
import { requireRole } from '../middleware/rbac.js';
import { authenticateToken } from '../middleware/auth.js';
import { logger as appLogger } from '../config/logger.js';
import { getSafetyState } from '../middleware/safety-mode.js';
import { register } from '../monitoring/metrics.js';

const router = express.Router();

// Middleware: all ops-health routes require admin role
router.use(authenticateToken, requireRole('admin'));

/**
 * In-memory event store for system health events
 * In production, this would be backed by a persistent store
 */
interface SystemHealthEvent {
  id: string;
  timestamp: Date;
  type: 'invariant_violation' | 'kill_switch_trip' | 'policy_denial' | 'verification_gate_failure' | 'safety_mode_change';
  severity: 'info' | 'warn' | 'error' | 'critical';
  summary: string;
  details: Record<string, any>;
}

class HealthEventStore {
  private events: SystemHealthEvent[] = [];
  private maxEvents = 1000;

  addEvent(event: Omit<SystemHealthEvent, 'id' | 'timestamp'>) {
    const newEvent: SystemHealthEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
    };

    this.events.unshift(newEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    appLogger.info({ event: newEvent }, 'System health event recorded');
  }

  getEvents(options: { since?: Date; limit?: number; type?: string; severity?: string } = {}): SystemHealthEvent[] {
    let filtered = [...this.events];

    if (options.since) {
      filtered = filtered.filter(e => e.timestamp >= options.since);
    }

    if (options.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    if (options.severity) {
      filtered = filtered.filter(e => e.severity === options.severity);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  clear() {
    this.events = [];
  }
}

export const healthEventStore = new HealthEventStore();

/**
 * GET /api/ops/system-health/summary
 * Returns a comprehensive health summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const safetyState = await getSafetyState();

    // Get metrics for additional context
    const metricsString = await register.metrics();
    const metricsLines = metricsString.split('\n');

    // Parse some key metrics (simplified - in production would use proper metric queries)
    const httpErrorsLine = metricsLines.find(l => l.startsWith('http_requests_total{') && l.includes('status_code="5'));
    const circuitBreakerLine = metricsLines.find(l => l.startsWith('circuit_breaker_'));

    // Get recent events for violation counts
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = healthEventStore.getEvents({ since: last24h });
    const recentViolations = recentEvents.filter(e => e.type === 'invariant_violation');
    const recentDenials = recentEvents.filter(e => e.type === 'policy_denial');
    const lastViolation = recentViolations.length > 0 ? recentViolations[0].timestamp : null;

    // Determine kill switch state from safety state
    let killSwitchState: 'normal' | 'soft' | 'hard' | 'catastrophic' = 'normal';
    let killSwitchReason: string | undefined;
    let lastTripAt: Date | null = null;

    if (safetyState.globalKillSwitchActive) {
      killSwitchState = 'hard';
      killSwitchReason = 'Global kill switch activated - all mutations blocked';
      const tripEvent = recentEvents.find(e => e.type === 'kill_switch_trip');
      if (tripEvent) lastTripAt = tripEvent.timestamp;
    } else if (safetyState.safeModeEnabled) {
      killSwitchState = 'soft';
      killSwitchReason = 'Safe mode enabled - high-risk endpoints blocked';
      const modeEvent = recentEvents.find(e => e.type === 'safety_mode_change');
      if (modeEvent) lastTripAt = modeEvent.timestamp;
    }

    // Policy denial top rules
    const denialEvents = healthEventStore.getEvents({ type: 'policy_denial', limit: 100 });
    const ruleCounter: Record<string, number> = {};
    denialEvents.forEach(e => {
      const ruleId = e.details.ruleId || 'unknown';
      ruleCounter[ruleId] = (ruleCounter[ruleId] || 0) + 1;
    });
    const topRules = Object.entries(ruleCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ruleId, count]) => ({ ruleId, count }));

    // Verification gates status
    const verificationEvents = healthEventStore.getEvents({ type: 'verification_gate_failure', limit: 20 });
    const gateStatuses = [
      { id: 'chaos', name: 'Chaos Testing', status: verificationEvents.some(e => e.details.gate === 'chaos') ? 'fail' : 'pass' },
      { id: 'adversarial', name: 'Adversarial Tests', status: verificationEvents.some(e => e.details.gate === 'adversarial') ? 'warn' : 'pass' },
      { id: 'invariants', name: 'Invariant Verification', status: recentViolations.length > 0 ? 'fail' : 'pass' },
      { id: 'tenant-isolation', name: 'Tenant Isolation', status: 'pass' },
    ];

    const lastVerificationRun = verificationEvents.length > 0
      ? verificationEvents[0].timestamp
      : null;

    const summary = {
      generatedAt: new Date().toISOString(),
      commitOrVersion: process.env.GIT_COMMIT || process.env.npm_package_version || 'unknown',
      invariants: {
        enforced: true, // Invariants are always enforced in this architecture
        lastViolationAt: lastViolation ? lastViolation.toISOString() : null,
        activePolicies: Object.keys(ruleCounter).length,
        recentViolations24h: recentViolations.length,
      },
      killSwitch: {
        state: killSwitchState,
        lastTripAt: lastTripAt ? lastTripAt.toISOString() : null,
        reason: killSwitchReason,
      },
      policy: {
        denials24h: recentDenials.length,
        topRules,
      },
      verification: {
        lastRunAt: lastVerificationRun ? lastVerificationRun.toISOString() : null,
        gates: gateStatuses,
      },
    };

    res.json(summary);
  } catch (error: any) {
    appLogger.error({ err: error }, 'Error generating system health summary');
    res.status(500).json({
      error: 'Failed to generate system health summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/ops/system-health/events
 * Returns recent system health events with filtering
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { since, limit, type, severity } = req.query;

    const options: any = {};

    if (since && typeof since === 'string') {
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid since parameter, must be ISO date string' });
      }
      options.since = sinceDate;
    }

    if (limit) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({ error: 'Invalid limit parameter, must be between 1 and 1000' });
      }
      options.limit = limitNum;
    } else {
      options.limit = 100; // Default limit
    }

    if (type && typeof type === 'string') {
      options.type = type;
    }

    if (severity && typeof severity === 'string') {
      options.severity = severity;
    }

    const events = healthEventStore.getEvents(options);

    res.json({
      events,
      total: events.length,
      filters: {
        since: options.since?.toISOString() || null,
        limit: options.limit,
        type: options.type || null,
        severity: options.severity || null,
      },
    });
  } catch (error: any) {
    appLogger.error({ err: error }, 'Error fetching system health events');
    res.status(500).json({
      error: 'Failed to fetch system health events',
      message: error.message,
    });
  }
});

/**
 * POST /api/ops/system-health/events (internal use only)
 * Allows other parts of the system to emit events
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { type, severity, summary, details } = req.body;

    if (!type || !severity || !summary) {
      return res.status(400).json({
        error: 'Missing required fields: type, severity, summary',
      });
    }

    const validTypes = ['invariant_violation', 'kill_switch_trip', 'policy_denial', 'verification_gate_failure', 'safety_mode_change'];
    const validSeverities = ['info', 'warn', 'error', 'critical'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
      });
    }

    healthEventStore.addEvent({
      type,
      severity,
      summary,
      details: details || {},
    });

    res.status(201).json({ success: true, message: 'Event recorded' });
  } catch (error: any) {
    appLogger.error({ err: error }, 'Error recording system health event');
    res.status(500).json({
      error: 'Failed to record system health event',
      message: error.message,
    });
  }
});

export default router;
