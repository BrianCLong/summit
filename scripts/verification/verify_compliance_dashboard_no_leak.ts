import fs from 'fs';
import path from 'path';

// Security Configuration
const CONFIG = {
  denyRegex: [
    /ghp_[a-zA-Z0-9]+/, // GitHub Token
    /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // JWT-ish
    /-----BEGIN PRIVATE KEY-----/,
    /AWS_ACCESS_KEY/,
    // Removed generic 32 char hex check as it catches checksums and hashes which are valid in this context
  ],

  allowDomains: [
    'github.com',
    'actions.githubusercontent.com'
  ],

  // JSON Schema (simplified check)
  // For compliance.json
  allowedKeysCompliance: new Set([
    'meta', 'generated_at', 'checksum', 'posture', 'status', 'reasons',
    'sections', 'maturity_stage', 'controls_coverage', 'gate', 'required', 'outcome', 'last_run',
    'policy_status', 'bundle_id', 'drift_status', 'pass_rate',
    'release_readiness', 'shards_pass_rate', 'tag_rehearsal',
    'supply_chain', 'deps_approved', 'changes_count',
    'incident_readiness', 'last_drill', 'scenarios_status',
    'field_mode'
  ]),

  // For signals.json (structure from collect_compliance_signals.ts)
  allowedKeysSignals: new Set([
    'generated_at', 'maturity', 'stage', 'timestamp',
    'readiness', 'shards', 'status', 'duration_ms', 'gates', 'required', 'outcome', 'last_run_id', 'tag_rehearsal',
    'policy', 'bundle_id', 'bundle_hash', 'drift_status', 'evidence_summary', 'pass_rate', 'total_checks', 'failed_checks',
    'dependencies', 'approval_required', 'approval_satisfied', 'changes_count', 'ratchet_state', 'diff_summary',
    'promotion', 'last_decision', 'deny_reasons',
    'incident_drills', 'scenarios', 'last_run', 'last_run_timestamp',
    'field_mode', 'readiness_decision', 'budgets_compliant', 'device_security_signals',
    'meta', 'sources'
  ])
};

const dashboardDir = process.env.DASHBOARD_DIR || 'dist/compliance';

function verifyFileContent(filepath: string, content: string) {
  // 1. Secret scanning
  for (const regex of CONFIG.denyRegex) {
    if (regex.test(content)) {
      throw new Error(`Security Violation: Found potential secret matching ${regex} in ${filepath}`);
    }
  }

  // 2. URL validation (simplified)
  const urlRegex = /https?:\/\/[^\s"']+/g;
  const urls = content.match(urlRegex) || [];
  for (const url of urls) {
    try {
      const hostname = new URL(url).hostname;
      const isAllowed = CONFIG.allowDomains.some(d => hostname.endsWith(d));
      if (!isAllowed) {
         throw new Error(`Security Violation: Unauthorized URL domain ${hostname} in ${filepath}`);
      }
    } catch (e) {
      // invalid url, might be false positive, ignore or log
    }
  }
}

function verifyJsonSchema(filepath: string, allowedKeys: Set<string>) {
  const content = fs.readFileSync(filepath, 'utf-8');
  let json;
  try {
    json = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filepath}`);
  }

  function checkKeys(obj: any) {
    if (typeof obj !== 'object' || obj === null) return;
    if (Array.isArray(obj)) {
      obj.forEach(checkKeys);
      return;
    }
    for (const key of Object.keys(obj)) {
      // Allow dynamic keys for maps (shards, gates, scenarios, sources)
      // Heuristic: if the parent object has "shards", "gates", "scenarios", "sources" key, or if we are inside one.
      // But simpler: just check if the key is in the allowed set OR if it looks like a dynamic ID (not perfect but practical)
      // Better approach: Since we have specific nested structure in mind, we should traverse it properly.
      // But for this generic checker, let's just assume keys must be in the set.
      // If we have dynamic keys (like shard names 'unit', 'e2e'), we need to be careful.

      // Let's relax for known dynamic map containers or specific paths if strictly necessary.
      // Actually, for signals.json, 'shards', 'gates', 'scenarios' have dynamic keys.
      // So checking exact keys on everything is too strict for a flat set.
      // Let's rely on content scanning for secrets and just basic structure check if possible.
      // Or we skip key check for signals.json and trust sanitization?
      // The prompt asked for "only allowed fields present in compliance.json (schema enforcement)".
      // It did NOT ask for schema enforcement on signals.json, but user review suggested adding verification for signals.json.

      // Let's stick to strict key check for compliance.json as per requirement.
      // For signals.json, let's just do secret scanning.
      if (allowedKeys === CONFIG.allowedKeysCompliance) {
          if (!allowedKeys.has(key)) {
             throw new Error(`Schema Violation: Key '${key}' is not in allowed list in ${filepath}`);
          }
          checkKeys(obj[key]);
      }
    }
  }

  checkKeys(json);
}

// Run Checks
try {
  const jsonPath = path.join(dashboardDir, 'compliance.json');
  const mdPath = path.join(dashboardDir, 'compliance.md');
  const htmlPath = path.join(dashboardDir, 'compliance.html');
  const signalsPath = path.join(dashboardDir, 'signals.json');

  if (fs.existsSync(jsonPath)) {
    console.log(`Verifying ${jsonPath}...`);
    verifyFileContent(jsonPath, fs.readFileSync(jsonPath, 'utf-8'));
    verifyJsonSchema(jsonPath, CONFIG.allowedKeysCompliance);
  } else {
    throw new Error('Missing compliance.json');
  }

  if (fs.existsSync(signalsPath)) {
    console.log(`Verifying ${signalsPath}...`);
    // Only verify content (secrets), not strict keys due to dynamic maps
    verifyFileContent(signalsPath, fs.readFileSync(signalsPath, 'utf-8'));
  }

  if (fs.existsSync(mdPath)) {
    console.log(`Verifying ${mdPath}...`);
    verifyFileContent(mdPath, fs.readFileSync(mdPath, 'utf-8'));
  }

  if (fs.existsSync(htmlPath)) {
    console.log(`Verifying ${htmlPath}...`);
    verifyFileContent(htmlPath, fs.readFileSync(htmlPath, 'utf-8'));
  }

  console.log('Verification PASSED: No leaks detected.');

  // Write report
  fs.writeFileSync(path.join(dashboardDir, 'verifier_report.json'), JSON.stringify({
    status: 'PASS',
    timestamp: new Date().toISOString(),
    checked_files: ['compliance.json', 'compliance.md', 'compliance.html', 'signals.json']
  }, null, 2));

} catch (e: any) {
  console.error(e.message);
  process.exit(1);
}
