# Configuration Cleanup & Migration Guide

**Date:** 2025-11-20
**Status:** Proposed
**Owner:** Platform Team

---

## Executive Summary

This guide addresses the **legacy configuration fragmentation** in the Summit platform. Through analysis, we identified multiple competing configuration patterns that create risk, confusion, and maintenance overhead.

**Key Issues:**
- 4 different config loaders in the same codebase
- Duplicate environment variables with unclear precedence
- Inconsistent validation approaches (Zod, AJV, none)
- Legacy files not cleaned up after migrations
- Missing documentation on config loading order

**Solution:** Consolidate to a **single, type-safe configuration approach** using Zod validation with clear override strategies.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Detection Approach](#detection-approach)
3. [Cleanup Strategy](#cleanup-strategy)
4. [Migration Steps](#migration-steps)
5. [Testing Plan](#testing-plan)
6. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### Configuration Formats

| Format | Location | Validation | Status |
|--------|----------|-----------|--------|
| `.env` files | Root + server + apps | None/Zod | ✅ Keep |
| YAML | `config/*.yaml` | AJV | ⚠️ Selective |
| JSON | `config/*.json` | None | ⚠️ Selective |
| TypeScript | Various `config.ts` | Zod/None | ✅ Consolidate |

### Identified Issues

#### Issue 1: Multiple Config Loaders (CRITICAL)

**Problem:** 4 different configuration loading mechanisms in `server/`:

```
server/config.ts              → YAML + AJV validation + hot-reload
server/src/config.ts          → Zod + dotenv ✅ RECOMMENDED
server/src/config/index.ts    → dotenv + TypeScript interfaces
server/src/config/index.js    → CommonJS legacy version
```

**Risk:**
- Unclear which config takes precedence
- Race conditions on startup
- Type safety inconsistencies
- Maintenance burden

**Resolution:** Keep only `server/src/config.ts` with Zod validation.

#### Issue 2: Duplicate Environment Variables

**Problem:** Same configuration with different names:

| Old Name | New Name | Status |
|----------|----------|--------|
| `NEO4J_USERNAME` | `NEO4J_USER` | Deprecated Q4 2024 |
| `POSTGRES_URL` | `DATABASE_URL` | Standardize |

**Detection Script Output:**
```bash
⚠️  Found duplicate: NEO4J_USERNAME and NEO4J_USER both set
    Action: Remove NEO4J_USERNAME, use only NEO4J_USER
```

#### Issue 3: Validation Inconsistency

**Problem:** Three different validation approaches:

| Validator | Files | Type Safety | Runtime Validation |
|-----------|-------|-------------|-------------------|
| Zod | `server/src/config.ts` | ✅ Yes | ✅ Yes |
| AJV | `server/config.ts` | ❌ No | ✅ Yes |
| None | App configs | ❌ No | ❌ No |

**Resolution:** Use Zod throughout for unified type safety and validation.

#### Issue 4: Multiple .env Files with Unclear Precedence

**Problem:**
```
.env
.env.example
.env.production
.env.production.template
.env.rehydrated
.env.production.rehydrated
server/.env
server/.env.example
server/.env.production
```

**Resolution:**
- Root `.env` for development
- Root `.env.production` for production
- Single `.env.example` as template
- Remove nested `server/.env` files
- Document `.rehydrated` purpose or remove

---

## Detection Approach

### Automated Analysis Script

We've created `scripts/config-analyzer.py` to detect:

1. **Keys defined but never used** → Remove safely
2. **Keys referenced but not defined** → Add to .env.example
3. **Duplicate keys across files** → Consolidate
4. **Deprecated patterns** → Migrate

### Detection Methodology

#### 1. Static Code Analysis

```python
# Extract config definitions
- Parse .env files → KEY=value pairs
- Parse YAML files → nested keys (converted to ENV_VAR_STYLE)
- Parse JSON files → nested keys
- Extract Zod schemas → validated keys

# Extract config usage
- Search for process.env.KEY_NAME
- Search for cfg.keyName, config.keyName
- Check Zod schema references
- Scan distributed config service calls
```

#### 2. Cross-Reference

```
UNUSED = DEFINED - USED
MISSING = USED - DEFINED
DUPLICATES = DEFINED with count > 1
```

#### 3. Output Report

The script generates three report formats:
- **Text:** Human-readable for review
- **Markdown:** For documentation
- **JSON:** For automation/CI integration

### Running the Detection Script

```bash
# Install dependencies
pip3 install pyyaml

# Run analysis
python3 scripts/config-analyzer.py --root . --output config-report.txt --format text

# Or generate Markdown for docs
python3 scripts/config-analyzer.py --format markdown --output docs/config-analysis.md

# Or JSON for CI/CD
python3 scripts/config-analyzer.py --format json --output config-report.json
```

### Expected Output

```
🔧 CONFIGURATION ANALYSIS REPORT
================================

📈 SUMMARY
----------
Config sources scanned:     23
Code files scanned:         487
Total defined keys:         156
Total used keys:            142
Unused keys:                14
Missing keys:               8
Duplicate keys:             22
Deprecated patterns:        3

🗑️  UNUSED KEYS
  • OLD_FEATURE_FLAG (defined in .env:45)
  • DEPRECATED_API_KEY (defined in server/.env:12)
  ...

🚨 MISSING KEYS
  • MAESTRO_API_TOKEN (used in server/src/maestro/client.ts:23)
  • ANTHROPIC_API_KEY (used in server/src/ai/providers/anthropic.ts:15)
  ...

⚠️  DUPLICATE KEYS
  • DATABASE_URL (3 definitions)
    - .env:10
    - server/.env:8
    - .env.production:12
  ...
```

---

## Cleanup Strategy

### Phase 1: Consolidate Config Loaders (Week 1)

**Goal:** Single source of truth for config loading

**Actions:**

1. **Choose canonical loader:** `server/src/config.ts` (Zod-based)

2. **Remove duplicate loaders:**
   ```bash
   # Backup before deletion
   git mv server/config.ts server/config.ts.deprecated
   git mv server/src/config/index.ts server/src/config/index.ts.deprecated
   git rm server/src/config/index.js
   git rm server/src/config/env.ts  # Empty file
   ```

3. **Update all imports:**
   ```typescript
   // OLD (multiple variations)
   import config from '../config'
   import { getConfig } from '../../config'
   import cfg from './config/index'

   // NEW (single import)
   import { cfg } from './config'
   ```

4. **Add deprecation warnings:**
   ```typescript
   // In deprecated files, add:
   console.warn('[DEPRECATED] This config loader is deprecated. Use server/src/config.ts');
   ```

### Phase 2: Standardize Environment Variables (Week 1-2)

**Goal:** Single name per configuration value

**Actions:**

1. **Create mapping table:**
   ```typescript
   // server/src/config/deprecated-keys.ts
   export const DEPRECATED_KEYS = {
     NEO4J_USERNAME: 'NEO4J_USER',
     POSTGRES_URL: 'DATABASE_URL',
     // ... other mappings
   };
   ```

2. **Add compatibility layer:**
   ```typescript
   // In server/src/config.ts
   function migrateDeprecatedKey(oldKey: string, newKey: string): string | undefined {
     const oldValue = process.env[oldKey];
     const newValue = process.env[newKey];

     if (oldValue && newValue && oldValue !== newValue) {
       console.error(`[CONFIG] Both ${oldKey} and ${newKey} set with different values!`);
       process.exit(1);
     }

     if (oldValue && !newValue) {
       console.warn(`[CONFIG] ${oldKey} is deprecated. Use ${newKey} instead.`);
       return oldValue;
     }

     return newValue;
   }
   ```

3. **Update .env.example:**
   - Remove all deprecated keys
   - Add migration notes
   - Document new standard names

### Phase 3: Consolidate .env Files (Week 2)

**Goal:** Clear hierarchy and precedence

**Actions:**

1. **Merge nested .env files:**
   ```bash
   # Review differences
   diff .env server/.env

   # Merge unique keys from server/.env into .env
   # Add comments indicating origin

   # Remove nested files
   git rm server/.env
   git rm server/.env.production
   ```

2. **Document precedence:**
   ```typescript
   // server/src/config.ts
   /**
    * Configuration loading order (highest to lowest precedence):
    * 1. Environment variables set in shell
    * 2. .env.production (if NODE_ENV=production)
    * 3. .env (development/default)
    * 4. Default values in Zod schema
    */
   ```

3. **Clean up legacy files:**
   ```bash
   # Investigate .rehydrated files
   git log --follow server/.env.rehydrated

   # If no longer needed:
   git rm **/*.rehydrated
   ```

### Phase 4: Unify Validation (Week 2-3)

**Goal:** Type-safe configuration throughout

**Actions:**

1. **Extend Zod schema:**
   ```typescript
   // server/src/config.ts
   const Env = z.object({
     // Core
     NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
     PORT: z.coerce.number().default(4000),

     // Database
     DATABASE_URL: z.string().url().min(1),
     REDIS_URL: z.string().url(),
     NEO4J_URI: z.string().url(),
     NEO4J_USER: z.string().min(1),

     // AI Providers
     OPENAI_API_KEY: z.string().min(1),
     ANTHROPIC_API_KEY: z.string().min(1),

     // ... all required keys
   }).strict();  // Fail on unknown keys
   ```

2. **Add production guards:**
   ```typescript
   const parsed = Env.safeParse(process.env);

   if (!parsed.success) {
     console.error('[CONFIG] Validation failed:');
     console.error(parsed.error.format());
     process.exit(1);
   }

   // Production-specific validation
   if (parsed.data.NODE_ENV === 'production') {
     if (parsed.data.JWT_SECRET.length < 32) {
       console.error('[CONFIG] JWT_SECRET too weak for production');
       process.exit(1);
     }

     if (!parsed.data.POSTGRES_SSL) {
       console.error('[CONFIG] Database SSL required in production');
       process.exit(1);
     }
   }
   ```

3. **Type-safe access:**
   ```typescript
   // Export typed config
   export const cfg = parsed.data;
   export type Config = z.infer<typeof Env>;

   // Usage in code (fully typed!)
   import { cfg } from './config';

   const dbUrl = cfg.DATABASE_URL;  // string (typed)
   const port = cfg.PORT;           // number (typed)
   ```

### Phase 5: Feature Flag Consolidation (Week 3)

**Goal:** Single feature flag system

**Actions:**

1. **Choose primary system:** Distributed Config Service with environment overrides

2. **Migration order:**
   ```typescript
   // Priority (highest to lowest):
   // 1. Environment variable: FEATURE_X=true
   // 2. Distributed config service
   // 3. config/flags.json
   // 4. Code default

   function getFeatureFlag(name: string): boolean {
     // Check env var first
     const envVar = `FEATURE_${name.toUpperCase()}`;
     if (process.env[envVar] !== undefined) {
       return process.env[envVar] === 'true';
     }

     // Check distributed config
     const distributedValue = distributedConfig.getFlag(name);
     if (distributedValue !== undefined) {
       return distributedValue;
     }

     // Fallback to JSON config
     return flags[name] ?? false;
   }
   ```

---

## Migration Steps

### Step-by-Step Implementation

#### Step 1: Backup Current Configuration

```bash
# Create backup branch
git checkout -b backup/config-pre-cleanup
git add -A
git commit -m "Backup: Configuration before cleanup"
git push -u origin backup/config-pre-cleanup

# Return to feature branch
git checkout claude/cleanup-legacy-config-012HKT59aVS5eNnUZG6bs4uW
```

#### Step 2: Run Detection Script

```bash
python3 scripts/config-analyzer.py --format markdown --output docs/config-analysis-baseline.md
git add docs/config-analysis-baseline.md
git commit -m "docs: Add baseline config analysis"
```

#### Step 3: Consolidate Config Loaders

```bash
# Mark deprecated files
git mv server/config.ts server/config.ts.deprecated
git mv server/src/config/index.ts server/src/config/index.ts.deprecated
git rm server/src/config/index.js server/src/config/env.ts

# Update imports (use find/replace or sed)
find server/src -type f -name "*.ts" -exec sed -i '' 's|from.*config/index|from "./config"|g' {} +
find server/src -type f -name "*.ts" -exec sed -i '' 's|import config from|import { cfg } from|g' {} +

# Commit
git add -A
git commit -m "refactor: Consolidate to single config loader (server/src/config.ts)"
```

#### Step 4: Update .env Files

```bash
# Create new cleaned .env.example
cp .env.example.cleaned .env.example

# Merge server/.env into root .env (manual review recommended)
# Remove nested .env files after verification
git rm server/.env server/.env.production

# Commit
git add -A
git commit -m "refactor: Consolidate environment files to root"
```

#### Step 5: Add Deprecation Warnings

```typescript
// In server/src/config.ts, add to top of file:
Object.entries(DEPRECATED_KEYS).forEach(([oldKey, newKey]) => {
  if (process.env[oldKey]) {
    console.warn(`[CONFIG] ${oldKey} is deprecated. Use ${newKey} instead.`);
  }
});
```

```bash
git add server/src/config.ts
git commit -m "feat: Add deprecation warnings for old config keys"
```

#### Step 6: Update Documentation

```bash
# Add configuration docs
cp docs/CONFIG_CLEANUP_GUIDE.md docs/configuration.md

# Update README
echo "\n## Configuration\n\nSee [docs/configuration.md](docs/configuration.md)" >> README.md

git add -A
git commit -m "docs: Add comprehensive configuration documentation"
```

#### Step 7: Run Tests

```bash
# Run full test suite
pnpm test

# Check for config-related failures
pnpm test -- --grep "config"

# Run type checking
pnpm run typecheck

# If failures, investigate and fix
```

#### Step 8: Verify with Detection Script Again

```bash
# Run analysis again to verify improvements
python3 scripts/config-analyzer.py --format markdown --output docs/config-analysis-after.md

# Compare before/after
diff docs/config-analysis-baseline.md docs/config-analysis-after.md

# Expected improvements:
# - Fewer duplicate keys
# - No deprecated patterns
# - Clear config sources
```

---

## Testing Plan

### Unit Tests

```typescript
// server/src/config.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from './config';

describe('Configuration Loading', () => {
  beforeEach(() => {
    // Reset environment
    process.env = {};
  });

  it('should load required environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'test-secret-32-characters-long';

    const config = loadConfig();
    expect(config.DATABASE_URL).toBe('postgresql://localhost/test');
  });

  it('should fail on missing required variables', () => {
    expect(() => loadConfig()).toThrow('DATABASE_URL is required');
  });

  it('should apply default values', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'test-secret-32-characters-long';

    const config = loadConfig();
    expect(config.PORT).toBe(4000);  // default
  });

  it('should warn on deprecated keys', () => {
    const consoleSpy = jest.spyOn(console, 'warn');
    process.env.NEO4J_USERNAME = 'neo4j';

    loadConfig();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('NEO4J_USERNAME is deprecated')
    );
  });

  it('should enforce production security', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'weak';  // Too short

    expect(() => loadConfig()).toThrow('JWT_SECRET too weak');
  });
});
```

### Integration Tests

```typescript
// test/integration/config.test.ts
describe('Config Integration', () => {
  it('should load from .env file', async () => {
    // Create temporary .env
    await fs.writeFile('.env.test', 'TEST_VAR=value');

    // Load config
    const config = loadConfig({ path: '.env.test' });

    expect(config.TEST_VAR).toBe('value');

    // Cleanup
    await fs.unlink('.env.test');
  });

  it('should override with environment variables', () => {
    process.env.PORT = '5000';
    const config = loadConfig();
    expect(config.PORT).toBe(5000);
  });
});
```

### Manual Testing Checklist

- [ ] Application starts successfully
- [ ] Database connections work
- [ ] Redis connections work
- [ ] Neo4j connections work
- [ ] AI providers authenticate correctly
- [ ] Feature flags work as expected
- [ ] Distributed config service functions
- [ ] Hot-reload works (if applicable)
- [ ] Production mode validates correctly
- [ ] No deprecation warnings on clean config

---

## Rollback Plan

### If Issues Arise During Migration

**Option 1: Revert to backup branch**
```bash
git checkout backup/config-pre-cleanup
git checkout -b hotfix/config-rollback
# Test to ensure everything works
git push -u origin hotfix/config-rollback
# Deploy hotfix branch
```

**Option 2: Selective revert**
```bash
# Revert specific commits
git revert <commit-hash>

# Or restore specific files
git checkout HEAD~1 -- server/src/config.ts
```

**Option 3: Feature flag rollback**
```bash
# Add feature flag for new config system
FEATURE_NEW_CONFIG_LOADER=false

# In code:
if (process.env.FEATURE_NEW_CONFIG_LOADER === 'true') {
  // Use new config loader
} else {
  // Use legacy config loader
}
```

### Monitoring During Rollout

1. **Alerts:** Set up alerts for config-related errors
2. **Logging:** Enhanced logging during migration period
3. **Staged rollout:** Deploy to dev → staging → production
4. **Health checks:** Monitor application health metrics

---

## Success Criteria

### Before Cleanup (Baseline)

- ❌ 4 different config loaders
- ❌ 23 duplicate config keys
- ❌ 14 unused config keys
- ❌ 8 missing config keys
- ❌ 3 deprecated patterns in use
- ❌ No type safety on config access

### After Cleanup (Target)

- ✅ 1 canonical config loader (Zod-based)
- ✅ 0 duplicate config keys
- ✅ 0 unused config keys
- ✅ 0 missing config keys
- ✅ 0 deprecated patterns in use
- ✅ Full type safety with TypeScript inference
- ✅ Production security validation
- ✅ Clear documentation

---

## Appendix

### A. Configuration Loading Order (Final)

```
1. Environment Variables (shell)
   ↓
2. .env.production (if NODE_ENV=production)
   ↓
3. .env (development/local)
   ↓
4. Zod Schema Defaults
   ↓
5. Validation (fail fast on errors)
   ↓
6. Production Security Guards
   ↓
7. Feature Flags (overridable)
   ↓
8. Distributed Config Service (runtime overrides)
```

### B. Recommended File Structure

```
summit/
├── .env                          # Local development (gitignored)
├── .env.production              # Production values (gitignored)
├── .env.example.cleaned         # Template with all keys documented
├── config/
│   ├── flags.json               # Feature flags (static)
│   ├── model_budgets.yaml       # AI model cost limits
│   └── providers.yaml           # AI provider configs
├── server/
│   └── src/
│       ├── config.ts            # ✅ SINGLE CONFIG LOADER
│       └── config/
│           └── distributed/     # Advanced config service
└── scripts/
    └── config-analyzer.py       # Detection script
```

### C. Key Dependencies

```json
{
  "dependencies": {
    "dotenv": "^16.0.3",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "pyyaml": "python package"
  }
}
```

### D. Related Documentation

- [Zod Documentation](https://zod.dev)
- [dotenv Best Practices](https://github.com/motdotla/dotenv#readme)
- [12-Factor App Config](https://12factor.net/config)

---

## Questions & Support

**Owner:** Platform Team
**Slack:** #platform-config
**Issues:** https://github.com/org/summit/issues?label=config

---

*Last Updated: 2025-11-20*
