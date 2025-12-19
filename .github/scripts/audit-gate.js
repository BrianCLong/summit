#!/usr/bin/env node

/**
 * NPM Audit Gate - Supply Chain Security Check
 *
 * Analyzes npm audit results and enforces security policies:
 * - Fails on high/critical vulnerabilities in production deps
 * - Allows known exceptions via allowlist
 * - Provides detailed remediation guidance
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// Configuration
const AUDIT_FILE = process.argv[2] || 'audit.json';
const SERVICE_NAME = process.env.SERVICE_NAME || 'dependency-scan';
const ALLOWLIST_FILE = path.join(
  process.cwd(),
  '.github',
  'audit-allowlist.json',
);
const WAIVER_ROOT =
  process.env.WAIVER_ROOT || path.join(process.cwd(), 'security', 'waivers');
const VULN_REPORT_DIR = process.env.VULN_REPORT_DIR || process.cwd();
const VULN_REPORT_FILE =
  process.env.VULN_REPORT_FILE || `vuln_report.${SERVICE_NAME}.json`;
const MAX_SEVERITY_ALLOWED = process.env.MAX_AUDIT_SEVERITY || 'moderate';
const AUDIT_EXIT_CODE = parseInt(process.env.AUDIT_EXIT_CODE || '1', 10);
const RECORD_ONLY = process.argv.includes('--record-only');

const SEVERITY_LEVELS = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'];

class AuditGate {
  constructor() {
    this.allowlist = this.loadAllowlist();
    this.maxSeverityLevel = SEVERITY_LEVELS[MAX_SEVERITY_ALLOWED];
    this.waiver = this.loadWaiver();
    this.activeWaiver = this.isWaiverActive(this.waiver) ? this.waiver : null;
    this.reportPath = path.join(VULN_REPORT_DIR, VULN_REPORT_FILE);
    this.auditTrailPath = path.join(
      VULN_REPORT_DIR,
      `audit-trail.${SERVICE_NAME}.log`,
    );
    this.waiverArtifactPath = path.join(
      VULN_REPORT_DIR,
      `waiver.${SERVICE_NAME}.yml`,
    );
  }

  loadAllowlist() {
    try {
      if (fs.existsSync(ALLOWLIST_FILE)) {
        return JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️ Could not load audit allowlist:', error.message);
    }

    return {
      advisories: [],
      packages: [],
      paths: [],
      expires: {},
    };
  }

  isWaiverActive(waiver) {
    if (!waiver) return false;

    const now = new Date();

    if (waiver.expires_at && new Date(waiver.expires_at) < now) {
      return false;
    }

    if (waiver.valid_from && new Date(waiver.valid_from) > now) {
      return false;
    }

    return waiver.status !== 'revoked';
  }

  loadWaiver() {
    const waiverPath = path.join(WAIVER_ROOT, SERVICE_NAME, 'waiver.yml');

    if (!fs.existsSync(waiverPath)) {
      return null;
    }

    try {
      const waiverData = yaml.parse(fs.readFileSync(waiverPath, 'utf8')) || {};
      return { ...waiverData, path: waiverPath };
    } catch (error) {
      console.warn(`⚠️ Could not parse waiver file at ${waiverPath}:`, error.message);
      return null;
    }
  }

  async analyzeAudit() {
    if (!fs.existsSync(AUDIT_FILE)) {
      console.error('❌ Audit file not found:', AUDIT_FILE);
      process.exit(1);
    }

    let auditData;
    try {
      auditData = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    } catch (error) {
      console.error('❌ Invalid audit JSON:', error.message);
      process.exit(1);
    }

    // Handle both npm audit v6 and v7+ formats
    const vulnerabilities = this.normalizeVulnerabilities(auditData);

    console.log(`🔍 Analyzing ${vulnerabilities.length} vulnerabilities...`);

    const results = {
      total: vulnerabilities.length,
      blocked: [],
      allowed: [],
      expired: [],
      summary: {},
    };

    // Count by severity
    for (const severity of Object.keys(SEVERITY_LEVELS)) {
      results.summary[severity] = vulnerabilities.filter(
        (v) => v.severity === severity,
      ).length;
    }

    // Analyze each vulnerability
    for (const vuln of vulnerabilities) {
      const analysis = this.analyzeVulnerability(vuln);

      if (analysis.action === 'block') {
        results.blocked.push({ ...vuln, reason: analysis.reason });
      } else if (analysis.action === 'allow') {
        results.allowed.push({ ...vuln, reason: analysis.reason });
      } else if (analysis.action === 'expired') {
        results.expired.push({ ...vuln, reason: analysis.reason });
      }
    }

    return results;
  }

  normalizeVulnerabilities(auditData) {
    const vulnerabilities = [];

    if (auditData.advisories) {
      // npm audit v6 format
      for (const [id, advisory] of Object.entries(auditData.advisories)) {
        vulnerabilities.push({
          id: parseInt(id),
          title: advisory.title,
          severity: advisory.severity,
          module_name: advisory.module_name,
          vulnerable_versions: advisory.vulnerable_versions,
          patched_versions: advisory.patched_versions,
          overview: advisory.overview,
          url: advisory.url,
          findings: advisory.findings || [],
        });
      }
    } else if (auditData.vulnerabilities) {
      // npm audit v7+ format
      for (const [packageName, vulnData] of Object.entries(
        auditData.vulnerabilities,
      )) {
        if (vulnData.via && Array.isArray(vulnData.via)) {
          for (const via of vulnData.via) {
            if (typeof via === 'object' && via.title) {
              vulnerabilities.push({
                id: via.source || 0,
                title: via.title,
                severity: vulnData.severity,
                module_name: packageName,
                vulnerable_versions: via.range || 'unknown',
                patched_versions: 'See advisory',
                overview: via.title,
                url: via.url,
                findings: [],
              });
            }
          }
        }
      }
    }

    return vulnerabilities;
  }

  analyzeVulnerability(vuln) {
    const severityLevel = SEVERITY_LEVELS[vuln.severity];

    // Check if vulnerability is in allowlist
    const allowlistEntry = this.checkAllowlist(vuln);
    if (allowlistEntry) {
      if (
        allowlistEntry.expires &&
        new Date(allowlistEntry.expires) < new Date()
      ) {
        return {
          action: 'expired',
          reason: `Allowlist entry expired on ${allowlistEntry.expires}`,
        };
      }
      return {
        action: 'allow',
        reason: `Allowlisted: ${allowlistEntry.reason}`,
      };
    }

    // Block if severity is above threshold and no active waiver
    if (severityLevel > this.maxSeverityLevel) {
      if (this.activeWaiver) {
        return {
          action: 'allow',
          reason: `Waiver applied from ${this.activeWaiver.path}`,
        };
      }

      return {
        action: 'block',
        reason: `Severity ${vuln.severity} exceeds maximum allowed (${MAX_SEVERITY_ALLOWED})`,
      };
    }

    return {
      action: 'allow',
      reason: `Severity ${vuln.severity} is within acceptable range`,
    };
  }

  checkAllowlist(vuln) {
    // Check by advisory ID
    const advisoryMatch = this.allowlist.advisories.find(
      (a) => a.id === vuln.id,
    );
    if (advisoryMatch) return advisoryMatch;

    // Check by package name
    const packageMatch = this.allowlist.packages.find(
      (p) => p.name === vuln.module_name,
    );
    if (packageMatch) return packageMatch;

    // Check by path patterns
    const pathMatch = this.allowlist.paths.find((p) => {
      const regex = new RegExp(p.pattern);
      return vuln.findings.some((finding) =>
        regex.test(finding.paths?.[0] || ''),
      );
    });
    if (pathMatch) return pathMatch;

    return null;
  }

  generateReport(results) {
    console.log('\n🛡️ Supply Chain Security Report');
    console.log('================================');

    console.log('\n📊 Summary:');
    for (const [severity, count] of Object.entries(results.summary)) {
      if (count > 0) {
        const emoji = this.getSeverityEmoji(severity);
        console.log(`  ${emoji} ${severity}: ${count}`);
      }
    }

    if (results.blocked.length > 0) {
      console.log('\n🚨 Blocking Vulnerabilities:');
      results.blocked.forEach((vuln, i) => {
        console.log(`\n  ${i + 1}. ${vuln.title}`);
        console.log(`     Package: ${vuln.module_name}`);
        console.log(`     Severity: ${vuln.severity}`);
        console.log(`     Reason: ${vuln.reason}`);
        console.log(`     URL: ${vuln.url}`);
      });

      console.log('\n🔧 Remediation Steps:');
      console.log('  1. Run `pnpm audit --fix` to auto-fix issues');
      console.log('  2. Update vulnerable packages manually');
      console.log('  3. Add to allowlist if fix not available (temporary)');
      console.log('  4. Consider alternative packages');
    }

    if (results.allowed.length > 0) {
      console.log('\n✅ Allowed Vulnerabilities:');
      results.allowed.forEach((vuln, i) => {
        console.log(
          `  ${i + 1}. ${vuln.title} (${vuln.severity}) - ${vuln.reason}`,
        );
      });
    }

    if (results.expired.length > 0) {
      console.log('\n⏰ Expired Allowlist Entries:');
      results.expired.forEach((vuln, i) => {
        console.log(`  ${i + 1}. ${vuln.title} - ${vuln.reason}`);
      });
    }

    const gatePassed = results.blocked.length === 0 || !!this.activeWaiver;

    console.log('\n📋 Gate Decision:', gatePassed ? '✅ PASS' : '❌ FAIL');

    if (this.activeWaiver) {
      console.log(`\n🛡️ Waiver applied for ${SERVICE_NAME}: ${this.activeWaiver.path}`);
    }

    return gatePassed;
  }

  persistArtifacts(results, gatePassed) {
    fs.mkdirSync(VULN_REPORT_DIR, { recursive: true });

    const report = {
      service: SERVICE_NAME,
      audit_file: path.resolve(AUDIT_FILE),
      generated_at: new Date().toISOString(),
      decision: gatePassed ? 'pass' : 'fail',
      max_severity_allowed: MAX_SEVERITY_ALLOWED,
      waiver_applied: !!this.activeWaiver,
      waiver: this.activeWaiver
        ? {
            path: this.activeWaiver.path,
            status: this.activeWaiver.status || 'approved',
            expires_at: this.activeWaiver.expires_at || null,
            valid_from: this.activeWaiver.valid_from || null,
            approved_by: this.activeWaiver.approved_by || null,
          }
        : null,
      summary: results.summary,
      totals: {
        total: results.total,
        blocked: results.blocked.length,
        allowed: results.allowed.length,
        expired: results.expired.length,
      },
      blocked: results.blocked,
      allowed: results.allowed,
      expired: results.expired,
    };

    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));

    const auditTrail = [
      `[${report.generated_at}] service=${SERVICE_NAME}`,
      `decision=${report.decision} max_severity_allowed=${MAX_SEVERITY_ALLOWED}`,
      `blocked=${results.blocked.length} allowed=${results.allowed.length} expired=${results.expired.length}`,
      `waiver=${this.activeWaiver ? this.activeWaiver.path : 'none'}`,
    ].join('\n');
    fs.writeFileSync(this.auditTrailPath, `${auditTrail}\n`);

    if (this.activeWaiver?.path && fs.existsSync(this.activeWaiver.path)) {
      try {
        fs.copyFileSync(this.activeWaiver.path, this.waiverArtifactPath);
      } catch (error) {
        console.warn('⚠️ Could not copy waiver artifact:', error.message);
      }
    }

    return report;
  }

  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🔴',
      high: '🟠',
      moderate: '🟡',
      low: '🔵',
      info: '⚪',
    };
    return emojis[severity] || '❓';
  }

  async generateAllowlistTemplate() {
    const template = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'NPM Audit Allowlist',
      description: 'Temporary exceptions for npm audit vulnerabilities',
      advisories: [
        {
          id: 1234,
          reason: 'No fix available, mitigated by network controls',
          expires: '2024-12-31T23:59:59Z',
          approved_by: 'security-team',
          tracking_issue: 'https://github.com/owner/repo/issues/123',
        },
      ],
      packages: [
        {
          name: 'vulnerable-package',
          reason: 'Indirect dependency, fix in progress upstream',
          expires: '2024-06-30T23:59:59Z',
          approved_by: 'platform-team',
        },
      ],
      paths: [
        {
          pattern: 'node_modules/dev-only-package/.*',
          reason: 'Development dependency, not in production',
          approved_by: 'development-team',
        },
      ],
    };

    const templatePath = path.join(
      process.cwd(),
      '.github',
      'audit-allowlist.template.json',
    );
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    console.log(`📝 Allowlist template created: ${templatePath}`);
  }
}

// Main execution
async function main() {
  const gate = new AuditGate();

  if (process.argv.includes('--init')) {
    await gate.generateAllowlistTemplate();
    return;
  }

  try {
    const results = await gate.analyzeAudit();
    const passed = gate.generateReport(results);
    const report = gate.persistArtifacts(results, passed);

    console.log(`\n🗂️ Vulnerability report saved to ${gate.reportPath}`);
    console.log(`🧾 Audit trail saved to ${gate.auditTrailPath}`);
    if (gate.activeWaiver?.path) {
      console.log(`📎 Waiver artifact copied to ${gate.waiverArtifactPath}`);
    }

    if (!passed) {
      console.error(
        '\n❌ Audit gate failed due to unacceptable vulnerabilities',
      );
      console.error(
        '   Add exceptions to .github/audit-allowlist.json or create a waiver if needed',
      );

      if (RECORD_ONLY) {
        console.log('ℹ️ Record-only mode enabled - not failing pipeline');
        return;
      }

      process.exit(AUDIT_EXIT_CODE || 1);
    }

    console.log('\n✅ Audit gate passed - supply chain security validated');
    console.log(`   Decision recorded for ${report.service} at ${report.generated_at}`);
  } catch (error) {
    console.error('❌ Audit gate error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
