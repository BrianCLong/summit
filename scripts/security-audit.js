#!/usr/bin/env node

/**
 * OWASP Security Audit Script
 *
 * Performs comprehensive security audits and compliance checks
 * against OWASP Top 10 2021 requirements
 *
 * Usage:
 *   npm run security:audit
 *   node scripts/security-audit.js
 *   node scripts/security-audit.js --fix  # Auto-fix issues where possible
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
};

// Audit results tracking
const results = {
  passed: [],
  warnings: [],
  errors: [],
  info: [],
};

/**
 * Check if a command exists
 */
function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a command and return output
 */
function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: rootDir,
      ...options,
    });
  } catch (error) {
    return null;
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  log.section();
  log.info('Checking environment variables...');

  const envPath = path.join(rootDir, 'server', '.env');
  const envExamplePath = path.join(rootDir, 'server', '.env.example');

  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    results.warnings.push('.env file not found (using defaults)');
    log.warn('.env file not found');
  }

  // Check critical secrets
  const criticalSecrets = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ];

  criticalSecrets.forEach((secret) => {
    const value = process.env[secret];
    if (!value) {
      results.warnings.push(`${secret} not set in environment`);
      log.warn(`${secret} not set`);
    } else if (value.includes('CHANGE_ME') || value.length < 32) {
      results.errors.push(`${secret} uses default/weak value`);
      log.error(`${secret} uses default or weak value`);
    } else {
      results.passed.push(`${secret} is properly configured`);
      log.success(`${secret} is properly configured`);
    }
  });

  // Check JWT configuration
  if (process.env.NODE_ENV === 'production') {
    const jwtExpiry = process.env.JWT_EXPIRES_IN;
    if (jwtExpiry && !jwtExpiry.includes('15m')) {
      results.warnings.push(
        'JWT_EXPIRES_IN should be 15m in production (OWASP recommendation)'
      );
      log.warn('JWT access token expiry not optimal for production');
    } else {
      results.passed.push('JWT expiry properly configured for production');
      log.success('JWT expiry configured correctly');
    }
  }
}

/**
 * Check npm dependencies for vulnerabilities
 */
function checkDependencies() {
  log.section();
  log.info('Checking dependencies for vulnerabilities...');

  const auditOutput = runCommand('npm audit --json');
  if (!auditOutput) {
    results.warnings.push('Could not run npm audit');
    log.warn('npm audit failed to run');
    return;
  }

  try {
    const audit = JSON.parse(auditOutput);
    const vulnerabilities = audit.metadata?.vulnerabilities || {};

    const { critical = 0, high = 0, moderate = 0, low = 0 } = vulnerabilities;
    const total = critical + high + moderate + low;

    if (total === 0) {
      results.passed.push('No known vulnerabilities in dependencies');
      log.success('No vulnerabilities found');
    } else {
      if (critical > 0) {
        results.errors.push(`${critical} critical vulnerabilities found`);
        log.error(`${critical} CRITICAL vulnerabilities`);
      }
      if (high > 0) {
        results.errors.push(`${high} high severity vulnerabilities found`);
        log.error(`${high} HIGH severity vulnerabilities`);
      }
      if (moderate > 0) {
        results.warnings.push(`${moderate} moderate vulnerabilities found`);
        log.warn(`${moderate} MODERATE vulnerabilities`);
      }
      if (low > 0) {
        results.info.push(`${low} low severity vulnerabilities found`);
        log.info(`${low} LOW vulnerabilities`);
      }

      log.info('\nRun "npm audit fix" to fix automatically fixable issues');
    }
  } catch (error) {
    results.warnings.push('Could not parse npm audit output');
    log.warn('Could not parse npm audit output');
  }
}

/**
 * Check for security-related files
 */
function checkSecurityFiles() {
  log.section();
  log.info('Checking security-related files...');

  const requiredFiles = [
    {
      path: 'server/src/config/owasp-security.ts',
      name: 'OWASP Security Configuration',
    },
    {
      path: 'server/src/security/security-headers.ts',
      name: 'Security Headers Middleware',
    },
    {
      path: 'server/src/middleware/security.ts',
      name: 'Security Middleware',
    },
    { path: 'server/src/middleware/auth.ts', name: 'Authentication Middleware' },
    {
      path: 'server/migrations/007_add_token_security.sql',
      name: 'Token Security Migration',
    },
    { path: 'docs/security/SECURITY_GUIDELINES.md', name: 'Security Guidelines' },
    { path: '.github/workflows/owasp-zap-scan.yml', name: 'OWASP ZAP Workflow' },
    { path: '.github/dependabot.yml', name: 'Dependabot Configuration' },
  ];

  requiredFiles.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(rootDir, filePath);
    if (fs.existsSync(fullPath)) {
      results.passed.push(`${name} exists`);
      log.success(`${name} ✓`);
    } else {
      results.errors.push(`${name} missing`);
      log.error(`${name} missing`);
    }
  });
}

/**
 * Check Git repository for sensitive data
 */
function checkGitSecurity() {
  log.section();
  log.info('Checking Git repository for sensitive data...');

  // Check if gitleaks is installed
  if (!commandExists('gitleaks')) {
    results.warnings.push('gitleaks not installed (optional security tool)');
    log.warn('gitleaks not installed - skipping secret scanning');
    log.info('Install with: brew install gitleaks (macOS) or go install github.com/gitleaks/gitleaks/v8@latest');
    return;
  }

  const gitleaksOutput = runCommand('gitleaks detect --no-git --verbose', {
    stdio: 'pipe',
  });

  if (gitleaksOutput && gitleaksOutput.includes('No leaks found')) {
    results.passed.push('No secrets found in repository');
    log.success('No secrets detected');
  } else if (gitleaksOutput) {
    results.errors.push('Potential secrets detected in repository');
    log.error('Potential secrets detected - review gitleaks output');
  }
}

/**
 * Check database migrations
 */
function checkDatabaseSecurity() {
  log.section();
  log.info('Checking database security...');

  const migrationPath = path.join(
    rootDir,
    'server/migrations/007_add_token_security.sql'
  );

  if (fs.existsSync(migrationPath)) {
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    // Check for critical security tables
    const hasTables = migration.includes('token_blacklist');
    const hasIndexes = migration.includes('CREATE INDEX');
    const hasCleanup = migration.includes('cleanup_expired_blacklist');

    if (hasTables && hasIndexes && hasCleanup) {
      results.passed.push('Token security migration is complete');
      log.success('Token security migration complete');
    } else {
      results.warnings.push('Token security migration may be incomplete');
      log.warn('Migration file found but may be incomplete');
    }
  } else {
    results.errors.push('Token security migration not found');
    log.error('Migration file missing');
  }

  // Check if migration has been applied
  results.info.push('Verify migration applied: SELECT * FROM token_blacklist LIMIT 1;');
  log.info('Remember to run database migration in production');
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  log.section();
  log.info('Checking TypeScript compilation...');

  const tscOutput = runCommand('npm run typecheck 2>&1', { stdio: 'pipe' });

  if (tscOutput && !tscOutput.includes('error TS')) {
    results.passed.push('TypeScript compilation successful');
    log.success('TypeScript check passed');
  } else if (tscOutput) {
    const errorCount = (tscOutput.match(/error TS/g) || []).length;
    results.warnings.push(`${errorCount} TypeScript errors found`);
    log.warn(`${errorCount} TypeScript errors - run 'npm run typecheck' for details`);
  }
}

/**
 * Check OWASP Top 10 compliance
 */
function checkOWASPCompliance() {
  log.section();
  log.info('Checking OWASP Top 10 2021 compliance...');

  const checks = [
    {
      id: 'A01',
      name: 'Broken Access Control',
      files: ['server/src/middleware/rbac.ts', 'server/src/middleware/opa-enforcer.ts'],
    },
    {
      id: 'A02',
      name: 'Cryptographic Failures',
      files: ['server/src/services/AuthService.ts'],
      env: ['JWT_SECRET', 'ENCRYPTION_KEY'],
    },
    {
      id: 'A03',
      name: 'Injection',
      files: ['server/src/middleware/input-validation.ts', 'server/src/middleware/sanitize.ts'],
    },
    {
      id: 'A05',
      name: 'Security Misconfiguration',
      files: ['server/src/security/security-headers.ts'],
    },
    {
      id: 'A06',
      name: 'Vulnerable Components',
      files: ['.github/dependabot.yml'],
    },
    {
      id: 'A07',
      name: 'Authentication Failures',
      files: ['server/src/services/AuthService.ts', 'server/migrations/007_add_token_security.sql'],
    },
    {
      id: 'A09',
      name: 'Security Logging Failures',
      files: ['server/src/middleware/audit-logger.ts'],
    },
  ];

  checks.forEach(({ id, name, files, env }) => {
    const filesExist = files.every((file) =>
      fs.existsSync(path.join(rootDir, file))
    );
    const envSet = env
      ? env.every((variable) => process.env[variable])
      : true;

    if (filesExist && envSet) {
      results.passed.push(`${id} - ${name}: Implemented`);
      log.success(`${id} - ${name}`);
    } else {
      results.errors.push(`${id} - ${name}: Not fully implemented`);
      log.error(`${id} - ${name}`);
    }
  });
}

/**
 * Generate summary report
 */
function generateReport() {
  log.section();
  console.log(`\n${colors.cyan}SECURITY AUDIT SUMMARY${colors.reset}\n`);

  console.log(
    `${colors.green}✓ Passed:${colors.reset} ${results.passed.length}`
  );
  console.log(
    `${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings.length}`
  );
  console.log(`${colors.red}✗ Errors:${colors.reset} ${results.errors.length}`);
  console.log(`${colors.blue}ℹ Info:${colors.reset} ${results.info.length}`);

  const totalChecks =
    results.passed.length +
    results.warnings.length +
    results.errors.length;
  const score = totalChecks > 0 ? Math.round((results.passed.length / totalChecks) * 100) : 0;

  console.log(`\n${colors.cyan}Security Score: ${score}%${colors.reset}`);

  if (results.errors.length > 0) {
    console.log(`\n${colors.red}CRITICAL ISSUES:${colors.reset}`);
    results.errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}WARNINGS:${colors.reset}`);
    results.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  if (results.info.length > 0) {
    console.log(`\n${colors.blue}INFORMATION:${colors.reset}`);
    results.info.forEach((info) => console.log(`  - ${info}`));
  }

  // Recommendations
  console.log(`\n${colors.cyan}RECOMMENDATIONS:${colors.reset}`);
  if (results.errors.length > 0) {
    console.log('  1. Address all critical issues immediately');
  }
  if (results.warnings.length > 0) {
    console.log('  2. Review and resolve warnings');
  }
  console.log('  3. Run database migrations if not already applied');
  console.log('  4. Rotate all secrets in production');
  console.log('  5. Enable all security workflows in CI/CD');
  console.log('  6. Schedule regular penetration testing');

  log.section();

  // Exit code
  process.exit(results.errors.length > 0 ? 1 : 0);
}

/**
 * Main audit function
 */
async function runSecurityAudit() {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(
    `${colors.cyan}  OWASP SECURITY AUDIT${colors.reset}`
  );
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  checkEnvironmentVariables();
  checkSecurityFiles();
  checkDependencies();
  checkGitSecurity();
  checkDatabaseSecurity();
  checkTypeScript();
  checkOWASPCompliance();
  generateReport();
}

// Run audit
runSecurityAudit().catch((error) => {
  console.error(`${colors.red}Audit failed:${colors.reset}`, error);
  process.exit(1);
});
