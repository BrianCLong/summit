/**
 * Notification Severity Calculator
 *
 * Calculates the notification severity based on audit event characteristics.
 * Higher severity notifications get priority routing and bypass throttling.
 */

import type {
  AuditEvent,
  AuditLevel,
  NotificationSeverity,
} from './types.js';

/**
 * High-risk event types that should trigger elevated notifications
 */
const HIGH_RISK_EVENT_TYPES = new Set([
  'access_denied',
  'permission_revoked',
  'data_breach',
  'data_deletion',
  'data_export',
  'security_alert',
  'anomaly_detected',
  'brute_force_detected',
  'suspicious_activity',
  'policy_violation',
  'rate_limit_exceeded',
  'session_hijack',
  'privilege_escalation',
  'unauthorized_access',
  'data_tampering',
]);

/**
 * Compliance-sensitive event types
 */
const COMPLIANCE_SENSITIVE_EVENT_TYPES = new Set([
  'data_deletion',
  'data_export',
  'data_anonymization',
  'policy_decision',
  'policy_violation',
  'compliance_check',
  'audit_trail_access',
  'phi_access', // HIPAA
  'pii_access', // GDPR
]);

/**
 * Base severity scores for audit levels
 */
const AUDIT_LEVEL_SCORES: Record<AuditLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

/**
 * Calculate notification severity for an audit event
 */
export function calculateNotificationSeverity(
  event: AuditEvent
): NotificationSeverity {
  let score = 0;

  // 1. Base severity from audit event level
  score += AUDIT_LEVEL_SCORES[event.level] || 0;

  // 2. Compliance impact adds weight
  if (event.compliance_frameworks && event.compliance_frameworks.length > 0) {
    score += 1;

    // Extra weight for HIPAA or SOX (financial/health regulations)
    if (
      event.compliance_frameworks.includes('HIPAA') ||
      event.compliance_frameworks.includes('SOX')
    ) {
      score += 1;
    }
  }

  // 3. High-risk event types
  if (HIGH_RISK_EVENT_TYPES.has(event.event_type)) {
    score += 2;
  }

  // 4. Compliance-sensitive event types
  if (COMPLIANCE_SENSITIVE_EVENT_TYPES.has(event.event_type)) {
    score += 1;
  }

  // 5. Failed operations add weight (security concern)
  if (event.outcome === 'failure') {
    score += 1;

    // Multiple failed operations in metadata (e.g., brute force)
    if (
      event.metadata &&
      typeof event.metadata.failureCount === 'number' &&
      event.metadata.failureCount > 3
    ) {
      score += 2;
    }
  }

  // 6. Legal hold or investigation context is critical
  if (event.legal_hold === true) {
    score += 2;
  }

  // 7. Data classification impact
  if (event.data_classification) {
    const classification = event.data_classification.toLowerCase();
    if (classification === 'top_secret' || classification === 'confidential') {
      score += 2;
    } else if (classification === 'secret' || classification === 'restricted') {
      score += 1;
    }
  }

  // 8. Security-related tags
  if (event.tags) {
    const securityTags = [
      'security',
      'breach',
      'attack',
      'intrusion',
      'malware',
      'phishing',
    ];
    const hasSecurityTag = event.tags.some((tag) =>
      securityTags.some((secTag) => tag.toLowerCase().includes(secTag))
    );
    if (hasSecurityTag) {
      score += 1;
    }
  }

  // 9. Geolocation anomaly (if metadata indicates unusual location)
  if (
    event.metadata &&
    event.metadata.geolocationAnomaly === true
  ) {
    score += 1;
  }

  // 10. System-wide impact (service outages, config changes)
  if (
    event.event_type === 'system_error' ||
    event.event_type === 'system_stop' ||
    event.event_type === 'config_change'
  ) {
    score += 1;
  }

  // Convert score to notification severity
  return scoreToSeverity(score);
}

/**
 * Convert numerical score to notification severity level
 */
function scoreToSeverity(score: number): NotificationSeverity {
  if (score >= 8) return 'emergency'; // Immediate action required
  if (score >= 6) return 'critical'; // High priority, all channels
  if (score >= 4) return 'high'; // Urgent, immediate delivery
  if (score >= 2) return 'medium'; // Important, throttled delivery
  return 'low'; // Informational, digest-only
}

/**
 * Check if an event should trigger immediate notification
 * (bypass throttling and quiet hours)
 */
export function requiresImmediateNotification(
  event: AuditEvent,
  severity: NotificationSeverity
): boolean {
  // Emergency and critical always immediate
  if (severity === 'emergency' || severity === 'critical') {
    return true;
  }

  // Legal hold events are always immediate
  if (event.legal_hold === true) {
    return true;
  }

  // Data breach is always immediate
  if (event.event_type === 'data_breach') {
    return true;
  }

  // Multiple failed auth attempts (brute force)
  if (
    event.event_type === 'brute_force_detected' ||
    (event.event_type === 'user_login' &&
      event.outcome === 'failure' &&
      event.metadata &&
      typeof event.metadata.consecutiveFailures === 'number' &&
      event.metadata.consecutiveFailures > 5)
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate escalation level for notification routing
 * Returns number of escalation tiers (0 = no escalation)
 */
export function calculateEscalationLevel(
  event: AuditEvent,
  severity: NotificationSeverity
): number {
  if (severity === 'emergency') {
    return 3; // Escalate to executives/on-call
  }

  if (severity === 'critical') {
    return 2; // Escalate to managers/security team
  }

  if (severity === 'high' && event.legal_hold === true) {
    return 1; // Escalate to compliance team
  }

  return 0; // No escalation
}

/**
 * Determine if notification should include sensitive data
 * Some high-severity events should mask PII/PHI in notifications
 */
export function shouldMaskSensitiveData(event: AuditEvent): boolean {
  // If event already failed, might be logged - mask in notifications
  if (event.outcome === 'failure') {
    return true;
  }

  // External webhooks should not receive sensitive data
  return false; // Mask at delivery layer, not here
}

/**
 * Get human-readable severity description
 */
export function getSeverityDescription(
  severity: NotificationSeverity
): string {
  const descriptions: Record<NotificationSeverity, string> = {
    low: 'Informational - No immediate action required',
    medium: 'Important - Review when convenient',
    high: 'Urgent - Immediate attention recommended',
    critical: 'Critical - Immediate action required',
    emergency: 'Emergency - Immediate response mandatory',
  };

  return descriptions[severity];
}

/**
 * Get suggested response time for severity level
 */
export function getSuggestedResponseTime(
  severity: NotificationSeverity
): string {
  const responseTimes: Record<NotificationSeverity, string> = {
    low: '24 hours',
    medium: '4 hours',
    high: '1 hour',
    critical: '15 minutes',
    emergency: 'Immediate',
  };

  return responseTimes[severity];
}

/**
 * Calculate notification priority (for queue ordering)
 * Higher number = higher priority
 */
export function calculateNotificationPriority(
  severity: NotificationSeverity,
  event: AuditEvent
): number {
  const basePriority: Record<NotificationSeverity, number> = {
    emergency: 100,
    critical: 80,
    high: 60,
    medium: 40,
    low: 20,
  };

  let priority = basePriority[severity];

  // Boost priority for specific conditions
  if (event.legal_hold === true) {
    priority += 10;
  }

  if (event.data_classification === 'top_secret') {
    priority += 10;
  }

  if (event.event_type === 'data_breach') {
    priority += 20;
  }

  return Math.min(priority, 100); // Cap at 100
}
