/**
 * Ethical compliance and safeguard checks
 * @module @summit/geopolitical-analysis/safeguards/compliance
 */

import {
  ComplianceCheckResult,
  ComplianceViolation,
  AnalysisRequest,
  GeopoliticalIndicator,
} from '../types/index.js';

/**
 * Prohibited analysis types that violate ethical guidelines
 */
const PROHIBITED_PATTERNS = [
  /false.?flag/i,
  /coup.?plan/i,
  /assassination/i,
  /regime.?change.?operation/i,
  /election.?manipulation/i,
  /color.?revolution.?planning/i,
  /destabili[sz]ation.?plan/i,
];

/**
 * Required safeguards for sensitive analyses
 */
const SENSITIVE_INDICATORS = new Set([
  'LEADERSHIP_TRANSITION',
  'MILITARY_CAPABILITY',
  'NUCLEAR_CAPABILITY',
  'HUMANITARIAN_CRISIS',
]);

/**
 * Check if analysis request complies with ethical guidelines
 */
export function checkAnalysisCompliance(
  request: AnalysisRequest,
  requestor: string,
  purpose: string
): ComplianceCheckResult {
  const violations: ComplianceViolation[] = [];
  const timestamp = new Date();

  // Check for prohibited patterns in purpose description
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(purpose)) {
      violations.push({
        category: 'ETHICS',
        severity: 'CRITICAL',
        description: `Purpose description contains prohibited pattern: ${pattern}`,
        remediation:
          'Remove prohibited content. Analysis must focus on legitimate early warning, risk assessment, or humanitarian purposes.',
      });
    }
  }

  // Check for sensitive indicators without proper justification
  if (request.indicatorTypes) {
    const sensitiverequest = request.indicatorTypes.filter((type) =>
      SENSITIVE_INDICATORS.has(type)
    );

    if (sensitiveRequested.length > 0 && purpose.length < 50) {
      violations.push({
        category: 'OPERATIONAL',
        severity: 'MEDIUM',
        description: `Sensitive indicators requested (${sensitiveRequested.join(', ')}) without adequate justification`,
        remediation:
          'Provide detailed justification (minimum 50 characters) for analyzing sensitive indicators.',
      });
    }
  }

  // Check for bulk analysis without proper authorization
  if (
    request.countries &&
    request.countries.length > 20 &&
    !purpose.includes('comparative')
  ) {
    violations.push({
      category: 'OPERATIONAL',
      severity: 'LOW',
      description: `Large-scale analysis (${request.countries.length} countries) without explicit comparative purpose`,
      remediation:
        'For analyses covering >20 countries, specify comparative analysis purpose or reduce scope.',
    });
  }

  // Check for requestor authorization (placeholder - would integrate with actual auth system)
  if (!requestor || requestor === 'anonymous') {
    violations.push({
      category: 'OPERATIONAL',
      severity: 'HIGH',
      description: 'Analysis requested without authenticated user',
      remediation: 'Authenticate and provide valid user credentials.',
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp,
    reviewer: 'automated-compliance-check',
  };
}

/**
 * Check if indicator data complies with privacy and ethical standards
 */
export function checkIndicatorCompliance(
  indicator: GeopoliticalIndicator
): ComplianceCheckResult {
  const violations: ComplianceViolation[] = [];
  const timestamp = new Date();

  // Check for personally identifiable information (PII)
  const metadata = JSON.stringify(indicator.metadata);
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{16}\b/, // Credit card
    /passport/i,
    /driver.?license/i,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(metadata)) {
      violations.push({
        category: 'PRIVACY',
        severity: 'CRITICAL',
        description: `Indicator metadata appears to contain PII: ${pattern}`,
        remediation:
          'Remove all personally identifiable information from indicator data.',
      });
    }
  }

  // Check for proper source attribution
  if (!indicator.metadata.source) {
    violations.push({
      category: 'OPERATIONAL',
      severity: 'MEDIUM',
      description: 'Indicator missing source attribution',
      remediation: 'Add source information to metadata.source field.',
    });
  }

  // Check confidence level is set
  if (!indicator.confidence) {
    violations.push({
      category: 'OPERATIONAL',
      severity: 'LOW',
      description: 'Indicator missing confidence assessment',
      remediation: 'Calculate and set confidence level based on data quality.',
    });
  }

  // Check for reasonable score ranges
  if (indicator.score < 0 || indicator.score > 100) {
    violations.push({
      category: 'OPERATIONAL',
      severity: 'HIGH',
      description: `Indicator score out of valid range: ${indicator.score}`,
      remediation: 'Ensure score is normalized to 0-100 range.',
    });
  }

  // Special checks for sensitive indicator types
  if (indicator.type === 'HUMANITARIAN_CRISIS') {
    const crisis = indicator as any;
    if (crisis.internationalResponseNeeded && !crisis.metadata.responders) {
      violations.push({
        category: 'ETHICS',
        severity: 'MEDIUM',
        description:
          'Humanitarian crisis flagged without identifying response organizations',
        remediation:
          'Specify which humanitarian organizations should be notified.',
      });
    }
  }

  if (indicator.type === 'NUCLEAR_CAPABILITY') {
    const nuclear = indicator as any;
    if (
      nuclear.estimatedTimeToBreakoutMonths !== null &&
      !indicator.metadata.verificationSource
    ) {
      violations.push({
        category: 'ETHICS',
        severity: 'HIGH',
        description:
          'Nuclear breakout estimate provided without verification source',
        remediation:
          'Cite IAEA reports or other authoritative verification sources.',
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp,
    reviewer: 'automated-compliance-check',
  };
}

/**
 * Audit log entry for compliance tracking
 */
export interface ComplianceAuditLog {
  timestamp: Date;
  requestor: string;
  purpose: string;
  indicators: string[];
  complianceResult: ComplianceCheckResult;
  actionTaken: 'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW';
}

/**
 * Log compliance check for audit trail
 */
export function logComplianceCheck(
  log: ComplianceAuditLog
): void {
  // In production, this would write to secure audit log
  // For now, just console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[COMPLIANCE AUDIT]', {
      timestamp: log.timestamp.toISOString(),
      requestor: log.requestor,
      purpose: log.purpose.substring(0, 100),
      indicatorCount: log.indicators.length,
      passed: log.complianceResult.passed,
      violations: log.complianceResult.violations.length,
      action: log.actionTaken,
    });
  }

  // TODO: Integrate with actual audit logging system
  // - Write to secure, immutable audit log
  // - Alert on CRITICAL violations
  // - Generate compliance reports
}

/**
 * Check if analysis purposes align with legitimate use cases
 */
export function validatePurpose(purpose: string): {
  valid: boolean;
  category: string | null;
  concerns: string[];
} {
  const concerns: string[] = [];

  // Legitimate purpose categories
  const legitimateCategories = {
    'humanitarian-early-warning': /humanitarian|crisis|early.?warning|refugee/i,
    'risk-assessment': /risk|assessment|analysis|evaluation/i,
    'policy-planning': /policy|planning|strategy|development/i,
    'academic-research': /research|study|academic|analysis/i,
    'business-continuity': /business|continuity|investment|market/i,
    'diplomatic-strategy': /diplomatic|foreign.?policy|engagement/i,
  };

  // Check if purpose matches legitimate categories
  let matchedCategory: string | null = null;
  for (const [category, pattern] of Object.entries(legitimateCategories)) {
    if (pattern.test(purpose)) {
      matchedCategory = category;
      break;
    }
  }

  if (!matchedCategory) {
    concerns.push(
      'Purpose does not clearly match legitimate use case categories'
    );
  }

  // Check for concerning language
  const concerningPatterns = [
    { pattern: /manipulat/i, concern: 'Manipulation language detected' },
    { pattern: /destabili/i, concern: 'Destabilization language detected' },
    { pattern: /exploit/i, concern: 'Exploitation language detected' },
    { pattern: /attack/i, concern: 'Attack language detected' },
  ];

  for (const { pattern, concern } of concerningPatterns) {
    if (pattern.test(purpose)) {
      concerns.push(concern);
    }
  }

  return {
    valid: concerns.length === 0 && matchedCategory !== null,
    category: matchedCategory,
    concerns,
  };
}
