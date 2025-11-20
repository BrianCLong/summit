/**
 * Privileged Access Monitoring System
 *
 * Monitors and analyzes privileged access events for security threats
 */

import type {
  PrivilegedAccessEvent,
  ThreatRiskLevel
} from '../types.js';

export interface PrivilegedAccessPolicy {
  accessType: string;
  requiresApproval: boolean;
  requiresJustification: boolean;
  maxDuration: number; // minutes
  allowedHours?: { start: number; end: number };
  restrictedDays?: number[];
  requiresSecondPerson: boolean;
}

export interface AccessAlert {
  id: string;
  event: PrivilegedAccessEvent;
  alertType: string;
  severity: ThreatRiskLevel;
  reason: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class PrivilegedAccessMonitor {
  private policies: Map<string, PrivilegedAccessPolicy> = new Map();
  private accessHistory: Map<string, PrivilegedAccessEvent[]> = new Map();
  private alerts: AccessAlert[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Monitor a privileged access event
   */
  async monitorAccess(event: PrivilegedAccessEvent): Promise<AccessAlert[]> {
    const alerts: AccessAlert[] = [];

    // Store event in history
    const userHistory = this.accessHistory.get(event.userId) || [];
    userHistory.push(event);
    this.accessHistory.set(event.userId, userHistory);

    // Check policy compliance
    const policyViolation = this.checkPolicyCompliance(event);
    if (policyViolation) {
      alerts.push(policyViolation);
    }

    // Check for suspicious patterns
    const patternAlerts = this.detectSuspiciousPatterns(event, userHistory);
    alerts.push(...patternAlerts);

    // Check for privilege escalation
    const escalationAlert = this.detectPrivilegeEscalation(event, userHistory);
    if (escalationAlert) {
      alerts.push(escalationAlert);
    }

    // Check for unusual timing
    const timingAlert = this.checkAccessTiming(event);
    if (timingAlert) {
      alerts.push(timingAlert);
    }

    // Store alerts
    this.alerts.push(...alerts);

    return alerts;
  }

  /**
   * Check policy compliance
   */
  private checkPolicyCompliance(event: PrivilegedAccessEvent): AccessAlert | null {
    const policy = this.policies.get(event.accessType);
    if (!policy) {
      return null;
    }

    // Check if approval is required but missing
    if (policy.requiresApproval && !event.approver) {
      return {
        id: crypto.randomUUID(),
        event,
        alertType: 'POLICY_VIOLATION',
        severity: 'HIGH' as ThreatRiskLevel,
        reason: `Approval required for ${event.accessType} but not provided`,
        timestamp: new Date(),
        acknowledged: false
      };
    }

    // Check if justification is required but missing
    if (policy.requiresJustification && !event.justification) {
      return {
        id: crypto.randomUUID(),
        event,
        alertType: 'POLICY_VIOLATION',
        severity: 'MEDIUM' as ThreatRiskLevel,
        reason: `Justification required for ${event.accessType} but not provided`,
        timestamp: new Date(),
        acknowledged: false
      };
    }

    // Check access timing restrictions
    if (policy.allowedHours) {
      const hour = event.timestamp.getHours();
      if (hour < policy.allowedHours.start || hour > policy.allowedHours.end) {
        return {
          id: crypto.randomUUID(),
          event,
          alertType: 'TIME_RESTRICTION_VIOLATION',
          severity: 'HIGH' as ThreatRiskLevel,
          reason: `Access outside allowed hours (${policy.allowedHours.start}-${policy.allowedHours.end})`,
          timestamp: new Date(),
          acknowledged: false
        };
      }
    }

    return null;
  }

  /**
   * Detect suspicious access patterns
   */
  private detectSuspiciousPatterns(
    event: PrivilegedAccessEvent,
    history: PrivilegedAccessEvent[]
  ): AccessAlert[] {
    const alerts: AccessAlert[] = [];

    // Check for excessive access frequency
    const recentAccess = history.filter(e => {
      const timeDiff = event.timestamp.getTime() - e.timestamp.getTime();
      return timeDiff < 3600000; // Last hour
    });

    if (recentAccess.length > 10) {
      alerts.push({
        id: crypto.randomUUID(),
        event,
        alertType: 'EXCESSIVE_ACCESS',
        severity: 'HIGH' as ThreatRiskLevel,
        reason: `Excessive privileged access: ${recentAccess.length} events in last hour`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check for data mining behavior
    const uniqueResources = new Set(recentAccess.map(e => e.resource));
    if (uniqueResources.size > 50) {
      alerts.push({
        id: crypto.randomUUID(),
        event,
        alertType: 'DATA_MINING',
        severity: 'CRITICAL' as ThreatRiskLevel,
        reason: `Possible data mining: accessed ${uniqueResources.size} unique resources`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check for unauthorized access attempts
    const unauthorizedAttempts = recentAccess.filter(e => !e.authorized);
    if (unauthorizedAttempts.length > 3) {
      alerts.push({
        id: crypto.randomUUID(),
        event,
        alertType: 'UNAUTHORIZED_ATTEMPTS',
        severity: 'CRITICAL' as ThreatRiskLevel,
        reason: `Multiple unauthorized access attempts: ${unauthorizedAttempts.length}`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Detect privilege escalation attempts
   */
  private detectPrivilegeEscalation(
    event: PrivilegedAccessEvent,
    history: PrivilegedAccessEvent[]
  ): AccessAlert | null {
    // Look for escalating privilege levels
    const privilegeLevels = new Map([
      ['ADMIN_LOGIN', 1],
      ['DATABASE_ACCESS', 2],
      ['USER_MANAGEMENT', 3],
      ['SECURITY_SETTINGS', 4],
      ['ROOT_ACCESS', 5]
    ]);

    const currentLevel = privilegeLevels.get(event.accessType) || 0;
    const recentHistory = history.slice(-10);

    const escalation = recentHistory.some((e, i) => {
      if (i === 0) return false;
      const prevLevel = privilegeLevels.get(e.accessType) || 0;
      const currLevel = privilegeLevels.get(recentHistory[i - 1].accessType) || 0;
      return currLevel > prevLevel;
    });

    if (escalation && currentLevel >= 4) {
      return {
        id: crypto.randomUUID(),
        event,
        alertType: 'PRIVILEGE_ESCALATION',
        severity: 'CRITICAL' as ThreatRiskLevel,
        reason: 'Detected privilege escalation pattern',
        timestamp: new Date(),
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Check access timing for anomalies
   */
  private checkAccessTiming(event: PrivilegedAccessEvent): AccessAlert | null {
    const hour = event.timestamp.getHours();
    const day = event.timestamp.getDay();

    // Check for access outside business hours
    if (hour < 6 || hour > 22) {
      return {
        id: crypto.randomUUID(),
        event,
        alertType: 'OFF_HOURS_ACCESS',
        severity: 'MEDIUM' as ThreatRiskLevel,
        reason: `Privileged access outside normal hours (${hour}:00)`,
        timestamp: new Date(),
        acknowledged: false
      };
    }

    // Check for weekend access
    if (day === 0 || day === 6) {
      return {
        id: crypto.randomUUID(),
        event,
        alertType: 'WEEKEND_ACCESS',
        severity: 'MEDIUM' as ThreatRiskLevel,
        reason: 'Privileged access on weekend',
        timestamp: new Date(),
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Initialize default access policies
   */
  private initializeDefaultPolicies(): void {
    this.policies.set('ROOT_ACCESS', {
      accessType: 'ROOT_ACCESS',
      requiresApproval: true,
      requiresJustification: true,
      maxDuration: 60,
      allowedHours: { start: 8, end: 18 },
      requiresSecondPerson: true
    });

    this.policies.set('DATABASE_ACCESS', {
      accessType: 'DATABASE_ACCESS',
      requiresApproval: true,
      requiresJustification: true,
      maxDuration: 120,
      requiresSecondPerson: false
    });

    this.policies.set('SECURITY_SETTINGS', {
      accessType: 'SECURITY_SETTINGS',
      requiresApproval: true,
      requiresJustification: true,
      maxDuration: 30,
      allowedHours: { start: 8, end: 18 },
      requiresSecondPerson: true
    });

    this.policies.set('USER_MANAGEMENT', {
      accessType: 'USER_MANAGEMENT',
      requiresApproval: true,
      requiresJustification: true,
      maxDuration: 60,
      requiresSecondPerson: false
    });
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AccessAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Get access history for a user
   */
  getUserAccessHistory(userId: string): PrivilegedAccessEvent[] {
    return this.accessHistory.get(userId) || [];
  }

  /**
   * Calculate risk score for user based on access patterns
   */
  calculateUserRiskScore(userId: string): number {
    const history = this.getUserAccessHistory(userId);
    const userAlerts = this.alerts.filter(a => a.event.userId === userId && !a.acknowledged);

    let riskScore = 0;

    // Factor in number of alerts
    riskScore += userAlerts.length * 10;

    // Factor in severity of alerts
    userAlerts.forEach(alert => {
      switch (alert.severity) {
        case 'CRITICAL':
          riskScore += 40;
          break;
        case 'HIGH':
          riskScore += 25;
          break;
        case 'MEDIUM':
          riskScore += 15;
          break;
        case 'LOW':
          riskScore += 5;
          break;
      }
    });

    // Factor in unauthorized access attempts
    const unauthorized = history.filter(e => !e.authorized);
    riskScore += unauthorized.length * 15;

    return Math.min(riskScore, 100);
  }
}
