---
title: Maestro CLI Reference
summary: Complete command reference for Summit's build orchestration and dependency management CLI
owner: docs
version: 1.0
---

# Maestro CLI Reference

Maestro is Summit's golden path CLI for build orchestration, dependency analysis, and development workflows. It provides sub-500ms dependency graph queries on 10K+ node build graphs.

## Installation

```bash
# Install globally via npm
npm install -g @summit/maestro

# Or use via npx (no installation)
npx @summit/maestro [command]

# Verify installation
maestro --version
```

## Commands Overview

| Command | Purpose | Performance Target |
|---------|---------|-------------------|
| `maestro-init` | Repository migration wizard | ~5 min setup |
| `maestro-explain` | Build performance analysis | <2s |
| `maestro-query` | Dependency graph queries | <500ms |
| `maestro-doctor` | Environment diagnostics | <3s |

---

## `maestro-init`

Initialize a repository for Maestro build orchestration with shadow build validation.

### Usage

```bash
maestro-init [options]
```

### Options

```
--path <dir>          Repository path (default: current directory)
--template <name>     Use template: monorepo, service, library (default: auto-detect)
--shadow-build        Validate against existing build system (default: true)
--dry-run             Preview changes without writing files
--force               Overwrite existing Maestro config
```

### Examples

**Initialize current repository:**
```bash
cd my-project
maestro-init
```

**Output:**
```
🔍 Analyzing repository structure...
   ✓ Detected: TypeScript monorepo (pnpm workspaces)
   ✓ Found: 47 packages, 3,892 files

🏗️  Generating Maestro config...
   ✓ Created: maestro.config.ts
   ✓ Created: .maestro/build-graph.json
   ✓ Created: .maestro/cache-strategy.json

🔬 Running shadow build validation...
   ✓ Maestro build: 34.2s
   ✓ Existing build: 127.3s
   🎉 Speedup: 3.7x faster

✅ Maestro initialized successfully!

Next steps:
  1. Review maestro.config.ts
  2. Run: maestro-query "packages" to see dependency graph
  3. Run: maestro-explain to analyze build performance
```

**Use specific template:**
```bash
maestro-init --template monorepo --path ./my-monorepo
```

**Preview without writing:**
```bash
maestro-init --dry-run
```

### Shadow Build Validation

**What it does:**
- Runs your existing build system (e.g., `npm run build`)
- Runs Maestro build in parallel
- Compares outputs byte-for-byte
- Reports differences and performance gains

**Example output:**
```
Shadow Build Validation:

Existing Build (npm run build):
  Duration: 127.3s
  Outputs: 892 files

Maestro Build:
  Duration: 34.2s
  Outputs: 892 files

Comparison:
  ✓ All outputs match (byte-for-byte)
  ✓ No missing files
  ✓ No extra files
  🎉 3.7x speedup achieved

Cache Strategy:
  - Content-based hashing
  - Parallel execution: 8 workers
  - Incremental builds enabled
  - Remote cache: disabled (run maestro-init --remote-cache to enable)
```

---

## `maestro-explain`

Analyze build performance with critical path identification and cache statistics.

### Usage

```bash
maestro-explain [options] [target]
```

### Options

```
--format <type>       Output format: text, json, html (default: text)
--critical-path       Show only critical path (slowest chain)
--cache-stats         Show cache hit/miss statistics
--flamegraph          Generate flamegraph (requires --format html)
--output <file>       Write report to file
```

### Examples

**Basic build analysis:**
```bash
maestro-explain
```

**Output:**
```
📊 Build Performance Analysis

Target: build:all
Total Duration: 34.2s
Parallelism: 8 workers
Cache Hit Rate: 87.3%

Critical Path (34.2s):
  1. @summit/core           12.4s  (36.2%)
  2. @summit/api             8.7s  (25.4%)
  3. @summit/web             6.3s  (18.4%)
  4. @summit/cli             4.1s  (12.0%)
  5. Package & verify        2.7s   (7.9%)

Top 5 Slowest Tasks:
  1. TypeScript compile (@summit/core)     12.4s
  2. TypeScript compile (@summit/api)       8.7s
  3. Webpack bundle (@summit/web)           6.3s
  4. ESLint (@summit/core)                  3.8s
  5. TypeScript compile (@summit/cli)       4.1s

Cache Statistics:
  Total tasks: 127
  Cache hits: 111 (87.3%)
  Cache misses: 16 (12.6%)
  Cache size: 2.4GB

Recommendations:
  ✓ Critical path is optimized
  ⚠️  Consider splitting @summit/core (large module)
  💡 Enable remote cache for CI (potential 95%+ hit rate)
```

**Critical path only:**
```bash
maestro-explain --critical-path
```

**Output:**
```
Critical Path Analysis:

@summit/core (12.4s)
  → @summit/api (8.7s)
    → @summit/web (6.3s)
      → @summit/cli (4.1s)
        → Package (2.7s)

Total: 34.2s
Parallelizable: 89.1s saved via parallel execution
```

**Generate HTML report with flamegraph:**
```bash
maestro-explain --format html --flamegraph --output build-report.html
open build-report.html
```

**JSON output for CI:**
```bash
maestro-explain --format json > build-metrics.json
```

---

## `maestro-query`

Query the dependency graph with sub-500ms performance on 10K+ node graphs.

### Usage

```bash
maestro-query <query> [options]
```

### Query Syntax

```
packages                    # List all packages
deps <package>              # Direct dependencies of package
deps --transitive <package> # All dependencies (transitive)
rdeps <package>             # Reverse dependencies (who depends on this?)
path <from> <to>            # Shortest path between packages
affected <file>             # Packages affected by file change
circle                      # Detect circular dependencies
```

### Options

```
--format <type>       Output format: text, json, mermaid, dot (default: text)
--depth <n>           Max traversal depth (default: unlimited)
--filter <pattern>    Filter by package name pattern (regex)
--output <file>       Write output to file
```

### Examples

**List all packages:**
```bash
maestro-query packages
```

**Output:**
```
47 packages found:

@summit/core
@summit/api
@summit/web
@summit/cli
@summit/provenance
@summit/copilot
@summit/conductor
... (40 more)
```

**Find dependencies:**
```bash
maestro-query deps @summit/api
```

**Output:**
```
Direct dependencies of @summit/api:

@summit/core
@summit/provenance
@summit/policy
express (external)
apollo-server (external)

Total: 5 dependencies (3 internal, 2 external)
```

**Find all transitive dependencies:**
```bash
maestro-query deps --transitive @summit/web
```

**Output:**
```
All dependencies of @summit/web:

@summit/api
  → @summit/core
  → @summit/provenance
    → @summit/policy
  → @summit/policy
@summit/cli
  → @summit/core
react (external)
react-dom (external)

Total: 9 dependencies (6 internal, 3 external)
Depth: 3 levels
```

**Find who depends on a package:**
```bash
maestro-query rdeps @summit/core
```

**Output:**
```
Packages depending on @summit/core:

@summit/api (direct)
@summit/provenance (direct)
@summit/policy (direct)
@summit/web (via @summit/api)
@summit/cli (direct)
@summit/copilot (via @summit/api)

Total: 6 packages (4 direct, 2 transitive)
```

**Find path between packages:**
```bash
maestro-query path @summit/web @summit/provenance
```

**Output:**
```
Shortest path from @summit/web to @summit/provenance:

@summit/web
  → @summit/api
    → @summit/provenance

Length: 3 hops
```

**Find packages affected by file change:**
```bash
maestro-query affected src/core/types.ts
```

**Output:**
```
Packages affected by: src/core/types.ts

@summit/core (contains file)
@summit/api (depends on @summit/core)
@summit/provenance (depends on @summit/core)
@summit/web (depends on @summit/api)
@summit/cli (depends on @summit/core)
@summit/copilot (depends on @summit/api)

Total: 6 packages must be rebuilt

Estimated rebuild time: 28.3s (with cache)
```

**Detect circular dependencies:**
```bash
maestro-query circle
```

**Output:**
```
❌ Circular dependencies detected:

Cycle 1:
  @summit/api → @summit/web → @summit/api

Cycle 2:
  @summit/db → @summit/migration → @summit/db

Total: 2 cycles found

Run with --fix flag to attempt automatic resolution.
```

**Generate Mermaid diagram:**
```bash
maestro-query deps --transitive @summit/api --format mermaid --output deps.md
```

**Output (deps.md):**
````markdown
```mermaid
graph TD
    api[@summit/api]
    core[@summit/core]
    prov[@summit/provenance]
    policy[@summit/policy]

    api --> core
    api --> prov
    api --> policy
    prov --> policy
```
````

---

## `maestro-doctor`

Run environment diagnostics and health checks with scoring.

### Usage

```bash
maestro-doctor [options]
```

### Options

```
--fix                 Attempt to fix common issues automatically
--verbose             Show detailed diagnostic information
--json                Output results as JSON
```

### Examples

**Basic health check:**
```bash
maestro-doctor
```

**Output:**
```
🏥 Maestro Environment Diagnostics

System Information:
  ✓ Node.js: v18.17.0 (compatible)
  ✓ npm: 9.6.7 (compatible)
  ✓ pnpm: 8.6.12 (detected)
  ✓ OS: macOS 13.4 (supported)
  ✓ CPU: 8 cores (optimal for parallelism)
  ✓ Memory: 16GB (sufficient)

Maestro Configuration:
  ✓ Config file: maestro.config.ts (valid)
  ✓ Build graph: .maestro/build-graph.json (fresh)
  ✓ Cache directory: .maestro/cache (2.4GB, healthy)
  ✓ Workers: 8 (matches CPU cores)

Repository Health:
  ✓ Package.json: valid
  ✓ Dependencies: all installed
  ✓ Lock file: pnpm-lock.yaml (up to date)
  ⚠️  Git: 127 uncommitted files (consider committing)

Build Performance:
  ✓ Last build: 34.2s (within 45s target)
  ✓ Cache hit rate: 87.3% (good)
  ✓ Parallelism: 8 workers utilized

Issues Detected:
  ⚠️  Warning: 127 uncommitted files may affect cache invalidation
  ⚠️  Info: Remote cache disabled (enable for CI speedup)

Overall Health Score: 92/100 (Excellent)

Recommendations:
  1. Commit or stash uncommitted files
  2. Enable remote cache: maestro config --remote-cache s3://bucket
  3. Update pnpm to latest: pnpm add -g pnpm@latest
```

**Fix issues automatically:**
```bash
maestro-doctor --fix
```

**Output:**
```
🔧 Attempting automatic fixes...

✓ Updated pnpm to latest version (8.7.0)
✓ Cleared stale cache entries (freed 342MB)
✓ Regenerated build graph
⚠️  Cannot auto-commit files (requires manual action)

2 of 3 issues fixed automatically.

Run maestro-doctor again to verify.
```

**JSON output for CI:**
```bash
maestro-doctor --json > diagnostics.json
```

---

## Configuration

**maestro.config.ts:**
```typescript
import { defineConfig } from '@summit/maestro';

export default defineConfig({
  // Build graph
  packages: [
    'packages/*',
    'services/*'
  ],

  // Parallel execution
  workers: 8,  // or 'auto' to match CPU cores

  // Caching
  cache: {
    strategy: 'content-hash',  // or 'timestamp'
    location: '.maestro/cache',
    remote: {
      enabled: false,
      provider: 's3',  // or 'gcs', 'azure'
      bucket: 'summit-build-cache'
    },
    maxSize: '10GB'
  },

  // Build tasks
  tasks: {
    build: {
      command: 'tsc --build',
      inputs: ['src/**/*.ts', 'tsconfig.json'],
      outputs: ['dist/**'],
      dependsOn: ['^build']  // Build dependencies first
    },
    test: {
      command: 'jest',
      inputs: ['src/**/*.ts', 'src/**/*.test.ts'],
      dependsOn: ['build']
    },
    lint: {
      command: 'eslint src',
      inputs: ['src/**/*.ts', '.eslintrc.js']
    }
  },

  // Performance
  performance: {
    targetBuildTime: 45000,  // ms
    warnSlowTasks: 10000,    // ms
    failSlowTasks: 30000     // ms
  }
});
```

## Performance Characteristics

| Operation | Target | Typical |
|-----------|--------|---------|
| Dependency query | <500ms | 180ms (10K nodes) |
| Build graph generation | <5s | 2.3s (47 packages) |
| Critical path analysis | <2s | 0.9s |
| Environment diagnostics | <3s | 1.7s |

## Integration with CI

**GitHub Actions example:**
```yaml
name: Build with Maestro

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Maestro
        run: npm install -g @summit/maestro

      - name: Health check
        run: maestro-doctor

      - name: Find affected packages
        id: affected
        run: |
          AFFECTED=$(maestro-query affected --format json)
          echo "packages=$AFFECTED" >> $GITHUB_OUTPUT

      - name: Build affected packages
        run: maestro build ${{ steps.affected.outputs.packages }}

      - name: Performance report
        run: maestro-explain --format json > build-metrics.json

      - name: Upload metrics
        uses: actions/upload-artifact@v3
        with:
          name: build-metrics
          path: build-metrics.json
```

## Troubleshooting

**Slow queries (>500ms):**
```bash
# Regenerate build graph
maestro-init --force

# Check for circular dependencies
maestro-query circle

# Optimize graph structure
maestro-doctor --fix
```

**Cache misses:**
```bash
# Check cache strategy
maestro-explain --cache-stats

# Clear and rebuild cache
rm -rf .maestro/cache
maestro build --no-cache
```

**Environment issues:**
```bash
# Full diagnostic
maestro-doctor --verbose

# Auto-fix common problems
maestro-doctor --fix
```

## See Also

- [Architecture](../ARCHITECTURE.md) — Maestro's role in Summit platform
- [Golden Path Tutorial](../tutorials/golden-path.md) — Using Maestro in workflows
- [Build Performance Guide](../how-to/optimize-builds.md) — Advanced optimization
