import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const serverRoot = process.cwd().endsWith(`${path.sep}server`)
  ? process.cwd()
  : path.resolve(process.cwd(), 'server');
const DEFAULT_MIGRATIONS_DIR = path.resolve(serverRoot, 'db/migrations/postgres');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_MIGRATIONS_DIR, 'manifest.json');

export type Manifest = Record<string, string>; // filename -> sha256 hash

interface AuditResult {
  file: string;
  errors: string[];
  warnings: string[];
}

export type AuditMode = 'check' | 'update';

export interface AuditOptions {
  mode?: AuditMode;
  migrationsDir?: string;
  manifestPath?: string;
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

export interface AuditSummary {
  mode: AuditMode;
  hasError: boolean;
  errors: string[];
  warnings: string[];
  manifest: Manifest;
}

const DESTRUCTIVE_REGEX = [
  { pattern: /\bDROP\s+(TABLE|COLUMN|DATABASE|SCHEMA|VIEW|INDEX)\b/i, message: 'Destructive DROP detected' },
  { pattern: /\bTRUNCATE\b/i, message: 'Destructive TRUNCATE detected' },
  { pattern: /\bDELETE\s+FROM\b/i, message: 'Destructive DELETE detected' },
  { pattern: /\bALTER\s+TABLE\s+.*\s+DROP\s+/i, message: 'Destructive ALTER DROP detected' },
];

const CONTRACT_REGEX = [
  {
    pattern: /\bALTER\s+TABLE\s+.*\s+RENAME\s+/i,
    message: 'RENAME COLUMN detected. This breaks existing code. Use Expand/Contract pattern.',
  },
];

export function calculateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function scanFile(filepath: string, content: string): AuditResult {
  const filename = path.basename(filepath);
  const result: AuditResult = { file: filename, errors: [], warnings: [] };
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // 1. Skip if line is a comment or empty
    if (trimmed.startsWith('--') || trimmed.length === 0) return;

    // 2. Remove inline comments (e.g. "DROP TABLE x; -- comment") for checking
    const codePart = line.split('--')[0];

    // 3. Check for suppression (still allow suppression on previous line or same line in original content)
    // We check original 'line' for suppression tag
    if (line.includes('-- AUDIT: ALLOW DESTRUCTIVE')) return;
    if (line.includes('-- AUDIT: ALLOW CONTRACT')) return;

    // Look for suppression on previous line
    const prevLine = index > 0 ? lines[index - 1] : '';
    if (prevLine.includes('-- AUDIT: ALLOW DESTRUCTIVE') || prevLine.includes('-- AUDIT: ALLOW CONTRACT')) return;

    // Check Destructive on the code part
    for (const rule of DESTRUCTIVE_REGEX) {
      if (rule.pattern.test(codePart)) {
        result.errors.push(`Line ${index + 1}: ${rule.message}. Use '-- AUDIT: ALLOW DESTRUCTIVE' to suppress.`);
      }
    }

    // Check Contract on the code part
    for (const rule of CONTRACT_REGEX) {
      if (rule.pattern.test(codePart)) {
        result.errors.push(`Line ${index + 1}: ${rule.message}. Use '-- AUDIT: ALLOW CONTRACT' to suppress.`);
      }
    }
  });

  return result;
}

function loadManifest(manifestPath: string): Manifest {
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      throw new Error('manifest.json must contain an object map of filename -> hash');
    }
    return parsed as Manifest;
  } catch (e) {
    throw new Error(`Failed to parse manifest at ${manifestPath}: ${(e as Error).message}`);
  }
}

function persistManifest(manifestPath: string, manifest: Manifest, logger: Pick<Console, 'log'>) {
  const existingContent = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf-8') : null;
  const tmpPath = `${manifestPath}.tmp`;

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
    fs.renameSync(tmpPath, manifestPath);
    logger.log(`Updated manifest at ${manifestPath}`);
  } catch (error) {
    if (existingContent !== null) {
      fs.writeFileSync(manifestPath, existingContent);
    }
    throw error;
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath);
    }
  }
}

function assertMigrationsDir(migrationsDir: string) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }
}

export function readMigrations(migrationsDir: string): string[] {
  assertMigrationsDir(migrationsDir);
  return fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql')).sort();
}

function auditFile(manifest: Manifest, newManifest: Manifest, file: string, migrationsDir: string, mode: AuditMode) {
  const filepath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filepath, 'utf-8');
  const hash = calculateHash(content);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest[file]) {
    if (manifest[file] !== hash) {
      errors.push(
        `INTEGRITY ERROR: File ${file} has been modified!\n   Expected: ${manifest[file]}\n   Actual:   ${hash}\n   Modification of existing migrations is PROHIBITED.`,
      );
    }
  } else if (mode === 'check') {
    errors.push(`MANIFEST ERROR: New migration file detected but not tracked: ${file}\n   Run with --update-manifest to acknowledge this file.`);
  } else {
    warnings.push(`New migration file detected: ${file}`);
    newManifest[file] = hash;
  }

  const audit = scanFile(filepath, content);
  if (audit.errors.length > 0) {
    errors.push(`RULE VIOLATION: ${file}\n${audit.errors.map((e) => `   ${e}`).join('\n')}`);
  }
  if (audit.warnings.length > 0) {
    warnings.push(`WARNING: ${file}\n${audit.warnings.map((w) => `   ${w}`).join('\n')}`);
  }

  return { errors, warnings };
}

export async function auditMigrations(options: AuditOptions = {}): Promise<AuditSummary> {
  const mode: AuditMode = options.mode ?? 'check';
  const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST_PATH;
  const logger = options.logger ?? console;

  assertMigrationsDir(migrationsDir);

  logger.log(`Starting Migration Audit in ${mode.toUpperCase()} mode...`);
  logger.log(`Directory: ${migrationsDir}`);

  const files = readMigrations(migrationsDir);
  const manifest = loadManifest(manifestPath);
  const newManifest: Manifest = { ...manifest };
  const seenFiles = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    seenFiles.add(file);
    const { errors: fileErrors, warnings: fileWarnings } = auditFile(manifest, newManifest, file, migrationsDir, mode);
    errors.push(...fileErrors);
    warnings.push(...fileWarnings);
  }

  if (mode === 'check') {
    for (const file of Object.keys(manifest)) {
      if (!seenFiles.has(file)) {
        errors.push(`MANIFEST ERROR: Migration file missing: ${file}`);
      }
    }
  } else {
    for (const file of Object.keys(newManifest)) {
      if (!seenFiles.has(file)) {
        warnings.push(`Migration file removed from manifest: ${file}`);
        delete newManifest[file];
      }
    }
  }

  if (mode === 'update' && errors.length === 0) {
    persistManifest(manifestPath, newManifest, logger);
  }

  return {
    mode,
    hasError: errors.length > 0,
    errors,
    warnings,
    manifest: mode === 'update' && errors.length === 0 ? newManifest : manifest,
  };
}

export async function main(args = process.argv.slice(2)) {
  const mode: AuditMode = args.includes('--update-manifest') ? 'update' : 'check';

  try {
    const result = await auditMigrations({ mode });

    result.warnings.forEach((w) => console.warn(`⚠️  ${w}`));

    if (result.hasError) {
      result.errors.forEach((e) => console.error(`❌ ${e}`));
      console.error('❌ Audit FAILED.');
      process.exit(1);
    }

    console.log(mode === 'update' ? '✅ Manifest updated successfully.' : '✅ Audit PASSED.');
  } catch (err) {
    console.error(`❌ Audit failed with error: ${(err as Error).message}`);
    process.exit(1);
  }
}

const isDirectInvocation = process.argv[1]?.endsWith('audit_migrations.ts');
if (isDirectInvocation) {
  main();
}
