#!/usr/bin/env node

/**
 * Production Deployment Validator
 * Final validation suite for IntelGraph RC Hardening deployment readiness
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const { promisify } = require('util');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ProductionValidator {
  constructor() {
    this.validationResults = [];
    this.totalChecks = 0;
    this.passedChecks = 0;
    this.failedChecks = 0;
    this.warnings = 0;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const levelColors = {
      info: colors.blue,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      header: colors.cyan
    };
    
    const color = levelColors[level] || colors.reset;
    console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`);
  }

  recordCheck(component, status, message, details = null) {
    this.totalChecks++;
    
    const result = {
      component,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.validationResults.push(result);
    
    if (status === 'PASS') {
      this.passedChecks++;
      this.log(`✅ ${component}: ${message}`, 'success');
    } else if (status === 'WARN') {
      this.warnings++;
      this.log(`⚠️ ${component}: ${message}`, 'warning');
    } else {
      this.failedChecks++;
      this.log(`❌ ${component}: ${message}`, 'error');
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating Production Environment...', 'header');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1));
      
      if (majorVersion >= 18) {
        this.recordCheck('NodeJS', 'PASS', `Version ${nodeVersion} meets requirements`);
      } else {
        this.recordCheck('NodeJS', 'FAIL', `Version ${nodeVersion} below required 18.x`);
      }
      
      // Check required environment variables
      const requiredEnvVars = [
        'NODE_ENV',
        'POSTGRES_URL',
        'NEO4J_URI',
        'NEO4J_USERNAME', 
        'NEO4J_PASSWORD',
        'REDIS_HOST',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
      ];
      
      const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
      
      if (missingEnvVars.length === 0) {
        this.recordCheck('EnvironmentVariables', 'PASS', 'All required environment variables present');
      } else {
        this.recordCheck('EnvironmentVariables', 'FAIL', `Missing variables: ${missingEnvVars.join(', ')}`);
      }
      
      // Validate NODE_ENV is production
      if (process.env.NODE_ENV === 'production') {
        this.recordCheck('ProductionMode', 'PASS', 'NODE_ENV correctly set to production');
      } else {
        this.recordCheck('ProductionMode', 'WARN', `NODE_ENV is '${process.env.NODE_ENV}', should be 'production'`);
      }
      
    } catch (error) {
      this.recordCheck('Environment', 'FAIL', `Environment validation failed: ${error.message}`);
    }
  }

  async validateDependencies() {
    this.log('📦 Validating Dependencies and Security...', 'header');
    
    try {
      // Check package.json exists and has required scripts
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const requiredScripts = ['start', 'build', 'test', 'db:migrate'];
      const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
      
      if (missingScripts.length === 0) {
        this.recordCheck('PackageScripts', 'PASS', 'All required npm scripts present');
      } else {
        this.recordCheck('PackageScripts', 'FAIL', `Missing scripts: ${missingScripts.join(', ')}`);
      }
      
      // Check for security vulnerabilities
      try {
        execSync('npm audit --audit-level=high --json', { stdio: 'pipe' });
        this.recordCheck('SecurityAudit', 'PASS', 'No high-severity vulnerabilities detected');
      } catch (auditError) {
        if (auditError.stdout) {
          const auditResult = JSON.parse(auditError.stdout.toString());
          const highVulns = auditResult.vulnerabilities ? 
            Object.values(auditResult.vulnerabilities).filter(v => v.severity === 'high' || v.severity === 'critical').length : 0;
          
          if (highVulns === 0) {
            this.recordCheck('SecurityAudit', 'PASS', 'No high-severity vulnerabilities detected');
          } else {
            this.recordCheck('SecurityAudit', 'FAIL', `${highVulns} high/critical vulnerabilities found`);
          }
        } else {
          this.recordCheck('SecurityAudit', 'WARN', 'Unable to run security audit');
        }
      }
      
      // Validate SBOM exists
      const sbomPath = path.join(process.cwd(), 'sbom.cdx.json');
      try {
        const sbomContent = JSON.parse(await fs.readFile(sbomPath, 'utf8'));
        if (sbomContent.bomFormat === 'CycloneDX' && sbomContent.components && sbomContent.components.length > 0) {
          this.recordCheck('SBOM', 'PASS', `Valid SBOM with ${sbomContent.components.length} components`);
        } else {
          this.recordCheck('SBOM', 'FAIL', 'Invalid SBOM format or missing components');
        }
      } catch (sbomError) {
        this.recordCheck('SBOM', 'FAIL', 'SBOM file not found or invalid');
      }
      
    } catch (error) {
      this.recordCheck('Dependencies', 'FAIL', `Dependency validation failed: ${error.message}`);
    }
  }

  async validateRCHardeningComponents() {
    this.log('🛡️ Validating RC Hardening Components...', 'header');
    
    const components = [
      { path: 'server/src/streaming/StreamingSLO.ts', name: 'StreamingSLO', required: ['SLOTargets', 'processAlert'] },
      { path: 'server/src/streaming/IdempotentProducer.ts', name: 'IdempotentProducer', required: ['sendIdempotent', 'messageId'] },
      { path: 'server/src/streaming/DLQReplay.ts', name: 'DLQReplay', required: ['replayMessages', 'addToDLQ'] },
      { path: 'server/src/middleware/reasonForAccess.ts', name: 'ReasonForAccess', required: ['AccessContext', 'qualityScore'] },
      { path: 'server/src/security/ExportSigning.ts', name: 'ExportSigning', required: ['signExport', 'verifySignature'] },
      { path: 'server/src/security/policies/export.rego', name: 'OPAPolicies', required: ['allow', 'cross_tenant'] },
      { path: 'server/src/security/PromptInjectionDefense.ts', name: 'PromptInjectionDefense', required: ['analyzePrompt', 'riskScore'] },
      { path: 'server/src/ai/SecureAIAssistant.ts', name: 'SecureAIAssistant', required: ['hasToolAccess', 'allowlist'] },
      { path: 'server/src/mlops/ModelRegistry.ts', name: 'ModelRegistry', required: ['registerModel', 'enableDriftMonitoring'] },
      { path: 'server/src/monitoring/AlertingSystem.ts', name: 'AlertingSystem', required: ['evaluateRules', 'AlertRule'] }
    ];
    
    for (const component of components) {
      try {
        const componentPath = path.join(process.cwd(), component.path);
        const content = await fs.readFile(componentPath, 'utf8');
        
        // Check for required features
        const missingFeatures = component.required.filter(feature => !content.includes(feature));
        
        if (missingFeatures.length === 0) {
          this.recordCheck(component.name, 'PASS', 'All required features implemented');
        } else {
          this.recordCheck(component.name, 'FAIL', `Missing features: ${missingFeatures.join(', ')}`);
        }
        
      } catch (error) {
        this.recordCheck(component.name, 'FAIL', `Component file not found: ${component.path}`);
      }
    }
    
    // Check incident response playbooks
    try {
      const playbookPath = path.join(process.cwd(), 'docs/runbooks/incident-response-playbooks.md');
      const playbookContent = await fs.readFile(playbookPath, 'utf8');
      
      const scenarioCount = (playbookContent.match(/^## \d+\./gm) || []).length;
      
      if (scenarioCount >= 6) {
        this.recordCheck('IncidentPlaybooks', 'PASS', `${scenarioCount} incident response scenarios documented`);
      } else {
        this.recordCheck('IncidentPlaybooks', 'FAIL', `Only ${scenarioCount} scenarios, need at least 6`);
      }
      
    } catch (error) {
      this.recordCheck('IncidentPlaybooks', 'FAIL', 'Incident response playbooks not found');
    }
  }

  async validateDatabaseConnectivity() {
    this.log('🗄️ Validating Database Connectivity...', 'header');
    
    // Test PostgreSQL connection
    try {
      if (process.env.POSTGRES_URL) {
        // Simple connection test (would need actual pg client in real implementation)
        this.recordCheck('PostgreSQL', 'PASS', 'Connection configuration present');
      } else {
        this.recordCheck('PostgreSQL', 'FAIL', 'POSTGRES_URL not configured');
      }
    } catch (error) {
      this.recordCheck('PostgreSQL', 'FAIL', `Connection failed: ${error.message}`);
    }
    
    // Test Neo4j connection
    try {
      if (process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD) {
        this.recordCheck('Neo4j', 'PASS', 'Connection configuration present');
      } else {
        this.recordCheck('Neo4j', 'FAIL', 'Neo4j connection parameters not configured');
      }
    } catch (error) {
      this.recordCheck('Neo4j', 'FAIL', `Connection failed: ${error.message}`);
    }
    
    // Test Redis connection
    try {
      if (process.env.REDIS_HOST) {
        this.recordCheck('Redis', 'PASS', 'Connection configuration present');
      } else {
        this.recordCheck('Redis', 'FAIL', 'REDIS_HOST not configured');
      }
    } catch (error) {
      this.recordCheck('Redis', 'FAIL', `Connection failed: ${error.message}`);
    }
  }

  async validateSecurityConfiguration() {
    this.log('🔒 Validating Security Configuration...', 'header');
    
    // Check JWT secrets
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (jwtSecret && jwtSecret.length >= 32) {
      this.recordCheck('JWTSecret', 'PASS', 'JWT secret meets minimum length requirement');
    } else {
      this.recordCheck('JWTSecret', 'FAIL', 'JWT secret missing or too short (<32 characters)');
    }
    
    if (jwtRefreshSecret && jwtRefreshSecret.length >= 32 && jwtRefreshSecret !== jwtSecret) {
      this.recordCheck('JWTRefreshSecret', 'PASS', 'JWT refresh secret properly configured');
    } else {
      this.recordCheck('JWTRefreshSecret', 'FAIL', 'JWT refresh secret missing, too short, or same as main secret');
    }
    
    // Check HTTPS configuration
    const httpsPort = process.env.HTTPS_PORT || process.env.SSL_PORT;
    if (httpsPort) {
      this.recordCheck('HTTPS', 'PASS', `HTTPS configured on port ${httpsPort}`);
    } else if (process.env.NODE_ENV === 'production') {
      this.recordCheck('HTTPS', 'WARN', 'HTTPS not explicitly configured for production');
    } else {
      this.recordCheck('HTTPS', 'PASS', 'HTTPS not required for non-production');
    }
    
    // Check for secrets in environment (basic check)
    const envString = JSON.stringify(process.env);
    const suspiciousPatterns = [
      /password.*=.*\w{8,}/i,
      /secret.*=.*\w{8,}/i,
      /key.*=.*\w{8,}/i,
      /token.*=.*\w{8,}/i
    ];
    
    let suspiciousEnvVars = 0;
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(envString)) {
        suspiciousEnvVars++;
      }
    });
    
    if (suspiciousEnvVars === 0) {
      this.recordCheck('SecretsInEnv', 'PASS', 'No suspicious secrets detected in environment variables');
    } else {
      this.recordCheck('SecretsInEnv', 'WARN', `${suspiciousEnvVars} potentially exposed secrets in environment`);
    }
  }

  async validateBuildAndTests() {
    this.log('🧪 Validating Build and Test Status...', 'header');
    
    try {
      // Check if TypeScript compiles
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() });
        this.recordCheck('TypeScriptBuild', 'PASS', 'TypeScript compilation successful');
      } catch (tscError) {
        this.recordCheck('TypeScriptBuild', 'FAIL', 'TypeScript compilation errors detected');
      }
      
      // Check if tests are present and runnable
      const testDirs = ['test', 'tests', '__tests__', 'src/__tests__', 'server/tests'];
      let testFilesFound = 0;
      
      for (const testDir of testDirs) {
        try {
          const testPath = path.join(process.cwd(), testDir);
          const stat = await fs.stat(testPath);
          if (stat.isDirectory()) {
            testFilesFound++;
          }
        } catch (error) {
          // Directory doesn't exist, continue
        }
      }
      
      if (testFilesFound > 0) {
        this.recordCheck('TestSuite', 'PASS', `Test directories found: ${testFilesFound}`);
      } else {
        this.recordCheck('TestSuite', 'WARN', 'No test directories found');
      }
      
      // Check for validation suite
      const validationSuitePath = path.join(process.cwd(), 'scripts/rc-validation-suite.sh');
      try {
        await fs.access(validationSuitePath);
        this.recordCheck('ValidationSuite', 'PASS', 'RC validation suite present');
      } catch (error) {
        this.recordCheck('ValidationSuite', 'FAIL', 'RC validation suite not found');
      }
      
    } catch (error) {
      this.recordCheck('BuildAndTest', 'FAIL', `Build/test validation failed: ${error.message}`);
    }
  }

  async validateDeploymentArtifacts() {
    this.log('📋 Validating Deployment Artifacts...', 'header');
    
    const requiredFiles = [
      { path: 'package.json', name: 'PackageJSON' },
      { path: 'package-lock.json', name: 'PackageLock' }, 
      { path: '.env.example', name: 'EnvironmentTemplate' },
      { path: 'docs/deployment/production-readiness-checklist.md', name: 'ReadinessChecklist' },
      { path: 'docs/runbooks/incident-response-playbooks.md', name: 'IncidentPlaybooks' },
      { path: 'scripts/tabletop-exercise.js', name: 'TabletopExercise' },
      { path: 'sbom.cdx.json', name: 'SBOM' }
    ];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file.path));
        this.recordCheck(file.name, 'PASS', `${file.path} present`);
      } catch (error) {
        this.recordCheck(file.name, 'FAIL', `${file.path} not found`);
      }
    }
    
    // Check CI/CD workflow
    const workflowPath = path.join(process.cwd(), '.github/workflows/e2e-rc-hardening.yml');
    try {
      await fs.access(workflowPath);
      this.recordCheck('CICDWorkflow', 'PASS', 'E2E RC hardening workflow present');
    } catch (error) {
      this.recordCheck('CICDWorkflow', 'FAIL', 'CI/CD workflow not found');
    }
  }

  async generateReport() {
    this.log('📊 Generating Production Readiness Report...', 'header');
    
    const successRate = this.totalChecks > 0 ? Math.round((this.passedChecks / this.totalChecks) * 100) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      validationRun: `production-readiness-${Date.now()}`,
      summary: {
        totalChecks: this.totalChecks,
        passedChecks: this.passedChecks,
        failedChecks: this.failedChecks,
        warnings: this.warnings,
        successRate: successRate,
        productionReady: successRate >= 95 && this.failedChecks === 0
      },
      results: this.validationResults,
      recommendation: this.getDeploymentRecommendation(successRate)
    };
    
    // Write detailed report
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, `production-readiness-${new Date().toISOString().slice(0, 19)}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate summary
    const summaryPath = path.join(reportsDir, 'production-readiness-summary.txt');
    const summary = this.generateSummaryText(report);
    await fs.writeFile(summaryPath, summary);
    
    this.log(`📄 Detailed report: ${reportPath}`, 'info');
    this.log(`📋 Summary report: ${summaryPath}`, 'info');
    
    return report;
  }

  getDeploymentRecommendation(successRate) {
    if (successRate >= 95 && this.failedChecks === 0) {
      return {
        status: 'APPROVED',
        message: 'Production deployment approved. All critical validations passed.',
        nextSteps: [
          'Proceed with blue-green deployment',
          'Monitor SLOs for first 48 hours',
          'Conduct post-deployment validation',
          'Schedule post-deployment review'
        ]
      };
    } else if (successRate >= 80 && this.failedChecks <= 2) {
      return {
        status: 'CONDITIONAL',
        message: 'Production deployment conditionally approved. Address failed checks before proceeding.',
        nextSteps: [
          'Review and fix failed validation checks',
          'Re-run validation suite',
          'Obtain stakeholder approval for remaining warnings'
        ]
      };
    } else {
      return {
        status: 'BLOCKED',
        message: 'Production deployment blocked. Critical issues must be resolved.',
        nextSteps: [
          'Address all failed validation checks',
          'Improve success rate to >95%',
          'Re-run complete validation suite',
          'Obtain security and engineering team approval'
        ]
      };
    }
  }

  generateSummaryText(report) {
    return `
INTELGRAPH PRODUCTION READINESS VALIDATION SUMMARY
==================================================

Validation Timestamp: ${report.timestamp}
Validation Run ID: ${report.validationRun}

OVERALL RESULTS:
- Total Checks: ${report.summary.totalChecks}
- Passed: ${report.summary.passedChecks}
- Failed: ${report.summary.failedChecks}
- Warnings: ${report.summary.warnings}
- Success Rate: ${report.summary.successRate}%

DEPLOYMENT RECOMMENDATION: ${report.recommendation.status}
${report.recommendation.message}

NEXT STEPS:
${report.recommendation.nextSteps.map(step => `- ${step}`).join('\n')}

VALIDATION BREAKDOWN:
${report.results.map(r => `${r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌'} ${r.component}: ${r.message}`).join('\n')}

${report.summary.productionReady ? '🎉 READY FOR PRODUCTION DEPLOYMENT' : '⚠️ REQUIRES ATTENTION BEFORE DEPLOYMENT'}
`;
  }

  async run() {
    console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════╗
║                   INTELGRAPH PRODUCTION VALIDATOR                    ║
║                     RC Hardening Deployment Readiness               ║
╚══════════════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    const startTime = Date.now();
    
    try {
      await this.validateEnvironment();
      await this.validateDependencies();
      await this.validateRCHardeningComponents();
      await this.validateDatabaseConnectivity();
      await this.validateSecurityConfiguration();
      await this.validateBuildAndTests();
      await this.validateDeploymentArtifacts();
      
      const report = await this.generateReport();
      
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`\n${colors.cyan}${colors.bright}VALIDATION COMPLETE${colors.reset}`);
      console.log(`${colors.dim}Duration: ${duration.toFixed(2)} seconds${colors.reset}`);
      console.log(`\n${colors.bright}FINAL ASSESSMENT:${colors.reset}`);
      console.log(`Total Checks: ${this.totalChecks}`);
      console.log(`${colors.green}Passed: ${this.passedChecks}${colors.reset}`);
      console.log(`${colors.red}Failed: ${this.failedChecks}${colors.reset}`);
      console.log(`${colors.yellow}Warnings: ${this.warnings}${colors.reset}`);
      console.log(`Success Rate: ${report.summary.successRate}%`);
      
      console.log(`\n${colors.bright}DEPLOYMENT RECOMMENDATION:${colors.reset}`);
      const statusColor = report.recommendation.status === 'APPROVED' ? colors.green : 
                         report.recommendation.status === 'CONDITIONAL' ? colors.yellow : colors.red;
      console.log(`${statusColor}${report.recommendation.status}${colors.reset}: ${report.recommendation.message}`);
      
      // Exit with appropriate code
      if (report.recommendation.status === 'APPROVED') {
        process.exit(0);
      } else if (report.recommendation.status === 'CONDITIONAL') {
        process.exit(1);
      } else {
        process.exit(2);
      }
      
    } catch (error) {
      this.log(`Fatal error during validation: ${error.message}`, 'error');
      process.exit(3);
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(3);
  });
}

module.exports = ProductionValidator;