/**
 * Security Scan Validator
 *
 * Scans content for security issues including secrets, vulnerabilities, and risky patterns.
 *
 * @module pve/evaluator/validators/SecurityScanValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  SecurityScanInput,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface SecurityScanValidatorConfig {
  /** Secret patterns to detect */
  secretPatterns?: SecretPattern[];
  /** SAST patterns to check */
  sastPatterns?: SASTPattern[];
  /** Paths to ignore */
  ignorePaths?: string[];
  /** File extensions to scan */
  scanExtensions?: string[];
  /** Entropy threshold for secret detection */
  entropyThreshold?: number;
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'error' | 'warning';
  description?: string;
}

export interface SASTPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'error' | 'warning';
  cwe?: string;
  fix?: string;
}

const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: 'error',
    description: 'AWS Access Key ID',
  },
  {
    name: 'AWS Secret Key',
    pattern: /[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/,
    severity: 'error',
    description: 'Potential AWS Secret Access Key',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/,
    severity: 'error',
    description: 'GitHub Personal Access Token',
  },
  {
    name: 'GitLab Token',
    pattern: /glpat-[A-Za-z0-9\-_]{20,}/,
    severity: 'error',
    description: 'GitLab Personal Access Token',
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/,
    severity: 'error',
    description: 'Slack API Token',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: 'error',
    description: 'Private Key File',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
    severity: 'warning',
    description: 'JSON Web Token',
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
    severity: 'warning',
    description: 'Generic API Key',
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i,
    severity: 'warning',
    description: 'Generic Secret or Password',
  },
  {
    name: 'Azure Connection String',
    pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}/,
    severity: 'error',
    description: 'Azure Storage Connection String',
  },
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/,
    severity: 'error',
    description: 'Google API Key',
  },
  {
    name: 'Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/,
    severity: 'error',
    description: 'Stripe Secret API Key',
  },
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/,
    severity: 'error',
    description: 'SendGrid API Key',
  },
];

const DEFAULT_SAST_PATTERNS: SASTPattern[] = [
  {
    id: 'sql_injection',
    name: 'Potential SQL Injection',
    pattern: /(?:query|execute|exec)\s*\(\s*[`"'].*\$\{|query\s*\+\s*(?:req|params|body)/i,
    severity: 'error',
    cwe: 'CWE-89',
    fix: 'Use parameterized queries or prepared statements',
  },
  {
    id: 'xss',
    name: 'Potential XSS',
    pattern: /innerHTML\s*=\s*[^"'`]|dangerouslySetInnerHTML/,
    severity: 'warning',
    cwe: 'CWE-79',
    fix: 'Sanitize user input before rendering',
  },
  {
    id: 'command_injection',
    name: 'Potential Command Injection',
    pattern: /exec(?:Sync)?\s*\(\s*[`"'].*\$\{|spawn\s*\(\s*(?:req|params|body)/i,
    severity: 'error',
    cwe: 'CWE-78',
    fix: 'Use parameterized commands or avoid shell execution',
  },
  {
    id: 'path_traversal',
    name: 'Potential Path Traversal',
    pattern: /(?:readFile|writeFile|createReadStream|fs\..*)\s*\([^)]*(?:req|params|body)/i,
    severity: 'warning',
    cwe: 'CWE-22',
    fix: 'Validate and sanitize file paths',
  },
  {
    id: 'eval_usage',
    name: 'Dangerous eval() Usage',
    pattern: /\beval\s*\(/,
    severity: 'warning',
    cwe: 'CWE-95',
    fix: 'Avoid eval() - use safer alternatives',
  },
  {
    id: 'weak_crypto',
    name: 'Weak Cryptography',
    pattern: /crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i,
    severity: 'warning',
    cwe: 'CWE-327',
    fix: 'Use SHA-256 or stronger hash algorithms',
  },
  {
    id: 'hardcoded_ip',
    name: 'Hardcoded IP Address',
    pattern: /["']\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}["']/,
    severity: 'warning',
    cwe: 'CWE-798',
    fix: 'Use configuration or environment variables for IP addresses',
  },
];

const DEFAULT_CONFIG: SecurityScanValidatorConfig = {
  secretPatterns: DEFAULT_SECRET_PATTERNS,
  sastPatterns: DEFAULT_SAST_PATTERNS,
  ignorePaths: [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '*.min.js',
    '*.test.ts',
    '*.spec.ts',
    '__tests__/',
    '__mocks__/',
  ],
  scanExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.yaml', '.yml', '.json', '.env'],
  entropyThreshold: 4.5,
};

export class SecurityScanValidator {
  private config: SecurityScanValidatorConfig;

  constructor(config: SecurityScanValidatorConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      secretPatterns: config.secretPatterns || DEFAULT_SECRET_PATTERNS,
      sastPatterns: config.sastPatterns || DEFAULT_SAST_PATTERNS,
      ...config,
    };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'security_scan') {
      return [];
    }

    const input = context.input as SecurityScanInput;
    const results: PolicyResult[] = [];

    const contents = Array.isArray(input.content) ? input.content : [input.content];
    const filePaths = input.filePaths || contents.map((_, i) => `content_${i}`);

    switch (input.scanType) {
      case 'secrets':
        for (let i = 0; i < contents.length; i++) {
          if (!this.shouldScanFile(filePaths[i])) continue;
          results.push(...this.scanForSecrets(contents[i], filePaths[i]));
        }
        break;

      case 'sast':
        for (let i = 0; i < contents.length; i++) {
          if (!this.shouldScanFile(filePaths[i])) continue;
          results.push(...this.runSASTScan(contents[i], filePaths[i]));
        }
        break;

      default:
        // Run all scans
        for (let i = 0; i < contents.length; i++) {
          if (!this.shouldScanFile(filePaths[i])) continue;
          results.push(...this.scanForSecrets(contents[i], filePaths[i]));
          results.push(...this.runSASTScan(contents[i], filePaths[i]));
        }
    }

    // Add summary if no issues found
    if (results.every((r) => r.allowed)) {
      results.push(pass('pve.security.scan', 'No security issues detected'));
    }

    return results;
  }

  private shouldScanFile(filePath: string): boolean {
    // Check ignore paths
    for (const ignorePath of this.config.ignorePaths || []) {
      if (ignorePath.includes('*')) {
        const regex = new RegExp(ignorePath.replace(/\*/g, '.*'));
        if (regex.test(filePath)) {
          return false;
        }
      } else if (filePath.includes(ignorePath)) {
        return false;
      }
    }

    // Check extensions
    if (this.config.scanExtensions && this.config.scanExtensions.length > 0) {
      const ext = '.' + (filePath.split('.').pop() || '');
      return this.config.scanExtensions.includes(ext);
    }

    return true;
  }

  private scanForSecrets(content: string, filePath: string): PolicyResult[] {
    const results: PolicyResult[] = [];
    const lines = content.split('\n');

    for (const pattern of this.config.secretPatterns || []) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (pattern.pattern.test(line)) {
          // Skip if it's likely a comment or documentation
          if (this.isLikelyFalsePositive(line)) {
            continue;
          }

          results.push(
            fail(`pve.security.secret.${pattern.name.toLowerCase().replace(/\s+/g, '_')}`, `${pattern.name} detected: ${pattern.description || 'Potential secret found'}`, {
              severity: pattern.severity,
              location: { file: filePath, line: lineNum + 1 },
              fix: 'Remove the secret and use environment variables or a secrets manager',
            }),
          );
        }
      }
    }

    // Check for high-entropy strings (potential secrets)
    if (this.config.entropyThreshold) {
      const highEntropyResults = this.findHighEntropyStrings(content, filePath);
      results.push(...highEntropyResults);
    }

    return results;
  }

  private isLikelyFalsePositive(line: string): boolean {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) {
      return true;
    }
    // Skip documentation
    if (trimmed.includes('example') || trimmed.includes('EXAMPLE') || trimmed.includes('placeholder')) {
      return true;
    }
    // Skip test data patterns
    if (trimmed.includes('test') || trimmed.includes('mock') || trimmed.includes('fake')) {
      return true;
    }
    return false;
  }

  private findHighEntropyStrings(content: string, filePath: string): PolicyResult[] {
    const results: PolicyResult[] = [];
    const threshold = this.config.entropyThreshold || 4.5;

    // Find quoted strings that might be secrets
    const stringPattern = /["'`]([A-Za-z0-9+/=_\-]{20,})["'`]/g;
    let match;

    while ((match = stringPattern.exec(content)) !== null) {
      const str = match[1];
      const entropy = this.calculateEntropy(str);

      if (entropy > threshold && !this.isLikelyFalsePositive(match[0])) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNum = beforeMatch.split('\n').length;

        results.push(
          warn('pve.security.high_entropy', `High-entropy string detected (entropy: ${entropy.toFixed(2)})`, {
            location: { file: filePath, line: lineNum },
            fix: 'If this is a secret, move it to environment variables',
            details: { entropy, threshold },
          }),
        );
      }
    }

    return results;
  }

  private calculateEntropy(str: string): number {
    const len = str.length;
    const freq: Record<string, number> = {};

    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private runSASTScan(content: string, filePath: string): PolicyResult[] {
    const results: PolicyResult[] = [];
    const lines = content.split('\n');

    for (const pattern of this.config.sastPatterns || []) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (pattern.pattern.test(line)) {
          results.push(
            fail(`pve.security.sast.${pattern.id}`, `${pattern.name}${pattern.cwe ? ` (${pattern.cwe})` : ''}`, {
              severity: pattern.severity,
              location: { file: filePath, line: lineNum + 1 },
              fix: pattern.fix,
              details: { cwe: pattern.cwe },
            }),
          );
        }
      }
    }

    return results;
  }
}
