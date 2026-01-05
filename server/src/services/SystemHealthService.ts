import { BackpressureController } from '../runtime/backpressure/BackpressureController.js';
import { resolveSafetyState } from '../middleware/safety-mode.js';
import { getPostgresPool } from '../config/database.js';
import fs from 'fs';
import path from 'path';

export interface SystemHealth {
  safetyState: {
    killSwitch: boolean;
    safeMode: boolean;
  };
  invariants: {
    backpressure: {
      concurrency: number;
      queueDepth: number;
      queues: Record<string, number>;
    };
    recentViolations: Array<{ type: string; details: any; timestamp: Date }>;
  };
  policyDenials: {
    count: number;
    topRules: Array<{ rule: string; count: number }>;
    recent: Array<any>;
  };
  verificationGates: {
     sloResults: any;
     gateStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
  };
}

export class SystemHealthService {
  private static instance: SystemHealthService;

  public static getInstance(): SystemHealthService {
    if (!SystemHealthService.instance) {
      SystemHealthService.instance = new SystemHealthService();
    }
    return SystemHealthService.instance;
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    const safetyState = await resolveSafetyState();
    const backpressure = BackpressureController.getInstance().getMetrics();
    const recentViolations = await this.getRecentViolations();
    const policyDenials = await this.getRecentDenials();
    const verificationGates = await this.getVerificationGateStatus();

    return {
      safetyState,
      invariants: {
        backpressure: {
          concurrency: backpressure.concurrency,
          queueDepth: backpressure.queueDepth,
          queues: backpressure.queues
        },
        recentViolations
      },
      policyDenials,
      verificationGates
    };
  }

  private async getRecentViolations() {
      // For now, just check if queue depth is high
      const metrics = BackpressureController.getInstance().getMetrics();
      const violations = [];
      if (metrics.queueDepth > 1000) { // Arbitrary threshold for "violation"
          violations.push({
              type: 'HIGH_QUEUE_DEPTH',
              details: { depth: metrics.queueDepth },
              timestamp: new Date()
          });
      }
      return violations;
  }

  private async getRecentDenials() {
      const pool = getPostgresPool();
      try {
        // Query for count
        const countResult = await pool.query(`
            SELECT count(*) as count
            FROM audit_logs
            WHERE (details->>'status')::int = 403
            AND created_at > NOW() - INTERVAL '1 hour'
        `);

        const count = parseInt(countResult.rows[0].count, 10);

        // Fetch recent
        const recentResult = await pool.query(`
            SELECT *
            FROM audit_logs
            WHERE (details->>'status')::int = 403
            ORDER BY created_at DESC
            LIMIT 5
        `);

        return {
            count,
            topRules: [], // Hard to deduce rule from generic 403 without more structured logs
            recent: recentResult.rows
        };
      } catch (e) {
          // Log error but return empty structure to avoid breaking the dashboard
          // console.error("Failed to query audit logs", e);
          return { count: 0, topRules: [], recent: [] };
      }
  }

  private async getVerificationGateStatus() {
      const sloPath = path.resolve(process.cwd(), 'slo-results.json');
      if (fs.existsSync(sloPath)) {
          try {
            const content = fs.readFileSync(sloPath, 'utf-8');
            return { sloResults: JSON.parse(content), gateStatus: 'PASS' as const };
          } catch (e) {
              return { sloResults: null, gateStatus: 'UNKNOWN' as const };
          }
      }
      return { sloResults: null, gateStatus: 'UNKNOWN' as const };
  }
}
