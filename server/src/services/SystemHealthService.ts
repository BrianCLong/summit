/**
 * System Health Service
 *
 * Exposes operational health metrics for the platform including:
 * - Kill-switch and safe-mode state
 * - Backpressure metrics (concurrency, queue depth)
 * - Recent policy denials
 * - SLO results presence
 */

import { existsSync } from 'fs';
import { join } from 'path';
import logger from '../config/logger.js';

// In-memory state for kill-switch and safe-mode
// In production, these would be backed by Redis or a database
let killSwitchEnabled = false;
let safeModeEnabled = false;

// Backpressure tracking
const backpressureState = {
  currentConcurrency: 0,
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '100', 10),
  queueDepth: 0,
  maxQueueDepth: parseInt(process.env.MAX_QUEUE_DEPTH || '1000', 10),
};

export interface SystemHealthStatus {
  timestamp: string;
  killSwitch: {
    enabled: boolean;
    reason?: string;
    enabledAt?: string;
  };
  safeMode: {
    enabled: boolean;
    reason?: string;
    enabledAt?: string;
  };
  backpressure: {
    currentConcurrency: number;
    maxConcurrency: number;
    queueDepth: number;
    maxQueueDepth: number;
    isBackpressured: boolean;
  };
  sloResults: {
    available: boolean;
    path?: string;
  };
  recentPolicyDenials: number;
}

export interface PolicySimulatorInput {
  action: string;
  resource: string;
  subject: {
    id: string;
    roles: string[];
    attributes?: Record<string, unknown>;
  };
  context?: Record<string, unknown>;
}

export interface PolicySimulatorResult {
  allowed: boolean;
  reason: string;
  matchedPolicy?: string;
  evaluationTimeMs: number;
}

class SystemHealthServiceImpl {
  private killSwitchReason?: string;
  private killSwitchEnabledAt?: Date;
  private safeModeReason?: string;
  private safeModeEnabledAt?: Date;

  /**
   * Get current system health status
   */
  async getStatus(): Promise<SystemHealthStatus> {
    const sloResultsPath = join(process.cwd(), 'dist', 'slo-results.json');

    return {
      timestamp: new Date().toISOString(),
      killSwitch: {
        enabled: killSwitchEnabled,
        reason: this.killSwitchReason,
        enabledAt: this.killSwitchEnabledAt?.toISOString(),
      },
      safeMode: {
        enabled: safeModeEnabled,
        reason: this.safeModeReason,
        enabledAt: this.safeModeEnabledAt?.toISOString(),
      },
      backpressure: {
        ...backpressureState,
        isBackpressured: this.isBackpressured(),
      },
      sloResults: {
        available: existsSync(sloResultsPath),
        path: sloResultsPath,
      },
      recentPolicyDenials: await this.countRecentPolicyDenials(),
    };
  }

  /**
   * Enable kill-switch (stops all non-essential operations)
   */
  enableKillSwitch(reason: string): void {
    killSwitchEnabled = true;
    this.killSwitchReason = reason;
    this.killSwitchEnabledAt = new Date();
    logger.warn('Kill-switch ENABLED', { reason });
  }

  /**
   * Disable kill-switch
   */
  disableKillSwitch(): void {
    killSwitchEnabled = false;
    this.killSwitchReason = undefined;
    this.killSwitchEnabledAt = undefined;
    logger.info('Kill-switch DISABLED');
  }

  /**
   * Enable safe-mode (reduced functionality)
   */
  enableSafeMode(reason: string): void {
    safeModeEnabled = true;
    this.safeModeReason = reason;
    this.safeModeEnabledAt = new Date();
    logger.warn('Safe-mode ENABLED', { reason });
  }

  /**
   * Disable safe-mode
   */
  disableSafeMode(): void {
    safeModeEnabled = false;
    this.safeModeReason = undefined;
    this.safeModeEnabledAt = undefined;
    logger.info('Safe-mode DISABLED');
  }

  /**
   * Check if kill-switch is active
   */
  isKillSwitchEnabled(): boolean {
    return killSwitchEnabled;
  }

  /**
   * Check if safe-mode is active
   */
  isSafeModeEnabled(): boolean {
    return safeModeEnabled;
  }

  /**
   * Check if system is under backpressure
   */
  isBackpressured(): boolean {
    return (
      backpressureState.currentConcurrency >= backpressureState.maxConcurrency * 0.9 ||
      backpressureState.queueDepth >= backpressureState.maxQueueDepth * 0.9
    );
  }

  /**
   * Update backpressure metrics
   */
  updateBackpressure(concurrency: number, queueDepth: number): void {
    backpressureState.currentConcurrency = concurrency;
    backpressureState.queueDepth = queueDepth;
  }

  /**
   * Simulate a policy decision (for testing/validation)
   */
  async simulatePolicy(input: PolicySimulatorInput): Promise<PolicySimulatorResult> {
    const startTime = Date.now();

    // Simplified policy simulation
    // In production, this would call the actual OPA engine
    const { action, resource, subject } = input;

    // Default allow for admins
    if (subject.roles.includes('admin') || subject.roles.includes('ADMIN')) {
      return {
        allowed: true,
        reason: 'Admin role has full access',
        matchedPolicy: 'admin-override',
        evaluationTimeMs: Date.now() - startTime,
      };
    }

    // Check for read access
    if (action === 'read' && subject.roles.includes('viewer')) {
      return {
        allowed: true,
        reason: 'Viewer role has read access',
        matchedPolicy: 'viewer-read',
        evaluationTimeMs: Date.now() - startTime,
      };
    }

    // Check for write access
    if (['create', 'update', 'delete'].includes(action) && subject.roles.includes('editor')) {
      return {
        allowed: true,
        reason: 'Editor role has write access',
        matchedPolicy: 'editor-write',
        evaluationTimeMs: Date.now() - startTime,
      };
    }

    return {
      allowed: false,
      reason: `No policy grants ${action} on ${resource} for roles: ${subject.roles.join(', ')}`,
      evaluationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Count recent policy denials from audit logs
   */
  private async countRecentPolicyDenials(): Promise<number> {
    // In production, this would query the audit_logs table
    // For now, return a placeholder
    try {
      // Placeholder - in production:
      // const result = await db.query(
      //   'SELECT COUNT(*) FROM audit_logs WHERE status_code = 403 AND created_at > NOW() - INTERVAL 1 HOUR'
      // );
      // return result.rows[0].count;
      return 0;
    } catch (error) {
      logger.error('Failed to count policy denials', { error });
      return -1;
    }
  }
}

export const systemHealthService = new SystemHealthServiceImpl();
