#!/usr/bin/env node

/**
 * Security audit script for Summit application
 * Performs comprehensive security checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security audit configuration
const config = {
  // Directories to scan for security issues
  scanPaths: [
    './src',
    './server',
    './client',
    './packages',
    './libs'
  ],
  
  // Files to exclude from scanning
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.vscode',
    '.idea'
  ],
  
  // Security checks to perform
  checks: [
    'dependency-vulnerabilities',
    'hardcoded-secrets',
    'insecure-file-permissions',
    'missing-security-headers',
    'input-validation',
    'authentication-security'
  ]
};

// Security audit functions
const securityChecks = {
  // Check for dependency vulnerabilities
  checkDependencyVulnerabilities: () => {
    console.log('Checking for dependency vulnerabilities...');
    
    try {
      // Run npm audit if package-lock.json exists
      if (fs.existsSync('package-lock.json')) {
        const auditResult = execSync('npm audit --json', { encoding: 'utf-8' });
        const auditJson = JSON.parse(auditResult);
        
        if (auditJson.metadata && auditJson.metadata.vulnerabilities) {
          const vulnerabilities = auditJson.metadata.vulnerabilities;
          console.log(`Found ${vulnerabilities.total} total vulnerabilities:`);
          console.log(`  - Low: ${vulnerabilities.low}`);
          console.log(`  - Moderate: ${vulnerabilities.moderate}`);
          console.log(`  - High: ${vulnerabilities.high}`);
          console.log(`  - Critical: ${vulnerabilities.critical}`);
          
          if (vulnerabilities.total > 0) {
            console.log('⚠️  Run "npm audit" for detailed vulnerability information');
            return false;
          }
        }
      }
      
      // Run pip-audit if requirements.txt exists
      if (fs.existsSync('requirements.txt')) {
        try {
          const pipAuditResult = execSync('pip-audit', { encoding: 'utf-8' });
          if (!pipAuditResult.includes('No known vulnerabilities')) {
            console.log('⚠️  Python dependencies may have vulnerabilities - check with pip-audit');
            return false;
          }
        } catch (error) {
          if (error.stderr && !error.stderr.includes('No known vulnerabilities')) {
            console.log('⚠️  Python dependencies may have vulnerabilities - check with pip-audit');
            return false;
          }
        }
      }
      
      console.log('✅ No dependency vulnerabilities found');
      return true;
    } catch (error) {
      console.log('⚠️ Could not check dependency vulnerabilities:', error.message);
      return false;
    }
  },

  // Check for hardcoded secrets
  checkHardcodedSecrets: () => {
    console.log('Checking for hardcoded secrets...');
    
    const secretPatterns = [
      /password\s*[=:]\s*["'][^"']*["']/gi,
      /secret\s*[=:]\s*["'][^"']*["']/gi,
      /token\s*[=:]\s*["'][^"']*["']/gi,
      /key\s*[=:]\s*["'][^"']*["']/gi,
      /api[_-]?key\s*[=:]\s*["'][^"']*["']/gi,
      /auth[_-]?token\s*[=:]\s*["'][^"']*["']/gi,
      /client[_-]?secret\s*[=:]\s*["'][^"']*["']/gi,
      /access[_-]?token\s*[=:]\s*["'][^"']*["']/gi,
      /private[_-]?key\s*[=:]\s*["'][^"']*["']/gi,
      /ssh[_-]?key\s*[=:]\s*["'][^"']*["']/gi
    ];
    
    let issuesFound = false;
    
    // Scan all JS/TS files for hardcoded secrets
    const files = getAllFiles('./', ['.js', '.ts', '.jsx', '.tsx', '.json', '.env']);
    
    for (const file of files) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              console.log(`⚠️  Potential hardcoded secret found in ${file}`);
              issuesFound = true;
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    
    if (!issuesFound) {
      console.log('✅ No hardcoded secrets found');
    }
    
    return !issuesFound;
  },

  // Check for insecure file permissions
  checkFilePermissions: () => {
    console.log('Checking for insecure file permissions...');
    
    let issuesFound = false;
    
    // Check for files with overly permissive permissions
    const files = getAllFiles('./', ['.sh', '.py', '.js', '.ts']);
    
    for (const file of files) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        try {
          const stat = fs.statSync(file);
          const mode = stat.mode.toString(8);
          
          // Check if executable files have overly permissive permissions
          if (file.endsWith('.sh') || file.endsWith('.py') || file.endsWith('.js') || file.endsWith('.ts')) {
            if (mode.slice(-3) === '777') {
              console.log(`⚠️  File ${file} has overly permissive permissions (${mode})`);
              issuesFound = true;
            }
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }
    }
    
    if (!issuesFound) {
      console.log('✅ No insecure file permissions found');
    }
    
    return !issuesFound;
  }
};

// Helper function to get all files in directory
function getAllFiles(dir, extensions) {
  const results = [];
  
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!config.excludePatterns.some(pattern => fullPath.includes(pattern))) {
        results.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Run security audit
async function runSecurityAudit() {
  console.log('🚀 Summit Application Security Audit');
  console.log('=====================================');
  console.log('');
  
  const startTime = Date.now();
  let passedChecks = 0;
  let totalChecks = 0;
  
  for (const check of config.checks) {
    totalChecks++;
    
    try {
      const checkFunction = securityChecks[`check${check.charAt(0).toUpperCase() + check.slice(1)}`];
      if (checkFunction) {
        const result = await Promise.resolve(checkFunction());
        if (result) {
          passedChecks++;
        }
      } else {
        console.log(`⚠️  Unknown check: ${check}`);
      }
    } catch (error) {
      console.log(`❌ Error running check ${check}: ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('');
  console.log('📊 Security Audit Summary');
  console.log('========================');
  console.log(`Total checks: ${totalChecks}`);
  console.log(`Passed checks: ${passedChecks}`);
  console.log(`Failed checks: ${totalChecks - passedChecks}`);
  console.log(`Duration: ${duration}ms`);
  
  if (passedChecks === totalChecks) {
    console.log('');
    console.log('✅ All security checks passed!');
    console.log('The application appears to be secure.');
    process.exit(0);
  } else {
    console.log('');
    console.log('⚠️ Some security checks failed!');
    console.log('Please address the security issues identified above.');
    process.exit(1);
  }
}

// Run the audit
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error('Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit, securityChecks };
