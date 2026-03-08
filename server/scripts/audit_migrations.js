"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHash = calculateHash;
exports.scanFile = scanFile;
exports.readMigrations = readMigrations;
exports.auditMigrations = auditMigrations;
exports.main = main;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const serverRoot = process.cwd().endsWith(`${path_1.default.sep}server`)
    ? process.cwd()
    : path_1.default.resolve(process.cwd(), 'server');
const DEFAULT_MIGRATIONS_DIR = path_1.default.resolve(serverRoot, 'db/migrations/postgres');
const DEFAULT_MANIFEST_PATH = path_1.default.join(DEFAULT_MIGRATIONS_DIR, 'manifest.json');
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
function calculateHash(content) {
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function scanFile(filepath, content) {
    const filename = path_1.default.basename(filepath);
    const result = { file: filename, errors: [], warnings: [] };
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        // 1. Skip if line is a comment or empty
        if (trimmed.startsWith('--') || trimmed.length === 0)
            return;
        // 2. Remove inline comments (e.g. "DROP TABLE x; -- comment") for checking
        const codePart = line.split('--')[0];
        // 3. Check for suppression (still allow suppression on previous line or same line in original content)
        // We check original 'line' for suppression tag
        if (line.includes('-- AUDIT: ALLOW DESTRUCTIVE'))
            return;
        if (line.includes('-- AUDIT: ALLOW CONTRACT'))
            return;
        // Look for suppression on previous line
        const prevLine = index > 0 ? lines[index - 1] : '';
        if (prevLine.includes('-- AUDIT: ALLOW DESTRUCTIVE') || prevLine.includes('-- AUDIT: ALLOW CONTRACT'))
            return;
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
function loadManifest(manifestPath) {
    if (!fs_1.default.existsSync(manifestPath)) {
        return {};
    }
    try {
        const raw = fs_1.default.readFileSync(manifestPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
            throw new Error('manifest.json must contain an object map of filename -> hash');
        }
        return parsed;
    }
    catch (e) {
        throw new Error(`Failed to parse manifest at ${manifestPath}: ${e.message}`);
    }
}
function persistManifest(manifestPath, manifest, logger) {
    const existingContent = fs_1.default.existsSync(manifestPath) ? fs_1.default.readFileSync(manifestPath, 'utf-8') : null;
    const tmpPath = `${manifestPath}.tmp`;
    try {
        fs_1.default.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
        fs_1.default.renameSync(tmpPath, manifestPath);
        logger.log(`Updated manifest at ${manifestPath}`);
    }
    catch (error) {
        if (existingContent !== null) {
            fs_1.default.writeFileSync(manifestPath, existingContent);
        }
        throw error;
    }
    finally {
        if (fs_1.default.existsSync(tmpPath)) {
            fs_1.default.rmSync(tmpPath);
        }
    }
}
function assertMigrationsDir(migrationsDir) {
    if (!fs_1.default.existsSync(migrationsDir)) {
        throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }
}
function readMigrations(migrationsDir) {
    assertMigrationsDir(migrationsDir);
    return fs_1.default.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
}
function auditFile(manifest, newManifest, file, migrationsDir, mode) {
    const filepath = path_1.default.join(migrationsDir, file);
    const content = fs_1.default.readFileSync(filepath, 'utf-8');
    const hash = calculateHash(content);
    const errors = [];
    const warnings = [];
    if (manifest[file]) {
        if (manifest[file] !== hash) {
            errors.push(`INTEGRITY ERROR: File ${file} has been modified!\n   Expected: ${manifest[file]}\n   Actual:   ${hash}\n   Modification of existing migrations is PROHIBITED.`);
        }
    }
    else if (mode === 'check') {
        errors.push(`MANIFEST ERROR: New migration file detected but not tracked: ${file}\n   Run with --update-manifest to acknowledge this file.`);
    }
    else {
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
async function auditMigrations(options = {}) {
    const mode = options.mode ?? 'check';
    const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
    const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST_PATH;
    const logger = options.logger ?? console;
    assertMigrationsDir(migrationsDir);
    logger.log(`Starting Migration Audit in ${mode.toUpperCase()} mode...`);
    logger.log(`Directory: ${migrationsDir}`);
    const files = readMigrations(migrationsDir);
    const manifest = loadManifest(manifestPath);
    const newManifest = { ...manifest };
    const seenFiles = new Set();
    const errors = [];
    const warnings = [];
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
    }
    else {
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
async function main(args = process.argv.slice(2)) {
    const mode = args.includes('--update-manifest') ? 'update' : 'check';
    try {
        const result = await auditMigrations({ mode });
        result.warnings.forEach((w) => console.warn(`⚠️  ${w}`));
        if (result.hasError) {
            result.errors.forEach((e) => console.error(`❌ ${e}`));
            console.error('❌ Audit FAILED.');
            process.exit(1);
        }
        console.log(mode === 'update' ? '✅ Manifest updated successfully.' : '✅ Audit PASSED.');
    }
    catch (err) {
        console.error(`❌ Audit failed with error: ${err.message}`);
        process.exit(1);
    }
}
const isDirectInvocation = process.argv[1]?.endsWith('audit_migrations.ts');
if (isDirectInvocation) {
    main();
}
