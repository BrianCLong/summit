import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { PolicyEngine } from '../services/PolicyEngine.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';

const router = Router();

// Helper to get instances safely
const getPolicyEngine = () => PolicyEngine.getInstance();
// For AuditSystem, we use getInstance which might be uninitialized in dev context,
// but we handle that inside the class via a fallback or it throws if dependencies missing.
// In a real app, `app.ts` initializes it first.
const getAuditSystem = () => {
    try {
        return AdvancedAuditSystem.getInstance();
    } catch (e) {
        console.warn('AuditSystem access failed in router', e);
        return null;
    }
};

// Status Endpoint
router.get('/status', authenticate, requireRole(['admin', 'auditor']), async (req, res, next) => {
  try {
    const engine = getPolicyEngine();
    res.json({
      status: 'active',
      environment: process.env.NODE_ENV || 'dev',
      engine: 'PolicyEngine v1.0',
      checks: {
        opa_connection: 'simulated',
        audit_log: getAuditSystem() ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Violations / Incidents
router.get('/violations', authenticate, requireRole(['admin', 'auditor']), async (req, res, next) => {
  try {
    const auditSystem = getAuditSystem();
    const trails = auditSystem ? await auditSystem.getTrail('all') : [];

    // Filter for violations/blocks if possible, or just return recent trails for MVP
    const violations = trails.filter(t => t.outcome === 'failure' || t.message.includes('BLOCKED'));

    res.json({
      summary: {
        total_violations: violations.length,
        high_severity: violations.filter(v => v.level === 'error' || v.level === 'critical').length,
        open_incidents: 0 // Mocked
      },
      events: violations.map(v => ({
          id: v.id,
          timestamp: v.timestamp,
          policy: v.eventType,
          status: 'BLOCKED',
          details: v.message,
          actor: v.userId
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Test Evaluation Endpoint
router.post('/evaluate', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const context = req.body;
    const engine = getPolicyEngine();
    const decision = await engine.evaluate({
      ...context,
      user: { ...req.user, ...context.user }
    });
    res.json(decision);
  } catch (error) {
    next(error);
  }
});

export default router;
