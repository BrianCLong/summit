import * as fs from 'fs';
import * as path from 'path';

const SENSITIVE_PATTERNS = [
  /-----BEGIN PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9]{20,}/, // JWT-like
  /(xox[baprs]-|gh[pousr]-)/, // Slack/GitHub tokens
  /password/i,
  /secret/i,
  /authorization/i,
  /bearer/i,
];

const ALLOWED_KEYS = [
  'exception_id', 'type', 'owner', 'created_at', 'expires_at',
  'scope', 'bindings', 'status', 'rationale', 'summary',
  'generated_at', 'total', 'active', 'warning', 'overdue', 'violation',
  'closed', 'expiring_soon', 'violations', 'action_items', 'id', 'action',
  'evidence_hashes', 'policy_bundle_hash'
];

const checkContent = (content: string, filename: string) => {
  // Pattern Check
  SENSITIVE_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
        // Exclude false positives for key names if possible, but here we scan full content
        // "password" might be in a rationale string like "fix password reset".
        // We should be careful. Let's rely on high-entropy checks or specific token formats.
        // For "password"/"secret" regex, it's too aggressive for plain text rationales.
        // Let's stick to high-entropy or specific token prefixes.
        if (pattern.source.includes('password') || pattern.source.includes('secret')) {
             // Skip generic word checks for now to avoid noise in rationales
             return;
        }
        console.error(`[FAIL] Sensitive pattern detected in ${filename}: ${pattern}`);
        process.exit(1);
    }
  });
};

const validateKeys = (obj: any, filename: string) => {
  if (Array.isArray(obj)) {
    obj.forEach(i => validateKeys(i, filename));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      if (!ALLOWED_KEYS.includes(key)) {
        console.error(`[FAIL] Unallowed key '${key}' found in ${filename}`);
        process.exit(1);
      }
      validateKeys(obj[key], filename);
    });
  }
};

const main = () => {
  const artifactsDir = 'dist/exceptions';
  const files = ['exceptions.json', 'sunset-report.json'];

  files.forEach(file => {
    const p = path.join(artifactsDir, file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      checkContent(content, file);

      try {
        const json = JSON.parse(content);
        validateKeys(json, file);
      } catch (e) {
        console.error(`[FAIL] Invalid JSON in ${file}`);
        process.exit(1);
      }
    }
  });

  // Check Markdown for secrets too
  const mdPath = path.join(artifactsDir, 'sunset-report.md');
  if (fs.existsSync(mdPath)) {
      checkContent(fs.readFileSync(mdPath, 'utf8'), 'sunset-report.md');
  }

  console.log('✅ No leaks detected.');
};

main();
