import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// CLI Arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const FILE_PATH = getArg('file', 'docs/ga/EXCEPTIONS.yml');
const OUT_DIR = getArg('out', 'artifacts/governance/exceptions'); // Will append sha later if needed or rely on input
const SHA = getArg('sha', process.env.GITHUB_SHA || 'HEAD');
const TIMESTAMP = new Date().toISOString();
const TODAY = new Date().toISOString().split('T')[0];

// Schema Definition
const exceptionSchema = z.object({
  id: z.string().regex(/^EX-\d{4}$/, "ID must match EX-####"),
  title: z.string().min(1),
  category: z.enum(['secrets', 'licenses', 'vulns', 'governance', 'ci', 'compat']),
  severity: z.enum(['low', 'med', 'high']),
  owner: z.string().min(1),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rationale: z.string().min(1),
  mitigation: z.string().optional(),
  follow_up_issue: z.string().url(),
  scope: z.object({
    paths: z.array(z.string()).optional(),
    rule_ids: z.array(z.string()).optional(),
    environments: z.array(z.string()).optional(),
  }).optional(),
  signoff: z.object({
    security: z.string().optional(),
    release_captain: z.string().optional(),
    date: z.string().optional(),
  }).optional(),
}).refine(data => {
  if (data.severity === 'high' && (!data.signoff?.security)) {
    return false;
  }
  return true;
}, { message: "High severity requires security signoff", path: ['signoff', 'security'] });

const fileSchema = z.object({
  schema_version: z.string(),
  policy: z.object({
    expiring_soon_days: z.number().int().min(0).default(14),
  }).optional(),
  exceptions: z.array(exceptionSchema),
});

async function main() {
  try {
    // 1. Load File
    const absolutePath = path.resolve(process.cwd(), FILE_PATH);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${FILE_PATH}`);
    }
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const data = yaml.load(fileContent);

    // 2. Validate Schema
    const result = fileSchema.safeParse(data);
    if (!result.success) {
      console.error("Schema Validation Failed:");
      console.error(JSON.stringify(result.error.format(), null, 2));
      process.exit(1);
    }

    const { exceptions, policy } = result.data;
    const expiringSoonDays = policy?.expiring_soon_days ?? 14;

    // Check for Duplicate IDs
    const ids = exceptions.map(e => e.id);
    const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.error(`Duplicate IDs found: ${duplicates.join(', ')}`);
      process.exit(1);
    }

    // 3. Enforce Expiry
    const failures = [];
    const warnings = [];
    const now = new Date();
    // Reset time part to compare dates only
    now.setHours(0, 0, 0, 0);

    const sortedExceptions = [...exceptions].sort((a, b) => a.id.localeCompare(b.id));

    for (const ex of sortedExceptions) {
      const expiresDate = new Date(ex.expires);
      expiresDate.setHours(0, 0, 0, 0);

      // Check Expiry
      if (expiresDate < now) {
        failures.push({
          id: ex.id,
          msg: `Expired on ${ex.expires}`
        });
      } else {
        // Check Expiring Soon
        const daysUntilExpiry = (expiresDate - now) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry <= expiringSoonDays) {
          warnings.push({
            id: ex.id,
            msg: `Expires in ${Math.ceil(daysUntilExpiry)} days (${ex.expires})`
          });
        }
      }
    }

    // 4. Generate Outputs
    // Ensure output directory exists (handle SHA in path if needed, but for now use OUT_DIR directly or append SHA)
    // The requirement says: --out artifacts/governance/exceptions/<sha>/
    // So if user passed that, we use it. If user passed generic dir, we might want to append.
    // However, the prompt usage implies the caller sets the full path.
    // Let's assume OUT_DIR includes the SHA if the caller formatted it that way.
    // If we want to strictly follow "Behavior: --out artifacts/governance/exceptions/<sha>/",
    // we should probably check if we need to append SHA.
    // But let's respect the `out` argument exactly.

    // Resolve output dir
    // If SHA is not in the path and we want to follow convention, we might need to adjust.
    // But let's assume the caller provides the full path as per prompt: "--out artifacts/governance/exceptions/<sha>/"

    // But if we run this locally, SHA might be 'HEAD' or similar.
    // Let's ensure the dir exists.
    let finalOutDir = OUT_DIR;
    // If SHA is passed and not in path, maybe append?
    // The prompt says: "--out artifacts/governance/exceptions/<sha>/"
    // I will assume the caller is responsible for constructing the path with SHA,
    // OR I should construct it.
    // Let's try to detect if it ends with a SHA-looking string.
    // Actually, simpler is to just use OUT_DIR as is, creating it.

    // Actually, prompt says: "--out artifacts/governance/exceptions/<sha>/" as an input example.
    // I will use OUT_DIR as the base.

    // Wait, standard practice for these scripts:
    // User runs: verify_exceptions_register.mjs --out artifacts/governance/exceptions/<sha>/

    if (!fs.existsSync(finalOutDir)) {
      fs.mkdirSync(finalOutDir, { recursive: true });
    }

    // Report JSON
    const report = {
      timestamp: TIMESTAMP,
      sha: SHA,
      status: failures.length > 0 ? 'FAIL' : 'PASS',
      stats: {
        total: exceptions.length,
        expired: failures.length,
        expiring_soon: warnings.length,
      },
      failures,
      warnings,
      exceptions: sortedExceptions,
    };

    fs.writeFileSync(path.join(finalOutDir, 'report.json'), JSON.stringify(report, null, 2));

    // Report MD
    let md = `# Exception Register Report\n\n`;
    md += `**Status**: ${report.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`;
    md += `**SHA**: \`${SHA}\`\n`;
    md += `**Timestamp**: ${TIMESTAMP}\n\n`;

    if (failures.length > 0) {
      md += `## ❌ Failures (Expired)\n`;
      for (const f of failures) {
        const ex = exceptions.find(e => e.id === f.id);
        md += `- **${f.id}** (${ex.title}): ${f.msg} (Owner: ${ex.owner})\n`;
      }
      md += `\n`;
    }

    if (warnings.length > 0) {
      md += `## ⚠️ Expiring Soon (< ${expiringSoonDays} days)\n`;
      for (const w of warnings) {
        const ex = exceptions.find(e => e.id === w.id);
        md += `- **${w.id}** (${ex.title}): ${w.msg} (Owner: ${ex.owner})\n`;
      }
      md += `\n`;
    }

    md += `## Active Exceptions\n`;
    md += `| ID | Title | Category | Severity | Expires | Owner |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const ex of sortedExceptions) {
      const statusIcon = failures.find(f => f.id === ex.id) ? '❌ ' : (warnings.find(w => w.id === ex.id) ? '⚠️ ' : '');
      md += `| ${ex.id} | ${ex.title} | ${ex.category} | ${ex.severity} | ${statusIcon}${ex.expires} | ${ex.owner} |\n`;
    }

    fs.writeFileSync(path.join(finalOutDir, 'report.md'), md);

    // Stamp JSON
    const registerHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    const reportHash = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');

    const stamp = {
      status: report.status,
      sha: SHA,
      register_hash: registerHash,
      report_hash: reportHash,
      timestamp: TIMESTAMP
    };

    fs.writeFileSync(path.join(finalOutDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

    console.log(`Verification complete. Report saved to ${finalOutDir}`);

    if (failures.length > 0) {
      console.error("Verification FAILED: Expired exceptions found.");
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error("Operational Error:", error);
    process.exit(2);
  }
}

main();
