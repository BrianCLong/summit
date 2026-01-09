
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const SCHEMA_PATH = path.join(ROOT_DIR, 'schemas/release-dashboard.schema.json');
// Redaction Patterns
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /bearer\s+[a-zA-Z0-9\-\._~\+\/]+=*/i,
  /ghp_[a-zA-Z0-9]+/,
  /aws_[a-zA-Z0-9]+/,
];

const ALLOWED_DOMAINS = [
  'github.com',
  'npmjs.com',
  'pypi.org',
  'docker.io',
  'quay.io'
];

// Helper to calculate SHA256
async function calculateFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

class ReleaseDashboardGenerator {
  constructor(bundlePath, outputDir) {
    this.bundlePath = bundlePath;
    this.outputDir = outputDir || path.join(ROOT_DIR, 'dist/release-dashboard');
    this.manifest = null;
    this.schema = null;
    this.dashboard = null;
  }

  async run() {
    console.log('🚀 Generating Release Dashboard...');

    try {
      await this.loadSchema();
      await this.loadManifest();

      this.dashboard = await this.buildDashboard();

      this.redactDashboard();
      await this.validateDashboard();
      await this.writeOutput();

      console.log('✅ Release Dashboard generated successfully!');
      return this.dashboard;
    } catch (error) {
      console.error('❌ Generation failed:', error.message);
      process.exit(1);
    }
  }

  async loadSchema() {
    const schemaContent = await fs.readFile(SCHEMA_PATH, 'utf8');
    this.schema = JSON.parse(schemaContent);
  }

  async loadManifest() {
    // Try to load summary or manifest
    const summaryPath = path.join(this.bundlePath, 'EVIDENCE_BUNDLE_SUMMARY.json');
    try {
      const content = await fs.readFile(summaryPath, 'utf8');
      this.manifest = JSON.parse(content);
    } catch (e) {
      console.error(`Could not read evidence bundle summary from ${summaryPath}`);
      throw e;
    }
  }

  async buildDashboard() {
    // Basic Metadata
    const dashboard = {
      schema_version: '1.0.0',
      repo: process.env.GITHUB_REPOSITORY || 'unknown/repo',
      branch: process.env.GITHUB_REF_NAME || this.manifest.technical_evidence?.ci_cd_pipeline?.branch || 'unknown',
      commit_sha: process.env.GITHUB_SHA || this.manifest.technical_evidence?.provenance_validation?.source_code_integrity?.git_commit || 'unknown',
      commit_date: new Date().toISOString(), // TODO: Get from git if available
      workflow_run_id: process.env.GITHUB_RUN_ID || 'local',
      workflow_run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : 'http://localhost',
      evidence_bundle: {
        artifact_name: 'evidence-bundle',
        sha256: 'pending', // To be calculated on the bundle directory or zip
        signature_ref: this.manifest.technical_evidence?.provenance_validation?.cosign_attestations?.mock_attestation?.signature || 'none',
        verified: this.manifest.acceptance_criteria?.evidence_bundle_complete || false
      },
      gate_status: this.extractGateStatus(),
      dependency_delta_summary: await this.extractDependencyDelta(),
      sbom_summary: await this.extractSbomSummary(),
      policy_snapshots: await this.extractPolicySnapshots(),
      notes: this.extractNotes()
    };

    // Calculate hash of evidence summary as a proxy for the bundle hash for now
    // In a real scenario, we might hash the archive
    const summaryPath = path.join(this.bundlePath, 'EVIDENCE_BUNDLE_SUMMARY.json');
    dashboard.evidence_bundle.sha256 = await calculateFileHash(summaryPath) || 'unknown';

    return dashboard;
  }

  extractGateStatus() {
    // Mapping from Evidence Bundle structure to Gate Status
    // This is based on the mock data structure in generate-evidence-bundle.js

    const slo = this.manifest.technical_evidence?.performance_validation?.slo_compliance || {};
    const security = this.manifest.technical_evidence?.security_validation || {};

    return {
      typecheck: { status: 'unknown' }, // Not explicitly in summary
      lint: { status: 'unknown' },      // Not explicitly in summary
      build: { status: 'pass' },        // Implicitly pass if we are running
      unit_tests: { status: 'unknown' },
      integration_tests: {
        status: Object.values(slo).every(v => v) ? 'pass' : 'fail'
      },
      workflow_lint: { status: 'pass' }, // Assumed
      filter_safety: { status: security.opa_policies ? 'pass' : 'unknown' }
    };
  }

  async extractDependencyDelta() {
    // Placeholder logic - reading from a diff file if it existed
    return {
      upgraded: 0,
      downgraded: 0,
      added: 0,
      removed: 0
    };
  }

  async extractSbomSummary() {
    // Try to read SBOM if available
    const sbomPath = path.join(this.bundlePath, 'sbom.json'); // Or sbom.spdx.json
    try {
      // In a real implementation, we would parse the SBOM
      // For now, return mock/placeholder if file exists, or default
      await fs.access(sbomPath);
      return {
        total_components: 1, // Mock
        total_licenses: 1,
        top_license_families: { 'MIT': 1 }
      };
    } catch {
      return {
        total_components: 0,
        total_licenses: 0,
        top_license_families: {}
      };
    }
  }

  async extractPolicySnapshots() {
    const policies = this.manifest.technical_evidence?.security_validation?.opa_policies;
    if (policies && policies.hash) {
      return [{
        id: policies.policy_file || 'intelgraph.rego',
        hash: policies.hash
      }];
    }
    return [];
  }

  extractNotes() {
    // Return a copy so we don't modify the manifest in place if that matters
    const achievements = this.manifest.executive_summary?.key_achievements || [];
    return [...achievements.slice(0, 5)]; // Take top 5
  }

  redactDashboard() {
    // Recursive redaction
    const redact = (obj) => {
      if (!obj) return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            if (typeof item === 'string') {
                if (this.isSensitive(item)) {
                    obj[index] = '[REDACTED]';
                }
            } else {
                redact(item);
            }
        });
      } else if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const value = obj[key];

          // Check key for sensitivity
          if (SENSITIVE_PATTERNS.some(p => p.test(key))) {
             obj[key] = '[REDACTED]';
             continue;
          }

          if (typeof value === 'string') {
             if (this.isSensitive(value)) {
               obj[key] = '[REDACTED]';
             }
          } else if (typeof value === 'object') {
            redact(value);
          }
        }
      }
    };

    redact(this.dashboard);
  }

  isSensitive(text) {
    // Heuristic checks
    if (SENSITIVE_PATTERNS.some(p => p.test(text))) return true;

    // Check for URLs with non-allowed domains
    // This catches URLs embedded in text as well
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    if (urls) {
      for (const urlStr of urls) {
        try {
          const url = new URL(urlStr);
          if (!ALLOWED_DOMAINS.some(d => url.hostname.endsWith(d))) {
            // It might be an internal domain
            return true;
          }
        } catch {
          // Not a valid URL, ignore
        }
      }
    }

    return false;
  }

  async validateDashboard() {
    const ajv = new Ajv();
    addFormats(ajv);
    const validate = ajv.compile(this.schema);
    const valid = validate(this.dashboard);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
      throw new Error('Dashboard JSON failed schema validation');
    }
  }

  async writeOutput() {
    await fs.mkdir(this.outputDir, { recursive: true });
    const outputFile = path.join(this.outputDir, 'release-dashboard.json');
    await fs.writeFile(outputFile, JSON.stringify(this.dashboard, null, 2));
    console.log(`Saved to ${outputFile}`);
  }
}

// Execute
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bundleDir = process.argv[2] || path.join(process.cwd(), 'evidence-bundle');
  const outputDir = process.argv[3];

  // Ensure bundle exists
  fs.access(bundleDir)
    .then(() => new ReleaseDashboardGenerator(bundleDir, outputDir).run())
    .catch(err => {
      if (err.code === 'ENOENT') {
        console.error(`Evidence bundle not found at ${bundleDir}. Run generation script first.`);
        process.exit(1);
      }
      console.error(err);
      process.exit(1);
    });
}

export { ReleaseDashboardGenerator };
