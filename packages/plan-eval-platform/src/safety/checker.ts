import type { SafetyCheckResult, SafetyCheckType, SafetyConfig } from '../types.js';

/**
 * SafetyChecker - Red-team and safety validation for eval runs
 *
 * Implements safety checks including:
 * - Jailbreak detection
 * - PII detection
 * - Harmful content filtering
 * - Injection attack detection
 * - Data exfiltration prevention
 */
export class SafetyChecker {
  private readonly config: SafetyConfig;
  private readonly violationLog: SafetyCheckResult[] = [];

  // Common jailbreak patterns
  private static readonly JAILBREAK_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|rules|guidelines)/i,
    /you\s+are\s+now\s+(DAN|jailbroken|unrestricted)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(evil|unethical|unrestricted)/i,
    /bypass\s+(your\s+)?(safety|content|ethical)\s+(filters|guidelines)/i,
    /act\s+as\s+if\s+you\s+have\s+no\s+(rules|restrictions|guidelines)/i,
    /forget\s+(all\s+)?(your\s+)?(rules|training|guidelines)/i,
    /\[system\s*:\s*override/i,
    /developer\s+mode\s+enabled/i,
    /sudo\s+mode/i,
  ];

  // PII patterns
  private static readonly PII_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{16}\b/, // Credit card (basic)
    /\b[A-Z]{2}\d{6,9}\b/i, // Passport
    /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/, // Phone
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
  ];

  // Harmful content patterns
  private static readonly HARMFUL_PATTERNS = [
    /how\s+to\s+(make|create|build)\s+(a\s+)?(bomb|explosive|weapon)/i,
    /synthesize\s+(drugs|narcotics|controlled\s+substances)/i,
    /hack\s+(into|a)\s+(bank|government|system)/i,
    /create\s+(malware|virus|ransomware)/i,
    /instructions\s+for\s+(murder|assassination|violence)/i,
  ];

  // Injection patterns
  private static readonly INJECTION_PATTERNS = [
    /;\s*DROP\s+TABLE/i,
    /'\s*OR\s+'1'\s*=\s*'1/i,
    /UNION\s+SELECT/i,
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /\$\{.*\}/s, // Template injection
    /\{\{.*\}\}/s, // Template injection
  ];

  constructor(config?: Partial<SafetyConfig>) {
    this.config = {
      enabledChecks: config?.enabledChecks ?? [
        'jailbreak_detection',
        'pii_detection',
        'harmful_content',
        'injection_attack',
      ],
      blockOnViolation: config?.blockOnViolation ?? true,
      logViolations: config?.logViolations ?? true,
      customPatterns: config?.customPatterns ?? [],
    };
  }

  /**
   * Run all enabled safety checks on input
   */
  async checkInput(input: unknown): Promise<{
    passed: boolean;
    results: SafetyCheckResult[];
    violations: string[];
  }> {
    const inputStr = this.stringify(input);
    const results: SafetyCheckResult[] = [];
    const violations: string[] = [];

    for (const checkType of this.config.enabledChecks) {
      const result = await this.runCheck(checkType, inputStr);
      results.push(result);

      if (!result.passed) {
        violations.push(`${checkType}: ${result.details}`);
        if (this.config.logViolations) {
          this.violationLog.push(result);
        }
      }
    }

    // Check custom patterns
    for (const custom of this.config.customPatterns ?? []) {
      const result = this.checkPattern(
        inputStr,
        custom.pattern,
        custom.name,
        custom.severity,
      );
      results.push(result);
      if (!result.passed) {
        violations.push(`${custom.name}: ${result.details}`);
        if (this.config.logViolations) {
          this.violationLog.push(result);
        }
      }
    }

    const passed =
      !this.config.blockOnViolation ||
      results.every((r) => r.passed);

    return { passed, results, violations };
  }

  /**
   * Run a specific safety check
   */
  private async runCheck(
    type: SafetyCheckType,
    input: string,
  ): Promise<SafetyCheckResult> {
    switch (type) {
      case 'jailbreak_detection':
        return this.checkJailbreak(input);
      case 'pii_detection':
        return this.checkPII(input);
      case 'harmful_content':
        return this.checkHarmfulContent(input);
      case 'injection_attack':
        return this.checkInjection(input);
      case 'data_exfiltration':
        return this.checkDataExfiltration(input);
      default:
        return {
          type,
          passed: true,
          severity: 'low',
          details: 'Unknown check type',
          confidence: 0,
        };
    }
  }

  /**
   * Check for jailbreak attempts
   */
  private checkJailbreak(input: string): SafetyCheckResult {
    for (const pattern of SafetyChecker.JAILBREAK_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'jailbreak_detection',
          passed: false,
          severity: 'critical',
          details: 'Jailbreak attempt detected',
          confidence: 0.9,
          flaggedContent: match[0],
        };
      }
    }

    return {
      type: 'jailbreak_detection',
      passed: true,
      severity: 'low',
      details: 'No jailbreak patterns detected',
      confidence: 0.95,
    };
  }

  /**
   * Check for PII
   */
  private checkPII(input: string): SafetyCheckResult {
    for (const pattern of SafetyChecker.PII_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'pii_detection',
          passed: false,
          severity: 'high',
          details: 'Potential PII detected',
          confidence: 0.85,
          flaggedContent: this.redact(match[0]),
        };
      }
    }

    return {
      type: 'pii_detection',
      passed: true,
      severity: 'low',
      details: 'No PII patterns detected',
      confidence: 0.9,
    };
  }

  /**
   * Check for harmful content
   */
  private checkHarmfulContent(input: string): SafetyCheckResult {
    for (const pattern of SafetyChecker.HARMFUL_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'harmful_content',
          passed: false,
          severity: 'critical',
          details: 'Potentially harmful content detected',
          confidence: 0.88,
          flaggedContent: match[0],
        };
      }
    }

    return {
      type: 'harmful_content',
      passed: true,
      severity: 'low',
      details: 'No harmful content patterns detected',
      confidence: 0.92,
    };
  }

  /**
   * Check for injection attacks
   */
  private checkInjection(input: string): SafetyCheckResult {
    for (const pattern of SafetyChecker.INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'injection_attack',
          passed: false,
          severity: 'high',
          details: 'Potential injection attack detected',
          confidence: 0.87,
          flaggedContent: match[0],
        };
      }
    }

    return {
      type: 'injection_attack',
      passed: true,
      severity: 'low',
      details: 'No injection patterns detected',
      confidence: 0.93,
    };
  }

  /**
   * Check for data exfiltration attempts
   */
  private checkDataExfiltration(input: string): SafetyCheckResult {
    const exfilPatterns = [
      /send\s+(all|my|the)\s+(data|files|documents)\s+to/i,
      /upload\s+(to|everything\s+to)\s+external/i,
      /copy\s+(all|everything)\s+to\s+(my|external|remote)/i,
      /exfiltrate/i,
    ];

    for (const pattern of exfilPatterns) {
      const match = input.match(pattern);
      if (match) {
        return {
          type: 'data_exfiltration',
          passed: false,
          severity: 'critical',
          details: 'Potential data exfiltration attempt',
          confidence: 0.82,
          flaggedContent: match[0],
        };
      }
    }

    return {
      type: 'data_exfiltration',
      passed: true,
      severity: 'low',
      details: 'No exfiltration patterns detected',
      confidence: 0.9,
    };
  }

  /**
   * Check a custom pattern
   */
  private checkPattern(
    input: string,
    patternStr: string,
    name: string,
    severity: SafetyCheckResult['severity'],
  ): SafetyCheckResult {
    const pattern = new RegExp(patternStr, 'i');
    const match = input.match(pattern);

    if (match) {
      return {
        type: 'harmful_content', // Custom patterns fall under harmful content
        passed: false,
        severity,
        details: `Custom pattern '${name}' matched`,
        confidence: 0.8,
        flaggedContent: match[0],
      };
    }

    return {
      type: 'harmful_content',
      passed: true,
      severity: 'low',
      details: `Custom pattern '${name}' not matched`,
      confidence: 0.85,
    };
  }

  /**
   * Get violation log
   */
  getViolationLog(): SafetyCheckResult[] {
    return [...this.violationLog];
  }

  /**
   * Clear violation log
   */
  clearViolationLog(): void {
    this.violationLog.length = 0;
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    total: number;
    byType: Map<SafetyCheckType, number>;
    bySeverity: Map<string, number>;
  } {
    const byType = new Map<SafetyCheckType, number>();
    const bySeverity = new Map<string, number>();

    for (const v of this.violationLog) {
      byType.set(v.type, (byType.get(v.type) ?? 0) + 1);
      bySeverity.set(v.severity, (bySeverity.get(v.severity) ?? 0) + 1);
    }

    return {
      total: this.violationLog.length,
      byType,
      bySeverity,
    };
  }

  /**
   * Stringify input for pattern matching
   */
  private stringify(input: unknown): string {
    if (typeof input === 'string') {
      return input;
    }
    return JSON.stringify(input);
  }

  /**
   * Redact sensitive content for logging
   */
  private redact(content: string): string {
    if (content.length <= 4) {
      return '****';
    }
    return content.slice(0, 2) + '*'.repeat(content.length - 4) + content.slice(-2);
  }
}

/**
 * Create a safety checker with default config
 */
export function createSafetyChecker(
  config?: Partial<SafetyConfig>,
): SafetyChecker {
  return new SafetyChecker(config);
}
