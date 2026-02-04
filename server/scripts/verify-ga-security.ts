#!/usr/bin/env node
/**
 * GA Security Verification Suite
 *
 * Verifies that the security baseline contract defined in docs/ga/SECURITY_BASELINE.md
 * is properly enforced in the codebase.
 *
 * Usage: pnpm verify
 *        node --loader tsx server/scripts/verify-ga-security.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

class SecurityVerifier {
  private results: VerificationResult[] = [];
  private serverRoot: string;

  constructor() {
    // Handle both CJS and ESM environments
    const currentDir = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
    this.serverRoot = path.resolve(currentDir, '..');
  }

  /**
   * Read file contents safely
   */
  private readFile(filePath: string): string | null {
    try {
      const fullPath = path.join(this.serverRoot, filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Find files matching a pattern
   */
  private findFiles(dir: string, pattern: RegExp, results: string[] = []): string[] {
    const fullDir = path.join(this.serverRoot, dir);
    if (!fs.existsSync(fullDir)) {
      return results;
    }

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        this.findFiles(fullPath, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Check if a file contains a pattern
   */
  private fileContains(filePath: string, pattern: string | RegExp): boolean {
    const content = this.readFile(filePath);
    if (!content) return false;

    if (typeof pattern === 'string') {
      return content.includes(pattern);
    }
    return pattern.test(content);
  }

  /**
   * Add a verification result
   */
  private addResult(name: string, passed: boolean, message: string, details?: string[]) {
    this.results.push({ name, passed, message, details });
  }

  /**
   * Verification 1: Auth middleware coverage on critical routes
   */
  private verifyAuthCoverage() {
    const routeFiles = this.findFiles('src/routes', /\.(ts|js)$/);
    const criticalRoutes = [
      'src/routes/admin.ts',
      'src/routes/admin/identity.ts',
      'src/routes/admin/users.ts',
      'src/routes/admin/roles.ts',
      'src/conductor/api/conductor-routes.ts',
      'src/conductor/api/operations-routes.ts',
      'src/routes/ingestion.ts',
      'src/routes/evidence.ts',
    ];

    const missingAuth: string[] = [];
    const publicRoutes = ['src/routes/public.ts', 'src/routes/authRoutes.ts'];

    for (const route of criticalRoutes) {
      const content = this.readFile(route);
      if (!content) continue;

      // Check for authentication middleware
      const hasAuth =
        content.includes('ensureAuthenticated') ||
        content.includes('authenticateUser') ||
        content.includes('requirePermission') ||
        content.includes('authorize(') ||
        content.includes('.use(ensureAuthenticated') ||
        content.includes('.use(authenticateUser');

      if (!hasAuth && !publicRoutes.includes(route)) {
        missingAuth.push(route);
      }
    }

    if (missingAuth.length === 0) {
      this.addResult(
        'Auth Coverage',
        true,
        'All critical routes have authentication middleware'
      );
    } else {
      this.addResult(
        'Auth Coverage',
        false,
        'Some critical routes missing authentication middleware',
        missingAuth
      );
    }
  }

  /**
   * Verification 2: Tenant isolation middleware present
   */
  private verifyTenantIsolation() {
    const appFile = this.readFile('src/app.ts');
    if (!appFile) {
      this.addResult('Tenant Isolation', false, 'Cannot read src/app.ts');
      return;
    }

    const hasTenantMiddleware =
      appFile.includes('tenantContextMiddleware') ||
      appFile.includes('TenantIsolationGuard');

    const hasResidencyEnforcement =
      appFile.includes('residency') ||
      appFile.includes('Residency');

    if (hasTenantMiddleware && hasResidencyEnforcement) {
      this.addResult(
        'Tenant Isolation',
        true,
        'Tenant context and residency enforcement middleware are present'
      );
    } else {
      const missing = [];
      if (!hasTenantMiddleware) missing.push('tenant context middleware');
      if (!hasResidencyEnforcement) missing.push('residency enforcement');

      this.addResult(
        'Tenant Isolation',
        false,
        'Missing tenant isolation components',
        missing
      );
    }
  }

  /**
   * Verification 3: Admin routes have authorization
   */
  private verifyAdminAuthorization() {
    const adminRoutes = [
      'src/routes/admin.ts',
      'src/routes/admin/identity.ts',
      'src/routes/admin/users.ts',
      'src/routes/admin/roles.ts',
    ];

    const missingAuthz: string[] = [];

    for (const route of adminRoutes) {
      const content = this.readFile(route);
      if (!content) continue;

      const hasAuthz =
        content.includes('authorize(') ||
        content.includes('requirePermission(') ||
        content.includes('ensureRole(') ||
        content.includes('assertCan(');

      if (!hasAuthz) {
        missingAuthz.push(route);
      }
    }

    if (missingAuthz.length === 0) {
      this.addResult(
        'Admin Authorization',
        true,
        'All admin routes have authorization checks'
      );
    } else {
      this.addResult(
        'Admin Authorization',
        false,
        'Some admin routes missing authorization checks',
        missingAuthz
      );
    }
  }

  /**
   * Verification 4: Rate limiting on public and sensitive endpoints
   */
  private verifyRateLimiting() {
    const appFile = this.readFile('src/app.ts');
    if (!appFile) {
      this.addResult('Rate Limiting', false, 'Cannot read src/app.ts');
      return;
    }

    // Check for imports (support both .ts and .js extensions)
    const importsPublicRateLimit =
      appFile.includes('publicRateLimit') &&
      (appFile.includes("from './middleware/rateLimiter.js'") ||
       appFile.includes("from './middleware/rateLimiter.ts'"));

    const importsAuthRateLimit =
      appFile.includes('authenticatedRateLimit') &&
      (appFile.includes("from './middleware/rateLimiter.js'") ||
       appFile.includes("from './middleware/rateLimiter.ts'"));

    // Check for usage
    const usesPublicRateLimit =
      /app\.use\(publicRateLimit\)/.test(appFile);

    const usesAuthRateLimit =
      /app\.use\(\[['"]\/api['"],\s*['"]\/graphql['"]\],\s*authenticatedRateLimit\)/.test(appFile) ||
      appFile.includes('authenticatedRateLimit');

    const hasTieredLimits =
      appFile.includes('TieredRateLimitMiddleware') ||
      appFile.includes('TenantIsolationGuard');

    const rateLimiterFile = this.readFile('src/middleware/rateLimiter.ts');
    const hasRateLimiterConfig = rateLimiterFile !== null;

    const allChecks = importsPublicRateLimit && importsAuthRateLimit &&
                     usesPublicRateLimit && usesAuthRateLimit &&
                     hasTieredLimits && hasRateLimiterConfig;

    if (allChecks) {
      this.addResult(
        'Rate Limiting',
        true,
        'Rate limiting is configured for public, authenticated, and tenant-based access'
      );
    } else {
      const missing = [];
      if (!importsPublicRateLimit) missing.push('publicRateLimit import');
      if (!importsAuthRateLimit) missing.push('authenticatedRateLimit import');
      if (!usesPublicRateLimit) missing.push('publicRateLimit usage in app.use()');
      if (!usesAuthRateLimit) missing.push('authenticatedRateLimit usage for /api & /graphql');
      if (!hasTieredLimits) missing.push('tiered/tenant rate limiting');
      if (!hasRateLimiterConfig) missing.push('rate limiter configuration file');

      this.addResult(
        'Rate Limiting',
        false,
        'Rate limiting configuration incomplete',
        missing
      );
    }
  }

  /**
   * Verification 5: Input validation and sanitization
   */
  private verifyInputValidation() {
    const appFile = this.readFile('src/app.ts');
    if (!appFile) {
      this.addResult('Input Validation', false, 'Cannot read src/app.ts');
      return;
    }

    const hasSanitization =
      appFile.includes('sanitizeInput') ||
      appFile.includes('mongo-sanitize');

    const hasPiiGuard =
      appFile.includes('piiGuardMiddleware') ||
      appFile.includes('pii-guard');

    const validatorFile = this.readFile('src/middleware/request-schema-validator.ts');
    const hasSchemaValidation = validatorFile !== null && (
      validatorFile.includes('zod') || validatorFile.includes('joi')
    );

    if (hasSanitization && hasPiiGuard && hasSchemaValidation) {
      this.addResult(
        'Input Validation',
        true,
        'Input sanitization, PII guard, and schema validation are configured'
      );
    } else {
      const missing = [];
      if (!hasSanitization) missing.push('input sanitization (mongo-sanitize)');
      if (!hasPiiGuard) missing.push('PII guard middleware');
      if (!hasSchemaValidation) missing.push('schema validation (Zod/Joi)');

      this.addResult(
        'Input Validation',
        false,
        'Input validation stack incomplete',
        missing
      );
    }
  }

  /**
   * Verification 6: Logging redaction configured
   */
  private verifyLoggingRedaction() {
    const loggingFile = this.readFile('src/middleware/logging.ts');
    if (!loggingFile) {
      this.addResult('Logging Redaction', false, 'Cannot read src/middleware/logging.ts');
      return;
    }

    const redactsAuth =
      loggingFile.includes('req.headers.authorization') ||
      loggingFile.includes('authorization');

    const redactsCookie =
      loggingFile.includes('req.headers.cookie') ||
      loggingFile.includes('cookie');

    const hasCorrelationId =
      loggingFile.includes('correlationId');

    if (redactsAuth && redactsCookie && hasCorrelationId) {
      this.addResult(
        'Logging Redaction',
        true,
        'Logging redacts sensitive headers and includes correlation tracking'
      );
    } else {
      const missing = [];
      if (!redactsAuth) missing.push('authorization header redaction');
      if (!redactsCookie) missing.push('cookie header redaction');
      if (!hasCorrelationId) missing.push('correlation ID tracking');

      this.addResult(
        'Logging Redaction',
        false,
        'Logging configuration incomplete',
        missing
      );
    }
  }

  /**
   * Verification 7: Security headers configured
   */
  private verifySecurityHeaders() {
    // Check the actual security headers file being used in app.ts
    const headersFile = this.readFile('src/middleware/securityHeaders.ts');
    if (!headersFile) {
      this.addResult('Security Headers', false, 'Cannot read src/middleware/securityHeaders.ts');
      return;
    }

    // Helmet properties (camelCase) that correspond to security headers
    const requiredHelmetConfigs = [
      'contentSecurityPolicy',  // Content-Security-Policy
      'hsts',                    // Strict-Transport-Security
      'frameguard',              // X-Frame-Options
      'noSniff',                 // X-Content-Type-Options (implied by helmet.noSniff)
      'referrerPolicy',          // Referrer-Policy
    ];

    const missing = requiredHelmetConfigs.filter(config => !headersFile.includes(config));

    // Also verify it uses helmet
    const usesHelmet = headersFile.includes('helmet');

    if (missing.length === 0 && usesHelmet) {
      this.addResult(
        'Security Headers',
        true,
        'All required security headers are configured via Helmet'
      );
    } else {
      const missingDetails = [];
      if (!usesHelmet) missingDetails.push('helmet middleware');
      missingDetails.push(...missing.map(config => `${config} configuration`));

      this.addResult(
        'Security Headers',
        false,
        'Some security headers configuration is missing',
        missingDetails
      );
    }
  }

  /**
   * Verification 8: CORS configured for production
   */
  private verifyCORS() {
    const corsFile = this.readFile('src/config/cors-options.ts');
    if (!corsFile) {
      this.addResult('CORS Configuration', false, 'Cannot read src/config/cors-options.ts');
      return;
    }

    const hasCorsOriginCheck =
      corsFile.includes('CORS_ORIGIN') ||
      corsFile.includes('origin');

    const hasCredentials =
      corsFile.includes('credentials: true');

    const hasProductionCheck =
      corsFile.includes('NODE_ENV') &&
      corsFile.includes('production');

    if (hasCorsOriginCheck && hasCredentials && hasProductionCheck) {
      this.addResult(
        'CORS Configuration',
        true,
        'CORS is configured with origin whitelist and credentials support'
      );
    } else {
      const missing = [];
      if (!hasCorsOriginCheck) missing.push('origin validation');
      if (!hasCredentials) missing.push('credentials support');
      if (!hasProductionCheck) missing.push('production environment check');

      this.addResult(
        'CORS Configuration',
        false,
        'CORS configuration incomplete',
        missing
      );
    }
  }

  /**
   * Verification 9: GraphQL security (shield, complexity, introspection)
   */
  private verifyGraphQLSecurity() {
    const graphqlFile = this.readFile('src/graphql/apollo-v5-server.ts');
    if (!graphqlFile) {
      this.addResult('GraphQL Security', false, 'Cannot read src/graphql/apollo-v5-server.ts');
      return;
    }

    const hasShield =
      graphqlFile.includes('graphql-shield') ||
      graphqlFile.includes('shield');

    const hasComplexity =
      graphqlFile.includes('complexity') ||
      graphqlFile.includes('queryComplexity');

    const hasIntrospectionControl =
      graphqlFile.includes('introspection');

    if (hasShield && hasComplexity && hasIntrospectionControl) {
      this.addResult(
        'GraphQL Security',
        true,
        'GraphQL has shield rules, complexity limits, and introspection control'
      );
    } else {
      const missing = [];
      if (!hasShield) missing.push('graphql-shield or equivalent');
      if (!hasComplexity) missing.push('query complexity limiting');
      if (!hasIntrospectionControl) missing.push('introspection control');

      this.addResult(
        'GraphQL Security',
        false,
        'GraphQL security configuration incomplete',
        missing
      );
    }
  }

  /**
   * Verification 10: Production secret validation
   */
  private verifyProductionSecrets() {
    const configFile = this.readFile('src/config.ts') || this.readFile('src/config/index.ts');
    if (!configFile) {
      this.addResult('Production Secrets', false, 'Cannot read config file');
      return;
    }

    const hasSecretValidation =
      configFile.includes('JWT_SECRET') &&
      configFile.includes('min(32)') ||
      configFile.includes('length') &&
      configFile.includes('32');

    const hasTestSecretBlock =
      configFile.includes('devpassword') ||
      configFile.includes('changeme') ||
      configFile.includes('insecure');

    if (hasSecretValidation && hasTestSecretBlock) {
      this.addResult(
        'Production Secrets',
        true,
        'Production secret validation and test secret blocking are configured'
      );
    } else {
      const missing = [];
      if (!hasSecretValidation) missing.push('JWT secret length validation (min 32 chars)');
      if (!hasTestSecretBlock) missing.push('test secret blocking in production');

      this.addResult(
        'Production Secrets',
        false,
        'Production secret validation incomplete',
        missing
      );
    }
  }

  /**
   * Verification 11: Audit logging configured
   */
  private verifyAuditLogging() {
    const appFile = this.readFile('src/app.ts');
    if (!appFile) {
      this.addResult('Audit Logging', false, 'Cannot read src/app.ts');
      return;
    }

    const hasAuditMiddleware =
      appFile.includes('auditLogger') ||
      appFile.includes('audit-first');

    const authFile = this.readFile('src/middleware/auth.ts');
    const hasPermissionAudit = authFile &&
      authFile.includes('audit') &&
      authFile.includes('policy');

    if (hasAuditMiddleware && hasPermissionAudit) {
      this.addResult(
        'Audit Logging',
        true,
        'Audit logging is configured for requests and permission checks'
      );
    } else {
      const missing = [];
      if (!hasAuditMiddleware) missing.push('audit middleware in app.ts');
      if (!hasPermissionAudit) missing.push('permission check audit logging');

      this.addResult(
        'Audit Logging',
        false,
        'Audit logging configuration incomplete',
        missing
      );
    }
  }

  /**
   * Verification 12: Step-up auth for sensitive operations
   */
  private verifyStepUpAuth() {
    const stepupFile = this.readFile('middleware/stepup.ts') ||
                       this.readFile('src/middleware/stepup.ts');

    if (!stepupFile) {
      this.addResult(
        'Step-Up Auth',
        false,
        'Step-up authentication middleware not found',
        ['Expected middleware/stepup.ts or src/middleware/stepup.ts']
      );
      return;
    }

    const hasStepUpFunction =
      stepupFile.includes('requireStepUp') ||
      stepupFile.includes('x-mfa-level');

    if (hasStepUpFunction) {
      this.addResult(
        'Step-Up Auth',
        true,
        'Step-up authentication middleware is configured'
      );
    } else {
      this.addResult(
        'Step-Up Auth',
        false,
        'Step-up authentication not properly configured',
        ['Missing requireStepUp or x-mfa-level validation']
      );
    }
  }

  /**
   * Run all verifications
   */
  async verify(): Promise<boolean> {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║     GA Security Baseline Verification Suite          ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Run all verifications
    this.verifyAuthCoverage();
    this.verifyTenantIsolation();
    this.verifyAdminAuthorization();
    this.verifyRateLimiting();
    this.verifyInputValidation();
    this.verifyLoggingRedaction();
    this.verifySecurityHeaders();
    this.verifyCORS();
    this.verifyGraphQLSecurity();
    this.verifyProductionSecrets();
    this.verifyAuditLogging();
    this.verifyStepUpAuth();

    // Print results
    let allPassed = true;
    for (const result of this.results) {
      const icon = result.passed ? '✓' : '✗';
      const color = result.passed ? colors.green : colors.red;

      console.log(`${color}${icon} ${result.name}${colors.reset}`);
      console.log(`  ${result.message}`);

      if (result.details && result.details.length > 0) {
        for (const detail of result.details) {
          console.log(`    ${colors.yellow}→ ${detail}${colors.reset}`);
        }
      }
      console.log('');

      if (!result.passed) {
        allPassed = false;
      }
    }

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}Summary: ${passed}/${total} checks passed (${percentage}%)${colors.reset}`);

    if (allPassed) {
      console.log(`${colors.green}✓ All security baseline checks passed!${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✗ Some security baseline checks failed.${colors.reset}\n`);
      console.log(`${colors.yellow}Please review the failures above and ensure all security`);
      console.log(`invariants defined in docs/ga/SECURITY_BASELINE.md are enforced.${colors.reset}\n`);
    }

    return allPassed;
  }
}

// Main execution
async function main() {
  const verifier = new SecurityVerifier();
  const passed = await verifier.verify();
  process.exit(passed ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Error running verification:${colors.reset}`, error);
    process.exit(1);
  });
}

export { SecurityVerifier };
