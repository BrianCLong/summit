/**
 * AI Security Scanner - Core scanning engine with AI-powered analysis
 */

import { createHash, randomUUID } from 'crypto';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import type {
  ScanConfig,
  ScanResult,
  Vulnerability,
  ScanSummary,
  SeverityLevel,
  VulnerabilityCategory,
  Evidence,
  Attribution,
} from '../types.js';
import { ComplianceLogger } from '../compliance/compliance-logger.js';

// Security patterns for static analysis
const SECURITY_PATTERNS: SecurityPattern[] = [
  // Injection vulnerabilities
  {
    id: 'SQL_INJECTION',
    pattern: /(\$\{.*\}|`.*\$\{.*\}`|'.*\+.*'|".*\+.*").*(?:query|execute|raw|sql)/gi,
    category: 'injection',
    severity: 'critical',
    cweId: 'CWE-89',
    title: 'Potential SQL Injection',
    description: 'String concatenation in SQL queries may allow SQL injection attacks',
  },
  {
    id: 'COMMAND_INJECTION',
    pattern: /(?:exec|spawn|execSync|spawnSync|execFile)\s*\([^)]*(?:\$\{|\+|`)/gi,
    category: 'injection',
    severity: 'critical',
    cweId: 'CWE-78',
    title: 'Potential Command Injection',
    description: 'Unsanitized input in shell commands may allow command injection',
  },
  {
    id: 'XSS',
    pattern: /(?:innerHTML|outerHTML|document\.write)\s*=\s*[^;]*(?:\$\{|`|\+)/gi,
    category: 'injection',
    severity: 'high',
    cweId: 'CWE-79',
    title: 'Potential Cross-Site Scripting (XSS)',
    description: 'Unsanitized input in DOM manipulation may allow XSS attacks',
  },
  // Authentication issues
  {
    id: 'HARDCODED_SECRET',
    pattern: /(?:password|secret|api_key|apikey|token|credential)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
    category: 'authentication',
    severity: 'critical',
    cweId: 'CWE-798',
    title: 'Hardcoded Credentials',
    description: 'Credentials hardcoded in source code pose security risk',
  },
  {
    id: 'WEAK_CRYPTO',
    pattern: /(?:md5|sha1|des|rc4)\s*\(/gi,
    category: 'cryptographic',
    severity: 'high',
    cweId: 'CWE-327',
    title: 'Weak Cryptographic Algorithm',
    description: 'Use of deprecated/weak cryptographic algorithms',
  },
  // Authorization issues
  {
    id: 'MISSING_AUTH_CHECK',
    pattern: /(?:app|router)\.(get|post|put|delete|patch)\s*\([^)]+,\s*(?:async\s*)?\([^)]*\)\s*=>/gi,
    category: 'authorization',
    severity: 'medium',
    cweId: 'CWE-862',
    title: 'Potentially Missing Authorization',
    description: 'Route handler may lack authorization checks',
  },
  // Data exposure
  {
    id: 'SENSITIVE_DATA_LOG',
    pattern: /console\.(?:log|info|debug|warn)\s*\([^)]*(?:password|token|secret|ssn|credit)/gi,
    category: 'data-exposure',
    severity: 'high',
    cweId: 'CWE-532',
    title: 'Sensitive Data in Logs',
    description: 'Potentially logging sensitive information',
  },
  // Path traversal
  {
    id: 'PATH_TRAVERSAL',
    pattern: /(?:readFile|writeFile|createReadStream|createWriteStream)\s*\([^)]*(?:req\.|params\.|query\.)/gi,
    category: 'injection',
    severity: 'high',
    cweId: 'CWE-22',
    title: 'Potential Path Traversal',
    description: 'User input in file operations may allow path traversal',
  },
  // Prototype pollution
  {
    id: 'PROTOTYPE_POLLUTION',
    pattern: /(?:Object\.assign|_\.merge|_\.extend|_\.defaultsDeep)\s*\([^)]*(?:req\.|body|params)/gi,
    category: 'injection',
    severity: 'high',
    cweId: 'CWE-1321',
    title: 'Potential Prototype Pollution',
    description: 'Merging user input into objects may allow prototype pollution',
  },
  // SSRF
  {
    id: 'SSRF',
    pattern: /(?:fetch|axios|request|http\.get|https\.get)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/gi,
    category: 'injection',
    severity: 'high',
    cweId: 'CWE-918',
    title: 'Potential Server-Side Request Forgery (SSRF)',
    description: 'User input in HTTP requests may allow SSRF attacks',
  },
  // Insecure deserialization
  {
    id: 'INSECURE_DESERIALIZE',
    pattern: /(?:JSON\.parse|deserialize|unserialize|pickle\.loads)\s*\([^)]*(?:req\.|body|input)/gi,
    category: 'injection',
    severity: 'high',
    cweId: 'CWE-502',
    title: 'Potential Insecure Deserialization',
    description: 'Deserializing untrusted data may allow code execution',
  },
];

interface SecurityPattern {
  id: string;
  pattern: RegExp;
  category: VulnerabilityCategory;
  severity: SeverityLevel;
  cweId: string;
  title: string;
  description: string;
}

interface ScanContext {
  scanId: string;
  startTime: Date;
  config: ScanConfig;
  logger: ComplianceLogger;
}

export class AISecurityScanner {
  private config: ScanConfig;
  private logger: ComplianceLogger;

  constructor(config: Partial<ScanConfig> = {}) {
    this.config = {
      targetPaths: ['src/', 'services/', 'packages/'],
      excludePaths: ['node_modules/', 'dist/', '.git/', 'archive/'],
      scanTypes: ['static-analysis', 'dependency-audit', 'secret-detection'],
      severityThreshold: 'low',
      enableAIAnalysis: true,
      enableRedTeam: false,
      complianceFrameworks: ['NIST', 'SOC2'],
      maxConcurrency: 10,
      timeout: 300000,
      ...config,
    };
    this.logger = new ComplianceLogger({
      serviceName: 'ai-security-scanner',
      enableZeroTrust: true,
      retentionDays: 2555, // 7 years for compliance
    });
  }

  async scan(basePath: string): Promise<ScanResult> {
    const scanId = randomUUID();
    const startTime = new Date();

    const ctx: ScanContext = {
      scanId,
      startTime,
      config: this.config,
      logger: this.logger,
    };

    await this.logger.logScanStart(scanId, basePath, this.config);

    const vulnerabilities: Vulnerability[] = [];
    let filesScanned = 0;
    let totalFiles = 0;

    try {
      // Gather files to scan
      const files = await this.gatherFiles(basePath);
      totalFiles = files.length;

      // Scan each file
      for (const file of files) {
        try {
          const fileVulns = await this.scanFile(file, ctx);
          vulnerabilities.push(...fileVulns);
          filesScanned++;
        } catch (error) {
          await this.logger.logError(scanId, `Failed to scan ${file}`, error);
        }
      }

      // Dependency audit
      if (this.config.scanTypes.includes('dependency-audit')) {
        const depVulns = await this.auditDependencies(basePath, ctx);
        vulnerabilities.push(...depVulns);
      }

      // AI-powered analysis
      if (this.config.enableAIAnalysis) {
        const aiVulns = await this.performAIAnalysis(vulnerabilities, ctx);
        vulnerabilities.push(...aiVulns);
      }

      const endTime = new Date();
      const summary = this.generateSummary(vulnerabilities, filesScanned, totalFiles);
      const complianceReport = await this.generateComplianceReport(vulnerabilities);

      const result: ScanResult = {
        scanId,
        startTime,
        endTime,
        status: 'completed',
        vulnerabilities,
        summary,
        complianceReport,
        auditTrail: await this.logger.getAuditTrail(scanId),
      };

      await this.logger.logScanComplete(scanId, result);

      return result;
    } catch (error) {
      await this.logger.logError(scanId, 'Scan failed', error);
      throw error;
    }
  }

  private async gatherFiles(basePath: string): Promise<string[]> {
    const patterns = this.config.targetPaths.map((p) => `${basePath}/${p}**/*.{ts,tsx,js,jsx,py,go,java}`);
    const ignore = this.config.excludePaths.map((p) => `**/${p}**`);

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore, nodir: true });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  private async scanFile(filePath: string, ctx: ScanContext): Promise<Vulnerability[]> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const vulnerabilities: Vulnerability[] = [];

    for (const pattern of SECURITY_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.pattern.lastIndex = 0;

      let match;
      while ((match = pattern.pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const startLine = Math.max(1, lineNumber - 2);
        const endLine = Math.min(lines.length, lineNumber + 2);
        const codeSnippet = lines.slice(startLine - 1, endLine).join('\n');

        const vuln = this.createVulnerability(pattern, filePath, lineNumber, codeSnippet, ctx);
        vulnerabilities.push(vuln);

        await this.logger.logVulnerabilityDetected(ctx.scanId, vuln);
      }
    }

    return vulnerabilities;
  }

  private createVulnerability(
    pattern: SecurityPattern,
    file: string,
    line: number,
    codeSnippet: string,
    ctx: ScanContext
  ): Vulnerability {
    const id = `${pattern.id}-${createHash('sha256').update(`${file}:${line}`).digest('hex').substring(0, 8)}`;

    return {
      id,
      title: pattern.title,
      description: pattern.description,
      severity: pattern.severity,
      category: pattern.category,
      cvssScore: this.severityToCVSS(pattern.severity),
      cweId: pattern.cweId,
      location: {
        file,
        startLine: line,
        endLine: line,
        codeSnippet,
      },
      attribution: {
        source: 'static-analysis',
        confidence: 0.85,
        scanId: ctx.scanId,
        timestamp: new Date(),
        attackVector: this.getAttackVector(pattern.category),
      },
      evidence: [
        {
          type: 'code-pattern',
          description: `Pattern match: ${pattern.id}`,
          data: { patternId: pattern.id, matchedCode: codeSnippet },
          hash: createHash('sha256').update(codeSnippet).digest('hex'),
        },
      ],
      remediation: this.getRemediation(pattern),
      complianceImpact: this.getComplianceImpact(pattern),
      detectedAt: new Date(),
      status: 'open',
    };
  }

  private severityToCVSS(severity: SeverityLevel): number {
    const mapping: Record<SeverityLevel, number> = {
      critical: 9.5,
      high: 7.5,
      medium: 5.0,
      low: 2.5,
      info: 0.0,
    };
    return mapping[severity];
  }

  private getAttackVector(category: VulnerabilityCategory): string {
    const vectors: Record<VulnerabilityCategory, string> = {
      injection: 'Network/Local',
      authentication: 'Network',
      authorization: 'Network',
      cryptographic: 'Network/Local',
      configuration: 'Local',
      'data-exposure': 'Network',
      dos: 'Network',
      'supply-chain': 'Network',
      'logic-flaw': 'Network/Local',
    };
    return vectors[category];
  }

  private getRemediation(pattern: SecurityPattern): Vulnerability['remediation'] {
    const remediations: Record<string, Vulnerability['remediation']> = {
      SQL_INJECTION: {
        description: 'Use parameterized queries or prepared statements',
        priority: 'immediate',
        estimatedEffort: '1-2 hours',
        automatable: true,
        verificationSteps: [
          'Replace string concatenation with parameterized queries',
          'Run SQL injection test suite',
          'Verify application functionality',
        ],
      },
      COMMAND_INJECTION: {
        description: 'Sanitize inputs and avoid shell command execution',
        priority: 'immediate',
        estimatedEffort: '2-4 hours',
        automatable: false,
        verificationSteps: [
          'Use child_process.execFile with argument array',
          'Validate and sanitize all inputs',
          'Test with malicious input patterns',
        ],
      },
      HARDCODED_SECRET: {
        description: 'Move credentials to environment variables or secrets manager',
        priority: 'immediate',
        estimatedEffort: '30 minutes',
        automatable: true,
        verificationSteps: [
          'Remove hardcoded credentials',
          'Add to .env or secrets manager',
          'Update deployment configuration',
          'Rotate compromised credentials',
        ],
      },
      XSS: {
        description: 'Sanitize output and use safe DOM APIs',
        priority: 'high',
        estimatedEffort: '1-2 hours',
        automatable: true,
        verificationSteps: [
          'Use textContent instead of innerHTML',
          'Apply output encoding',
          'Run XSS test suite',
        ],
      },
      WEAK_CRYPTO: {
        description: 'Upgrade to strong cryptographic algorithms (SHA-256+, AES-256)',
        priority: 'high',
        estimatedEffort: '2-4 hours',
        automatable: true,
        verificationSteps: [
          'Replace MD5/SHA1 with SHA-256 or better',
          'Update all dependent code',
          'Verify cryptographic operations',
        ],
      },
    };

    return (
      remediations[pattern.id] || {
        description: 'Review and fix the identified security issue',
        priority: 'medium',
        estimatedEffort: '1-4 hours',
        automatable: false,
        verificationSteps: ['Review the flagged code', 'Apply security best practices', 'Test thoroughly'],
      }
    );
  }

  private getComplianceImpact(pattern: SecurityPattern): Vulnerability['complianceImpact'] {
    const impacts: Vulnerability['complianceImpact'] = [];

    // NIST mappings
    if (['injection', 'authentication', 'authorization'].includes(pattern.category)) {
      impacts.push({
        framework: 'NIST',
        control: 'SI-10',
        impact: 'violation',
        description: 'Information Input Validation - Input validation controls not properly implemented',
      });
    }

    if (pattern.category === 'cryptographic') {
      impacts.push({
        framework: 'NIST',
        control: 'SC-13',
        impact: 'violation',
        description: 'Cryptographic Protection - Weak cryptographic mechanisms in use',
      });
    }

    // SOC2 mappings
    if (pattern.severity === 'critical' || pattern.severity === 'high') {
      impacts.push({
        framework: 'SOC2',
        control: 'CC6.1',
        impact: 'violation',
        description: 'Logical and Physical Access Controls - Security vulnerability detected',
      });
    }

    // PCI-DSS for data exposure
    if (pattern.category === 'data-exposure') {
      impacts.push({
        framework: 'PCI-DSS',
        control: '6.5.3',
        impact: 'violation',
        description: 'Insecure cryptographic storage or transmission',
      });
    }

    return impacts;
  }

  private async auditDependencies(basePath: string, ctx: ScanContext): Promise<Vulnerability[]> {
    // Placeholder for dependency audit integration
    // Would integrate with npm audit, Snyk, or Trivy
    await this.logger.logAction(ctx.scanId, 'dependency-audit', { basePath });
    return [];
  }

  private async performAIAnalysis(
    existingVulns: Vulnerability[],
    ctx: ScanContext
  ): Promise<Vulnerability[]> {
    // AI-powered analysis for complex vulnerability patterns
    // This would integrate with Claude API for advanced analysis
    await this.logger.logAction(ctx.scanId, 'ai-analysis', {
      existingVulnCount: existingVulns.length,
    });
    return [];
  }

  private generateSummary(vulns: Vulnerability[], scanned: number, total: number): ScanSummary {
    const bySeverity: Record<SeverityLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Record<string, number> = {};

    for (const vuln of vulns) {
      bySeverity[vuln.severity]++;
      byCategory[vuln.category] = (byCategory[vuln.category] || 0) + 1;
    }

    const riskScore = this.calculateRiskScore(vulns);

    return {
      totalFiles: total,
      filesScanned: scanned,
      vulnerabilitiesBySeverity: bySeverity,
      vulnerabilitiesByCategory: byCategory,
      remediationProgress: 0,
      riskScore,
    };
  }

  private calculateRiskScore(vulns: Vulnerability[]): number {
    const weights: Record<SeverityLevel, number> = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1,
      info: 0,
    };

    const totalWeight = vulns.reduce((sum, v) => sum + weights[v.severity], 0);
    return Math.min(100, totalWeight);
  }

  private async generateComplianceReport(vulns: Vulnerability[]): Promise<ScanResult['complianceReport']> {
    const frameworkScores: Record<string, { passed: number; failed: number }> = {};

    for (const vuln of vulns) {
      for (const impact of vuln.complianceImpact) {
        if (!frameworkScores[impact.framework]) {
          frameworkScores[impact.framework] = { passed: 100, failed: 0 };
        }
        if (impact.impact === 'violation') {
          frameworkScores[impact.framework].failed++;
        }
      }
    }

    const frameworks = Object.entries(frameworkScores).map(([framework, scores]) => ({
      framework,
      score: Math.max(0, 100 - scores.failed * 5),
      controlsPassed: scores.passed - scores.failed,
      controlsFailed: scores.failed,
      controlsNotApplicable: 0,
    }));

    const gaps = vulns
      .filter((v) => v.complianceImpact.length > 0)
      .flatMap((v) =>
        v.complianceImpact.map((impact) => ({
          framework: impact.framework,
          control: impact.control,
          gap: impact.description,
          severity: v.severity,
          remediation: v.remediation.description,
        }))
      );

    return {
      frameworks,
      overallScore: frameworks.length > 0 ? frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length : 100,
      gaps,
      recommendations: this.generateRecommendations(vulns),
    };
  }

  private generateRecommendations(vulns: Vulnerability[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = vulns.filter((v) => v.severity === 'critical').length;
    const highCount = vulns.filter((v) => v.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(
        `URGENT: ${criticalCount} critical vulnerabilities require immediate attention`
      );
    }

    if (highCount > 0) {
      recommendations.push(
        `HIGH PRIORITY: ${highCount} high-severity issues should be addressed within 72 hours`
      );
    }

    const injectionVulns = vulns.filter((v) => v.category === 'injection');
    if (injectionVulns.length > 0) {
      recommendations.push('Implement comprehensive input validation and output encoding across the application');
    }

    const authVulns = vulns.filter((v) => v.category === 'authentication' || v.category === 'authorization');
    if (authVulns.length > 0) {
      recommendations.push('Review and strengthen authentication and authorization mechanisms');
    }

    return recommendations;
  }
}
