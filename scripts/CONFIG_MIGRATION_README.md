# Configuration Migration Tools - Quick Start

This directory contains automated tools to help migrate from the legacy fragmented configuration to the unified configuration approach.

## 🚀 Quick Start

### 1. Run Detection Script

First, analyze your current configuration to understand what needs to be cleaned up:

```bash
# Generate baseline analysis
python3 scripts/config-analyzer.py --format text --output config-baseline.txt

# Review the report
cat config-baseline.txt
```

This will show you:
- Unused configuration keys
- Missing keys (referenced in code but not defined)
- Duplicate keys across multiple files
- Deprecated configuration patterns

### 2. Run Migration Script (Dry Run First!)

**ALWAYS run with --dry-run first** to see what would change:

```bash
# Dry run - shows what would happen without making changes
./scripts/migrate-config.sh --dry-run

# Review the output carefully
```

### 3. Execute Migration

Once you're comfortable with the dry run output:

```bash
# Run the actual migration
./scripts/migrate-config.sh

# This will:
# - Create a backup in .config-backup-TIMESTAMP/
# - Merge nested .env files into root .env
# - Migrate deprecated keys (NEO4J_USERNAME → NEO4J_USER)
# - Mark old files as .deprecated
# - Validate the merged configuration
```

### 4. Test Your Application

```bash
# Test that the application still works
cd server
pnpm dev

# You should see deprecation warnings if any old keys are in use
# Example:
# ⚠️  DEPRECATED: NEO4J_USERNAME
#    Please migrate to: NEO4J_USER
#    Deprecated since: Q4 2024
#    Will be removed in: Q2 2025
```

### 5. Update and Clean Up

If everything works:

```bash
# Remove deprecated files
rm server/.env.deprecated
rm server/.env.production.deprecated

# Commit the changes
git add .env server/src/config/
git commit -m "refactor: Consolidate configuration to root .env"
```

## 📁 Tools Included

### `config-analyzer.py`

Python script that scans your entire codebase for configuration issues.

**Usage:**
```bash
python3 scripts/config-analyzer.py [options]

Options:
  --root DIR            Root directory to scan (default: current dir)
  --output FILE         Output file path (default: config-analysis-report.txt)
  --format FORMAT       Output format: text|markdown|json (default: text)
```

**Example:**
```bash
# Generate markdown report for documentation
python3 scripts/config-analyzer.py \
  --format markdown \
  --output docs/config-analysis.md
```

### `migrate-config.sh`

Bash script that automatically merges and migrates configuration files.

**Usage:**
```bash
./scripts/migrate-config.sh [options]

Options:
  --dry-run            Show what would be done without making changes
  --environment ENV    Specify environment: dev|staging|prod (default: dev)
  --help, -h           Show help message
```

**Example:**
```bash
# Dry run for staging environment
./scripts/migrate-config.sh --dry-run --environment staging

# Execute migration for production
./scripts/migrate-config.sh --environment prod
```

## 🔧 Manual Migration

If you prefer to migrate manually:

### Step 1: Merge Environment Files

```bash
# Compare root and server .env files
diff .env server/.env

# Manually merge unique keys from server/.env into .env
# Remove duplicates (keep the value you want)
```

### Step 2: Update Deprecated Keys

Replace these keys in your `.env` file:

| Old Key (Deprecated) | New Key (Current) |
|---------------------|-------------------|
| `NEO4J_USERNAME` | `NEO4J_USER` |
| `POSTGRES_URL` | `DATABASE_URL` |

```bash
# Use sed to replace (backup first!)
cp .env .env.backup
sed -i 's/NEO4J_USERNAME=/NEO4J_USER=/g' .env
sed -i 's/POSTGRES_URL=/DATABASE_URL=/g' .env
```

### Step 3: Remove Nested Config Files

```bash
# Move nested files (don't delete yet - keep as backup)
mv server/.env server/.env.deprecated
mv server/.env.production server/.env.production.deprecated
```

### Step 4: Validate

```bash
cd server
pnpm exec tsx -e "import { cfg } from './src/config'; console.log('Config loaded:', Object.keys(cfg).length, 'keys')"
```

## 🔄 Automatic Deprecation Warnings

The updated `server/src/config.ts` now includes automatic deprecation warnings:

### How It Works

1. On startup, config loader checks for deprecated keys
2. If found, shows clear warning messages
3. Automatically migrates old keys to new keys
4. Fails fast in production if conflicting values exist

### Example Warning Output

```
================================================================================
⚠️  DEPRECATED CONFIGURATION DETECTED
================================================================================

⚠️  DEPRECATED: NEO4J_USERNAME
   Using deprecated key NEO4J_USERNAME
   Please migrate to: NEO4J_USER
   Deprecated since: Q4 2024
   Will be removed in: Q2 2025
   Migration: Rename NEO4J_USERNAME to NEO4J_USER in your .env file

================================================================================
Total deprecated keys in use: 1
Configuration conflicts: 0
================================================================================
```

### Adding New Deprecated Keys

Edit `server/src/config/deprecated.ts`:

```typescript
export const DEPRECATED_KEYS: DeprecatedKey[] = [
  {
    oldKey: 'OLD_KEY_NAME',
    newKey: 'NEW_KEY_NAME',
    deprecatedSince: 'Q1 2025',
    removeIn: 'Q3 2025',
    migration: 'Rename OLD_KEY_NAME to NEW_KEY_NAME in your .env file',
  },
  // ... existing entries
];
```

Then update `server/src/config.ts` to migrate the key:

```typescript
migrateDeprecatedKey('OLD_KEY_NAME', 'NEW_KEY_NAME');
```

## 📊 Understanding the Analysis Report

### Unused Keys
Keys defined in config files but never referenced in code. **Safe to remove** after verification.

```
🗑️  UNUSED KEYS
  • OLD_FEATURE_FLAG
    Defined in: .env:45
    Value: true
```

**Action:** Remove from `.env` unless you plan to use it soon.

### Missing Keys
Keys referenced in code but not defined in any config file. **Must be added** to `.env.example` and `.env`.

```
🚨 MISSING KEYS
  • MAESTRO_API_TOKEN
    Used in: server/src/maestro/client.ts:23
```

**Action:** Add to `.env`:
```bash
MAESTRO_API_TOKEN=your_token_here
```

### Duplicate Keys
Same key defined in multiple config files. **Can cause confusion** about which value is used.

```
⚠️  DUPLICATE KEYS
  • DATABASE_URL (3 definitions)
    - .env:10 → postgresql://localhost/dev
    - server/.env:8 → postgresql://localhost/server_dev
    - .env.production:12 → postgresql://prod.db/app
```

**Action:** Keep only one definition (in root `.env` and `.env.production`).

### Deprecated Patterns
Old configuration patterns that should be migrated.

```
🔄 DEPRECATED PATTERNS
  • NEO4J_USERNAME → NEO4J_USER
    Found in: server/src/db/neo4j.ts:15
    Action: Rename NEO4J_USERNAME to NEO4J_USER
```

**Action:** Update your `.env` file and code to use the new key name.

## 🧪 Testing

Run the test suite to ensure config migration works correctly:

```bash
cd server
pnpm test src/config/deprecated.test.ts
```

## 📚 Documentation

- **Complete Migration Guide:** `docs/CONFIG_CLEANUP_GUIDE.md`
- **Executive Summary:** `CONFIGURATION_CLEANUP_SUMMARY.md`
- **Cleaned Config Template:** `config/env.example.cleaned`

## 🆘 Troubleshooting

### Migration script fails with "Config validation failed"

**Cause:** Missing required environment variables after migration.

**Solution:**
1. Check the error message for which keys are missing
2. Compare your `.env` with `config/env.example.cleaned`
3. Add missing required keys

### Deprecation warning in production

**Cause:** Using old key names that will be removed soon.

**Solution:**
1. Update your `.env.production` file to use new key names
2. Redeploy the application

### Both old and new keys exist with different values

**Cause:** Configuration conflict - same setting defined twice with different values.

**Solution:**
1. In development: Remove the old key (warning only)
2. In production: Application will exit with error - must fix before deploying

### Tests failing after migration

**Cause:** Test environment variables not updated.

**Solution:**
1. Update `server/.env.test` or test setup files
2. Update CI/CD environment variable configuration

## 🔐 Security Notes

- **Never commit** `.env` files with real secrets
- **Always use** `.env.example` as a template
- **Generated secrets** must be at least 32 characters in production
- **Production validation** enforces HTTPS and rejects `localhost` origins
- **Backup files** created by migration script may contain secrets - delete after verification

## 🚢 Deployment Checklist

Before deploying the migrated configuration:

- [ ] Run analysis script and review report
- [ ] Run migration script with `--dry-run`
- [ ] Execute migration and verify backup created
- [ ] Test application locally
- [ ] Run full test suite
- [ ] Update deployment scripts/docs
- [ ] Deploy to staging first
- [ ] Monitor for deprecation warnings
- [ ] Deploy to production
- [ ] Clean up deprecated files after 1 week

## 📞 Support

- **Documentation:** `docs/CONFIG_CLEANUP_GUIDE.md`
- **Issues:** Report configuration issues to the platform team
- **Questions:** Check the complete migration guide for detailed answers

---

**Last Updated:** 2025-11-20
**Maintained By:** Platform Team
