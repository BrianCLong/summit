# Breaking Changes and Migration Guide

This document tracks breaking changes in the Summit CLI and provides migration paths.

## Version 0.1.0 (Initial Release)

### Overview

The Summit CLI consolidates 300+ existing scripts and tools. While designed for backward compatibility, some changes may affect existing workflows.

### Non-Breaking Changes

✅ **These continue to work:**

- All existing `make` targets
- All existing `npm run` scripts
- All existing shell scripts in `scripts/`
- All existing `just` recipes
- All existing CLI tools (`ig-detect`, `maestro`, etc.)

### New Unified Interface

The Summit CLI provides a new, unified interface **alongside** existing tools:

| Category | Old Way (Still Works) | New Way (Recommended)   |
| -------- | --------------------- | ----------------------- |
| Dev      | `make up`             | `summit dev up`         |
| Test     | `npm run smoke`       | `summit test smoke`     |
| DB       | `npm run db:migrate`  | `summit db migrate`     |
| Deploy   | `make stage`          | `summit deploy staging` |

### Potential Breaking Changes

⚠️ **Scenarios that may require attention:**

#### 1. CI/CD Pipelines Using Specific Output Formats

**What Changed:**

- Summit CLI provides structured output (`--json`, `--ndjson`)
- Default human-readable output may differ from original tools

**Impact:**

- Scripts parsing output may need updates
- CI/CD expecting specific format may break

**Migration:**

```yaml
# Before
- run: make smoke | grep "PASS"

# After (more reliable)
- run: summit test smoke --json | jq -e '.success == true'
```

**Severity:** Low - Only affects scripts parsing output

#### 2. Environment Variable Changes

**What Changed:**

- Summit CLI respects `summit.config.js` configuration
- Some defaults may differ from individual tools

**Impact:**

- Behavior may change if you rely on specific defaults

**Migration:**

1. Create `summit.config.js` to explicit configure behavior
2. Set environment variables to override config
3. Use tool-specific flags to maintain compatibility

**Example:**

```javascript
// summit.config.js
module.exports = {
  dev: {
    autoMigrate: false, // Match old behavior
  },
};
```

**Severity:** Low - Defaults are sensible

#### 3. Exit Codes

**What Changed:**

- Summit CLI uses consistent exit codes:
  - `0` = Success
  - `1` = Command/operation failure
  - `2` = Invalid usage/arguments

**Impact:**

- Scripts checking specific exit codes may need updates

**Migration:**

```bash
# Before
make up || exit 127

# After
summit dev up || exit 1
```

**Severity:** Low - Standard exit codes

#### 4. Working Directory Assumptions

**What Changed:**

- Summit CLI validates working directories
- Rejects operations on non-existent paths

**Impact:**

- Scripts assuming directories exist may fail faster

**Migration:**

```bash
# Add explicit directory checks
if [ ! -d "./compose" ]; then
  echo "Error: compose directory not found"
  exit 1
fi

summit dev up
```

**Severity:** Very Low - Better error handling

### Configuration Changes

#### New Configuration File

Summit CLI introduces `summit.config.js` for centralized configuration.

**Before:**

```bash
# Configuration scattered across:
# - Environment variables
# - Command-line flags
# - Multiple config files
```

**After:**

```javascript
// summit.config.js - Single source of truth
module.exports = {
  dev: {
    /* ... */
  },
  test: {
    /* ... */
  },
  deploy: {
    /* ... */
  },
};
```

**Migration:**

1. Copy `summit.config.example.js` to `summit.config.js`
2. Migrate settings from environment variables
3. Test with `summit doctor`

### Removed Features

❌ **Nothing removed!**

All existing tools and scripts continue to work. The Summit CLI is purely additive.

### Deprecated Features

⚠️ **Deprecated (but still functional):**

None yet. In future versions, we may deprecate:

- Direct use of individual CLI tools when Summit CLI provides equivalent
- Specific npm scripts that duplicate Summit CLI functionality

**Timeline:**

- Version 0.x: No deprecations, full backward compatibility
- Version 1.x: May deprecate redundant npm scripts (with warnings)
- Version 2.x: May remove redundant scripts (after 6-month warning period)

### New Requirements

#### Node.js Version

- **Required:** Node.js >= 20.0.0
- **Reason:** ES modules, modern JavaScript features
- **Check:** `node --version`

**Migration:**

```bash
# Install Node 20+
# via nvm
nvm install 20
nvm use 20

# via package manager
# See: https://nodejs.org/en/download/package-manager
```

#### pnpm (Recommended)

- **Recommended:** pnpm >= 8.0.0
- **Alternative:** npm works too
- **Reason:** Workspace support, faster installs

**Migration:**

```bash
# Install pnpm
corepack enable
pnpm --version
```

### Command-Line Interface Changes

#### Global Flags

**New global flags** (available on all commands):

- `--json` - JSON output
- `--ndjson` - Streaming JSON
- `--no-color` - Disable colors
- `--verbose` - Verbose logging
- `--quiet` - Minimal output
- `--config <path>` - Custom config

**Usage:**

```bash
# Any command can use these flags
summit dev status --json
summit test smoke --verbose
summit db migrate --quiet
```

#### Help System

**Enhanced help:**

```bash
# Top-level help
summit --help

# Command group help
summit dev --help

# Specific command help
summit dev up --help
```

### API Changes

Since this is the initial release, there are no API changes to track yet.

### Testing Changes

#### New Test Commands

```bash
# New unified test interface
summit test smoke       # Replaces: npm run smoke
summit test unit        # Replaces: npm run test:unit
summit test e2e         # Replaces: npm run test:e2e
summit test all         # Replaces: npm run test

# Old commands still work
npm run smoke          # Still works!
```

### Deployment Changes

#### New Deployment Safety

**Enhanced safety features:**

- `--force` required for production
- Automatic image verification
- SLO checks before deployment
- Rollback on failure

**Migration:**

```bash
# Before
make prod

# After (requires explicit confirmation)
summit deploy prod --force
```

**Reason:** Prevent accidental production deployments

### Rollback Procedure

If Summit CLI causes issues:

1. **Use old commands** (they still work)

   ```bash
   make up
   npm run smoke
   ```

2. **Report issue** with diagnostics

   ```bash
   summit doctor --verbose > diagnostics.txt
   ```

3. **Disable Summit CLI** temporarily
   ```bash
   # Just use old tools until fixed
   ```

### Migration Checklist

Use this checklist when adopting Summit CLI:

- [ ] Verify Node.js >= 20: `node --version`
- [ ] Install Summit CLI: `cd summit-cli && pnpm install`
- [ ] Run validation: `./summit-cli/scripts/validate-integration.sh`
- [ ] Test basic commands: `summit dev status`
- [ ] Create config: `cp summit.config.example.js summit.config.js`
- [ ] Update CI/CD (optional): Use `--json` for scripts
- [ ] Update documentation: Reference Summit CLI
- [ ] Train team: Share quickstart guide
- [ ] Monitor for issues: Check logs
- [ ] Gradual rollout: Start with dev, then staging, then prod

### Getting Help

If you encounter breaking changes or migration issues:

1. **Check documentation:**
   - `docs/summit-cli-quickstart.md`
   - `docs/summit-cli-migration-guide.md`
   - `summit-cli/README.md`

2. **Run diagnostics:**

   ```bash
   summit doctor --verbose
   ./summit-cli/scripts/validate-integration.sh
   ```

3. **File an issue:**
   - Include output from `summit doctor --verbose`
   - Describe expected vs actual behavior
   - Provide reproduction steps

4. **Rollback if needed:**
   - Use old commands (they still work!)
   - Report the issue
   - We'll fix it

### Version History

#### 0.1.0 (2025-01-20) - Initial Release

**Added:**

- Unified CLI interface consolidating 300+ tools
- Machine-readable output (`--json`, `--ndjson`)
- Comprehensive diagnostics (`summit doctor`)
- Interactive setup (`summit init`)
- Full backward compatibility

**Changed:**

- Nothing! All existing tools still work

**Deprecated:**

- Nothing yet

**Removed:**

- Nothing!

**Security:**

- Added command validation
- Added dangerous command warnings
- Added timeout limits

---

## Future Breaking Changes

### Planned for 1.0.0

- Deprecation warnings for redundant npm scripts
- Standardization of exit codes across all commands
- Removal of experimental features

### Not Planned

- Removal of backward compatibility
- Breaking changes to JSON output format
- Changes to existing tool behavior

---

**Last Updated:** 2025-01-20
**Version:** 0.1.0
