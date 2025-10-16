#!/usr/bin/env node

/**
 * Comprehensive Security Scanner for Maestro Build Plane
 * Performs security analysis, vulnerability scanning, and compliance checks
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

class SecurityScanner {
  constructor() {
    this.reportDir = join(root, 'test-results', 'security')
    this.results = {
      dependencies: null,
      secrets: null,
      code: null,
      headers: null,
      permissions: null,
      bundleSecurity: null
    }
    this.startTime = Date.now()
    this.findings = []
  }

  async setup() {
    console.log('🔒 Setting up security scanner...')
    
    // Create report directory
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true })
    }
  }

  async scanDependencies() {
    console.log('📦 Scanning dependencies for vulnerabilities...')
    
    try {
      // Run npm audit
      const { stdout: auditOutput } = await execAsync('npm audit --json', {
        cwd: root,
        timeout: 30000
      }).catch(error => ({ stdout: error.stdout || '{}' }))

      let auditResults
      try {
        auditResults = JSON.parse(auditOutput)
      } catch {
        auditResults = { vulnerabilities: {}, metadata: {} }
      }

      // Analyze package.json for security issues
      const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      const packageLock = existsSync(join(root, 'package-lock.json')) 
        ? JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
        : null

      const dependencyAnalysis = this.analyzeDependencies(packageJson, packageLock)
      
      const result = {
        type: 'dependencies',
        vulnerabilities: auditResults.vulnerabilities || {},
        metadata: auditResults.metadata || {},
        packageAnalysis: dependencyAnalysis,
        summary: {
          total: Object.keys(auditResults.vulnerabilities || {}).length,
          critical: Object.values(auditResults.vulnerabilities || {}).filter(v => v.severity === 'critical').length,
          high: Object.values(auditResults.vulnerabilities || {}).filter(v => v.severity === 'high').length,
          moderate: Object.values(auditResults.vulnerabilities || {}).filter(v => v.severity === 'moderate').length,
          low: Object.values(auditResults.vulnerabilities || {}).filter(v => v.severity === 'low').length
        },
        passed: Object.keys(auditResults.vulnerabilities || {}).length === 0
      }

      this.results.dependencies = result
      
      if (result.summary.total > 0) {
        this.findings.push({
          severity: result.summary.critical > 0 ? 'critical' : 
                   result.summary.high > 0 ? 'high' : 'moderate',
          category: 'dependencies',
          message: `Found ${result.summary.total} dependency vulnerabilities`,
          details: result.summary
        })
      }

      console.log(`  ✅ Dependency scan completed: ${result.summary.total} vulnerabilities found`)
      
    } catch (error) {
      this.results.dependencies = {
        type: 'dependencies',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Dependency scan failed:', error.message)
    }
  }

  analyzeDependencies(packageJson, packageLock) {
    const analysis = {
      directDependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      riskyPackages: [],
      outdatedPackages: [],
      licenseIssues: []
    }

    // Check for commonly vulnerable packages
    const riskyPackagePatterns = [
      'lodash', 'moment', 'request', 'node-sass', 'gulp'
    ]

    analysis.directDependencies.forEach(pkg => {
      if (riskyPackagePatterns.some(pattern => pkg.includes(pattern))) {
        analysis.riskyPackages.push({
          package: pkg,
          reason: 'Commonly vulnerable package - consider alternatives'
        })
      }
    })

    // Check for pinned versions (security best practice)
    const unpinnedDeps = []
    Object.entries(packageJson.dependencies || {}).forEach(([pkg, version]) => {
      if (version.startsWith('^') || version.startsWith('~')) {
        unpinnedDeps.push(`${pkg}@${version}`)
      }
    })

    if (unpinnedDeps.length > 0) {
      analysis.riskyPackages.push({
        package: 'version-pinning',
        reason: `${unpinnedDeps.length} dependencies use flexible versioning`,
        details: unpinnedDeps.slice(0, 5)
      })
    }

    return analysis
  }

  async scanForSecrets() {
    console.log('🔍 Scanning for exposed secrets and sensitive data...')
    
    try {
      const secretPatterns = [
        { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
        { name: 'AWS Secret Key', pattern: /[0-9a-zA-Z\/+]{40}/, severity: 'critical' },
        { name: 'Private Key', pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/, severity: 'critical' },
        { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, severity: 'high' },
        { name: 'API Key', pattern: /[Aa][Pp][Ii]_?[Kk][Ee][Yy].*[\'|"][0-9a-zA-Z]{32,45}[\'|"]/, severity: 'high' },
        { name: 'Password in Code', pattern: /[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd].*[\'|"][^\'|"]{6,}[\'|"]/, severity: 'moderate' },
        { name: 'Database URL', pattern: /(mongodb|mysql|postgres):\/\/[^\s'"]+/, severity: 'moderate' }
      ]

      const findings = []
      const filesToScan = this.getSourceFiles()

      for (const file of filesToScan) {
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')

          secretPatterns.forEach(({ name, pattern, severity }) => {
            lines.forEach((line, lineNumber) => {
              const matches = line.match(pattern)
              if (matches) {
                // Skip false positives (comments, examples, etc.)
                if (line.trim().startsWith('//') || 
                    line.trim().startsWith('*') ||
                    line.includes('example') ||
                    line.includes('placeholder')) {
                  return
                }

                findings.push({
                  type: name,
                  severity,
                  file: file.replace(root, ''),
                  line: lineNumber + 1,
                  match: matches[0].substring(0, 50) + '...'
                })
              }
            })
          })
        } catch (error) {
          // Skip files that can't be read
          continue
        }
      }

      // Check for .env files in inappropriate locations
      const envFiles = this.findEnvFiles()
      envFiles.forEach(envFile => {
        if (!envFile.includes('example') && !envFile.includes('template')) {
          findings.push({
            type: 'Environment File',
            severity: 'moderate',
            file: envFile.replace(root, ''),
            line: 1,
            match: 'Environment file detected'
          })
        }
      })

      const result = {
        type: 'secrets',
        findings,
        summary: {
          total: findings.length,
          critical: findings.filter(f => f.severity === 'critical').length,
          high: findings.filter(f => f.severity === 'high').length,
          moderate: findings.filter(f => f.severity === 'moderate').length
        },
        passed: findings.length === 0
      }

      this.results.secrets = result

      if (result.summary.total > 0) {
        this.findings.push({
          severity: result.summary.critical > 0 ? 'critical' : 
                   result.summary.high > 0 ? 'high' : 'moderate',
          category: 'secrets',
          message: `Found ${result.summary.total} potential secret exposures`,
          details: result.summary
        })
      }

      console.log(`  ✅ Secret scan completed: ${result.summary.total} potential secrets found`)
      
    } catch (error) {
      this.results.secrets = {
        type: 'secrets',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Secret scan failed:', error.message)
    }
  }

  async scanCodeSecurity() {
    console.log('🔎 Scanning code for security vulnerabilities...')
    
    try {
      const codeIssues = []
      const filesToScan = this.getSourceFiles().filter(f => 
        f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.jsx')
      )

      const securityPatterns = [
        {
          name: 'eval() usage',
          pattern: /\beval\s*\(/g,
          severity: 'high',
          description: 'eval() can execute arbitrary code and is a security risk'
        },
        {
          name: 'innerHTML usage',
          pattern: /\.innerHTML\s*=/g,
          severity: 'moderate',
          description: 'innerHTML can lead to XSS vulnerabilities'
        },
        {
          name: 'document.write usage',
          pattern: /document\.write\s*\(/g,
          severity: 'moderate',
          description: 'document.write can be vulnerable to XSS'
        },
        {
          name: 'Unsafe regex',
          pattern: /new RegExp\([^)]*\$[^)]*\)/g,
          severity: 'low',
          description: 'Dynamic regex construction can be vulnerable to ReDoS'
        },
        {
          name: 'HTTP URLs',
          pattern: /['"](http:\/\/[^'"]+)['"]/g,
          severity: 'low',
          description: 'HTTP URLs should be HTTPS in production'
        },
        {
          name: 'Hardcoded localhost',
          pattern: /['"](.*localhost.*)['"]/g,
          severity: 'low',
          description: 'Hardcoded localhost URLs should be configurable'
        }
      ]

      for (const file of filesToScan) {
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')

          securityPatterns.forEach(({ name, pattern, severity, description }) => {
            lines.forEach((line, lineNumber) => {
              const matches = line.match(pattern)
              if (matches) {
                // Skip comments and test files
                if (line.trim().startsWith('//') || 
                    line.trim().startsWith('*') ||
                    file.includes('.test.') ||
                    file.includes('.spec.')) {
                  return
                }

                codeIssues.push({
                  type: name,
                  severity,
                  description,
                  file: file.replace(root, ''),
                  line: lineNumber + 1,
                  code: line.trim().substring(0, 100)
                })
              }
            })
          })
        } catch (error) {
          continue
        }
      }

      const result = {
        type: 'code',
        issues: codeIssues,
        summary: {
          total: codeIssues.length,
          high: codeIssues.filter(i => i.severity === 'high').length,
          moderate: codeIssues.filter(i => i.severity === 'moderate').length,
          low: codeIssues.filter(i => i.severity === 'low').length
        },
        passed: codeIssues.filter(i => i.severity === 'high').length === 0
      }

      this.results.code = result

      if (result.summary.high > 0) {
        this.findings.push({
          severity: 'high',
          category: 'code',
          message: `Found ${result.summary.high} high-severity code security issues`,
          details: result.summary
        })
      }

      console.log(`  ✅ Code scan completed: ${result.summary.total} security issues found`)
      
    } catch (error) {
      this.results.code = {
        type: 'code',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Code scan failed:', error.message)
    }
  }

  async scanSecurityHeaders() {
    console.log('🛡️ Checking security headers configuration...')
    
    try {
      // Check if we have nginx.conf or other server configurations
      const configFiles = [
        join(root, 'nginx.conf'),
        join(root, 'public', '_headers'),
        join(root, 'vercel.json'),
        join(root, 'netlify.toml')
      ]

      const headerChecks = []
      let hasSecurityConfig = false

      for (const configFile of configFiles) {
        if (existsSync(configFile)) {
          hasSecurityConfig = true
          const content = readFileSync(configFile, 'utf8')
          
          const requiredHeaders = [
            { name: 'X-Content-Type-Options', value: 'nosniff' },
            { name: 'X-Frame-Options', value: 'DENY|SAMEORIGIN' },
            { name: 'X-XSS-Protection', value: '1; mode=block' },
            { name: 'Content-Security-Policy', value: '.*' },
            { name: 'Referrer-Policy', value: '.*' },
            { name: 'Strict-Transport-Security', value: '.*' }
          ]

          requiredHeaders.forEach(({ name, value }) => {
            const pattern = new RegExp(`${name}.*${value}`, 'i')
            const found = pattern.test(content)
            
            headerChecks.push({
              header: name,
              required: true,
              found,
              severity: found ? 'info' : 'moderate',
              configFile: configFile.replace(root, '')
            })
          })
          break
        }
      }

      // Check for index.html meta security tags
      const indexHtml = join(root, 'index.html')
      if (existsSync(indexHtml)) {
        const htmlContent = readFileSync(indexHtml, 'utf8')
        
        const metaTags = [
          { name: 'Content-Security-Policy', pattern: /<meta.*http-equiv.*Content-Security-Policy/i },
          { name: 'X-Content-Type-Options', pattern: /<meta.*http-equiv.*X-Content-Type-Options/i }
        ]

        metaTags.forEach(({ name, pattern }) => {
          const found = pattern.test(htmlContent)
          headerChecks.push({
            header: name,
            required: false,
            found,
            severity: 'info',
            configFile: '/index.html'
          })
        })
      }

      const result = {
        type: 'headers',
        hasSecurityConfig,
        checks: headerChecks,
        summary: {
          total: headerChecks.length,
          configured: headerChecks.filter(c => c.found).length,
          missing: headerChecks.filter(c => c.required && !c.found).length
        },
        passed: headerChecks.filter(c => c.required && !c.found).length === 0
      }

      this.results.headers = result

      if (result.summary.missing > 0) {
        this.findings.push({
          severity: 'moderate',
          category: 'headers',
          message: `Missing ${result.summary.missing} required security headers`,
          details: result.summary
        })
      }

      console.log(`  ✅ Security headers scan completed: ${result.summary.missing} missing headers`)
      
    } catch (error) {
      this.results.headers = {
        type: 'headers',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Security headers scan failed:', error.message)
    }
  }

  async scanFilePermissions() {
    console.log('📁 Checking file permissions and configurations...')
    
    try {
      const permissionIssues = []
      const sensitiveFiles = [
        '.env', '.env.local', '.env.production',
        'id_rsa', 'id_dsa', 'private.key',
        'package-lock.json', 'yarn.lock',
        '.git/config'
      ]

      // Check for sensitive files with wrong permissions
      const allFiles = this.getSourceFiles()
      
      sensitiveFiles.forEach(fileName => {
        const matchingFiles = allFiles.filter(f => f.endsWith(fileName))
matchingFiles.forEach(file => {
          try {
            const stats = statSync(file)
            const mode = stats.mode & parseInt('777', 8)
            
            // Check if file is readable by others
            if (mode & parseInt('044', 8)) {
              permissionIssues.push({
                file: file.replace(root, ''),
                issue: 'Readable by others',
                severity: 'moderate',
                mode: mode.toString(8)
              })
            }
          } catch (error) {
            // File access error within callback; skip this entry
            return
          }
        })
      })

      // Check for executable files that shouldn't be
      const executableFiles = allFiles.filter(file => {
        try {
          const stats = statSync(file)
          return (stats.mode & parseInt('111', 8)) && 
                 (file.endsWith('.json') || file.endsWith('.md') || file.endsWith('.txt'))
        } catch {
          return false
        }
      })

      executableFiles.forEach(file => {
        permissionIssues.push({
          file: file.replace(root, ''),
          issue: 'Unnecessarily executable',
          severity: 'low',
          mode: 'executable'
        })
      })

      // Check for world-writable files
allFiles.forEach(file => {
        try {
          const stats = statSync(file)
          if (stats.mode & parseInt('002', 8)) {
            permissionIssues.push({
              file: file.replace(root, ''),
              issue: 'World writable',
              severity: 'high',
              mode: (stats.mode & parseInt('777', 8)).toString(8)
            })
          }
        } catch {
          return
        }
      })

      const result = {
        type: 'permissions',
        issues: permissionIssues,
        summary: {
          total: permissionIssues.length,
          high: permissionIssues.filter(i => i.severity === 'high').length,
          moderate: permissionIssues.filter(i => i.severity === 'moderate').length,
          low: permissionIssues.filter(i => i.severity === 'low').length
        },
        passed: permissionIssues.filter(i => i.severity === 'high').length === 0
      }

      this.results.permissions = result

      if (result.summary.high > 0) {
        this.findings.push({
          severity: 'high',
          category: 'permissions',
          message: `Found ${result.summary.high} critical file permission issues`,
          details: result.summary
        })
      }

      console.log(`  ✅ Permission scan completed: ${result.summary.total} permission issues found`)
      
    } catch (error) {
      this.results.permissions = {
        type: 'permissions',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Permission scan failed:', error.message)
    }
  }

  async scanBundleSecurity() {
    console.log('📦 Analyzing bundle security...')
    
    try {
      const bundleIssues = []
      const distDir = join(root, 'dist')
      
      if (!existsSync(distDir)) {
        console.log('  ⚠️ No build found, skipping bundle security scan')
        this.results.bundleSecurity = {
          type: 'bundle',
          skipped: true,
          message: 'No build artifacts found'
        }
        return
      }

      // Check for source maps in production build
      const sourceMapFiles = readdirSync(distDir, { recursive: true })
        .filter(file => file.endsWith('.map'))
        .map(file => join(distDir, file))

      if (sourceMapFiles.length > 0) {
        bundleIssues.push({
          type: 'Source Maps',
          severity: 'moderate',
          description: 'Source maps should not be included in production builds',
          files: sourceMapFiles.map(f => f.replace(root, '')),
          count: sourceMapFiles.length
        })
      }

      // Check for unminified files
      const jsFiles = readdirSync(distDir, { recursive: true })
        .filter(file => file.endsWith('.js') && !file.endsWith('.min.js'))
        .map(file => join(distDir, file))

      const unminifiedFiles = []
jsFiles.forEach(file => {
        try {
          const content = readFileSync(file, 'utf8')
          // Simple heuristic: if file has lots of whitespace and comments, it's likely unminified
          const lines = content.split('\n')
          const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length
          const totalLines = lines.length
          
          if (totalLines > 100 && (totalLines / codeLines) > 1.5) {
            unminifiedFiles.push(file)
          }
        } catch {
          return
        }
      })

      if (unminifiedFiles.length > 0) {
        bundleIssues.push({
          type: 'Unminified Code',
          severity: 'low',
          description: 'Unminified JavaScript files increase bundle size and expose code structure',
          files: unminifiedFiles.map(f => f.replace(root, '')),
          count: unminifiedFiles.length
        })
      }

      // Check for large bundle sizes (potential attack surface)
      const largeBundles = []
jsFiles.forEach(file => {
        try {
          const stats = statSync(file)
          if (stats.size > 1024 * 1024) { // > 1MB
            largeBundles.push({
              file: file.replace(root, ''),
              size: (stats.size / 1024 / 1024).toFixed(2) + ' MB'
            })
          }
        } catch {
          return
        }
      })

      if (largeBundles.length > 0) {
        bundleIssues.push({
          type: 'Large Bundles',
          severity: 'low',
          description: 'Large bundles increase attack surface and loading time',
          files: largeBundles,
          count: largeBundles.length
        })
      }

      const result = {
        type: 'bundle',
        issues: bundleIssues,
        summary: {
          total: bundleIssues.length,
          moderate: bundleIssues.filter(i => i.severity === 'moderate').length,
          low: bundleIssues.filter(i => i.severity === 'low').length
        },
        passed: bundleIssues.filter(i => i.severity === 'moderate').length === 0
      }

      this.results.bundleSecurity = result

      if (result.summary.moderate > 0) {
        this.findings.push({
          severity: 'moderate',
          category: 'bundle',
          message: `Found ${result.summary.moderate} bundle security issues`,
          details: result.summary
        })
      }

      console.log(`  ✅ Bundle security scan completed: ${result.summary.total} issues found`)
      
    } catch (error) {
      this.results.bundleSecurity = {
        type: 'bundle',
        passed: false,
        error: error.message
      }
      console.log('  ❌ Bundle security scan failed:', error.message)
    }
  }

  getSourceFiles() {
    const sourceFiles = []
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
    
    const scanDirectory = (dir) => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        
        entries.forEach(entry => {
          const fullPath = join(dir, entry.name)
          
          if (entry.isDirectory()) {
            if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
              scanDirectory(fullPath)
            }
          } else if (entry.isFile()) {
            sourceFiles.push(fullPath)
          }
        })
      } catch {
        // Skip directories we can't read
      }
    }

    scanDirectory(root)
    return sourceFiles
  }

  findEnvFiles() {
    const envFiles = []
    const sourceFiles = this.getSourceFiles()
    
    sourceFiles.forEach(file => {
      const fileName = file.split('/').pop()
      if (fileName.startsWith('.env') || fileName === '.environment') {
        envFiles.push(file)
      }
    })

    return envFiles
  }

  async generateReport() {
    console.log('📄 Generating security scan report...')

    const totalDuration = Date.now() - this.startTime
    const overallSeverity = this.findings.length === 0 ? 'info' :
      this.findings.some(f => f.severity === 'critical') ? 'critical' :
      this.findings.some(f => f.severity === 'high') ? 'high' : 'moderate'

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      overallSeverity,
      passed: overallSeverity === 'info',
      summary: {
        totalFindings: this.findings.length,
        critical: this.findings.filter(f => f.severity === 'critical').length,
        high: this.findings.filter(f => f.severity === 'high').length,
        moderate: this.findings.filter(f => f.severity === 'moderate').length,
        low: this.findings.filter(f => f.severity === 'low').length
      },
      results: this.results,
      findings: this.findings,
      recommendations: this.generateRecommendations()
    }

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'security-scan.json'),
      JSON.stringify(report, null, 2)
    )

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report)
    writeFileSync(join(this.reportDir, 'security-scan.html'), htmlReport)

    return report
  }

  generateRecommendations() {
    const recommendations = []

    // Dependency recommendations
    if (this.results.dependencies?.summary?.total > 0) {
      recommendations.push({
        category: 'Dependencies',
        priority: 'high',
        action: 'Update vulnerable dependencies using npm audit fix',
        details: 'Review and update all dependencies with known vulnerabilities'
      })
    }

    // Secret exposure recommendations
    if (this.results.secrets?.summary?.total > 0) {
      recommendations.push({
        category: 'Secrets',
        priority: 'critical',
        action: 'Remove hardcoded secrets from source code',
        details: 'Use environment variables and secure secret management'
      })
    }

    // Code security recommendations
    if (this.results.code?.summary?.high > 0) {
      recommendations.push({
        category: 'Code Security',
        priority: 'high',
        action: 'Fix high-severity code security issues',
        details: 'Replace unsafe functions and patterns with secure alternatives'
      })
    }

    // Security headers recommendations
    if (this.results.headers?.summary?.missing > 0) {
      recommendations.push({
        category: 'Security Headers',
        priority: 'moderate',
        action: 'Configure missing security headers',
        details: 'Add Content-Security-Policy, X-Frame-Options, and other security headers'
      })
    }

    // File permissions recommendations
    if (this.results.permissions?.summary?.high > 0) {
      recommendations.push({
        category: 'File Permissions',
        priority: 'high',
        action: 'Fix file permission issues',
        details: 'Ensure sensitive files have appropriate access restrictions'
      })
    }

    // Bundle security recommendations
    if (this.results.bundleSecurity?.summary?.moderate > 0) {
      recommendations.push({
        category: 'Bundle Security',
        priority: 'moderate',
        action: 'Remove source maps from production builds',
        details: 'Configure build process to exclude source maps in production'
      })
    }

    // General recommendations
    recommendations.push({
      category: 'General Security',
      priority: 'moderate',
      action: 'Implement regular security scanning',
      details: 'Set up automated security scans in CI/CD pipeline'
    })

    return recommendations
  }

  generateHTMLReport(report) {
    const severityColors = {
      critical: '#dc3545',
      high: '#fd7e14', 
      moderate: '#ffc107',
      low: '#28a745',
      info: '#17a2b8'
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Scan Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 1.2em; font-weight: bold; }
        .status.critical { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status.high { background: #fdeaa7; color: #856404; border: 1px solid #faebcc; }
        .status.moderate { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .status.info { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; color: #333; }
        .scan-result { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .scan-result.passed { border-left: 4px solid #28a745; }
        .scan-result.failed { border-left: 4px solid #dc3545; }
        .finding { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0; }
        .finding-header { font-weight: bold; margin-bottom: 10px; }
        .severity { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; font-weight: bold; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; }
        .recommendation { background: white; padding: 15px; border: 1px solid #bbdefb; border-radius: 8px; margin: 10px 0; }
        .code { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Scan Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p>Duration: ${(report.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="status ${report.overallSeverity}">
            ${report.passed ? '✅ SECURITY SCAN PASSED' : `⚠️ SECURITY ISSUES FOUND (${report.overallSeverity.toUpperCase()})`}
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalFindings}</div>
                <div class="metric-label">Total Findings</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${severityColors.critical}">${report.summary.critical}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${severityColors.high}">${report.summary.high}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${severityColors.moderate}">${report.summary.moderate}</div>
                <div class="metric-label">Moderate</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${severityColors.low}">${report.summary.low}</div>
                <div class="metric-label">Low</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📊 Scan Results</div>
            ${Object.entries(report.results).map(([type, result]) => {
              if (!result || result.skipped) return ''
              
              return `
                <div class="scan-result ${result.passed ? 'passed' : 'failed'}">
                    <div class="section-title">
                        ${type.charAt(0).toUpperCase() + type.slice(1)} Scan
                        <span style="color: ${result.passed ? '#28a745' : '#dc3545'}">
                            ${result.passed ? '✅ PASSED' : '❌ FAILED'}
                        </span>
                    </div>
                    ${result.summary ? `
                        <p>Found ${result.summary.total || 0} issues</p>
                        ${result.summary.critical ? `<p>Critical: ${result.summary.critical}</p>` : ''}
                        ${result.summary.high ? `<p>High: ${result.summary.high}</p>` : ''}
                        ${result.summary.moderate ? `<p>Moderate: ${result.summary.moderate}</p>` : ''}
                        ${result.summary.low ? `<p>Low: ${result.summary.low}</p>` : ''}
                    ` : ''}
                    ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                </div>
              `
            }).join('')}
        </div>
        
        ${report.findings.length > 0 ? `
          <div class="section">
              <div class="section-title">🚨 Detailed Findings</div>
              ${report.findings.map(finding => `
                <div class="finding">
                    <div class="finding-header">
                        <span class="severity" style="background: ${severityColors[finding.severity]}">${finding.severity.toUpperCase()}</span>
                        ${finding.category} - ${finding.message}
                    </div>
                    ${finding.details ? `<div class="code">${JSON.stringify(finding.details, null, 2)}</div>` : ''}
                </div>
              `).join('')}
          </div>
        ` : ''}
        
        <div class="section">
            <div class="section-title">💡 Recommendations</div>
            <div class="recommendations">
                ${report.recommendations.map(rec => `
                  <div class="recommendation">
                      <div class="finding-header">
                          <span class="severity" style="background: ${severityColors[rec.priority]}">${rec.priority.toUpperCase()}</span>
                          ${rec.category}
                      </div>
                      <p><strong>Action:</strong> ${rec.action}</p>
                      <p>${rec.details}</p>
                  </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  async run(options = {}) {
    const {
      skipDependencies = false,
      skipSecrets = false,
      skipCode = false,
      skipHeaders = false,
      skipPermissions = false,
      skipBundle = false
    } = options

    try {
      await this.setup()
      
      if (!skipDependencies) await this.scanDependencies()
      if (!skipSecrets) await this.scanForSecrets()
      if (!skipCode) await this.scanCodeSecurity()
      if (!skipHeaders) await this.scanSecurityHeaders()
      if (!skipPermissions) await this.scanFilePermissions()
      if (!skipBundle) await this.scanBundleSecurity()
      
      const report = await this.generateReport()
      
      console.log('\n🎯 Security Scan Summary:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`  Overall Status:       ${report.passed ? '✅ PASSED' : `❌ FAILED (${report.overallSeverity.toUpperCase()})`}`)
      console.log(`  Total Findings:       ${report.summary.totalFindings}`)
      console.log(`  Critical Issues:      ${report.summary.critical}`)
      console.log(`  High Priority:        ${report.summary.high}`)
      console.log(`  Moderate Priority:    ${report.summary.moderate}`)
      console.log(`  Low Priority:         ${report.summary.low}`)
      console.log(`  Scan Duration:        ${(report.duration / 1000).toFixed(2)} seconds`)
      
      if (report.findings.length > 0) {
        console.log('\n🚨 Key Findings:')
        report.findings.slice(0, 5).forEach(finding => {
          console.log(`  ${finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡'} ${finding.message}`)
        })
      }
      
      console.log(`\n📄 Detailed report: ${join('test-results', 'security', 'security-scan.html')}`)
      
      return report.passed
      
    } catch (error) {
      console.error('❌ Security scan failed:', error)
      process.exit(1)
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const options = {
    skipDependencies: args.includes('--skip-dependencies'),
    skipSecrets: args.includes('--skip-secrets'),
    skipCode: args.includes('--skip-code'),
    skipHeaders: args.includes('--skip-headers'),
    skipPermissions: args.includes('--skip-permissions'),
    skipBundle: args.includes('--skip-bundle')
  }

  const scanner = new SecurityScanner()
  scanner.run(options).then(passed => {
    process.exit(passed ? 0 : 1)
  }).catch(console.error)
}

export default SecurityScanner