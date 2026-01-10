# Lint & Type Analysis Report

**Generated:** 2025-12-29 22:32:00 UTC
**Repository:** BrianCLong/summit

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| TypeScript Errors | 262 | ⚠️ Needs Attention |
| ESLint Status | Configuration Issue | 🔧 Requires Fix |

---

## TypeScript Compilation Analysis

### Overview

The TypeScript compiler (`tsc -b --pretty false`) identified **262 type errors** across the codebase. These are primarily related to missing type declarations and module resolution issues.

### Error Distribution by Type

| Error Code | Description | Count | Priority |
|------------|-------------|-------|----------|
| TS2307 | Cannot find module | 110 | 🔴 High |
| TS2591 | Cannot find name (node types) | 60 | 🔴 High |
| TS2580 | Cannot find name | 52 | 🟡 Medium |
| TS2339 | Property does not exist on type | 30 | 🟡 Medium |
| TS2304 | Cannot find name | 3 | 🟢 Low |
| TS2875 | JSX tag requires module path | 2 | 🟢 Low |
| TS2688 | Cannot find type definition | 2 | 🟢 Low |
| TS6306 | Referenced project must have composite | 1 | 🟢 Low |
| TS2503 | Cannot find namespace | 1 | 🟢 Low |
| TS2362 | Left-hand side of arithmetic operation | 1 | 🟢 Low |

### Files with Most Type Errors

| File | Error Count | Primary Issues |
|------|-------------|----------------|
| `packages/maestro-cli/src/commands/run.ts` | 31 | Missing node types, modules |
| `packages/maestro-cli/src/index.ts` | 28 | Missing modules |
| `services/streaming-ingest/src/server.ts` | 19 | Module resolution |
| `services/streaming-ingest/src/cli/verifier.ts` | 17 | Missing type declarations |
| `packages/maestro-core/src/engine.ts` | 14 | EventEmitter, node types |
| `services/api-gateway/src/resolvers.ts` | 11 | Missing modules |
| `packages/maestro-core/src/budget/budget-manager.ts` | 11 | EventEmitter types |
| `services/streaming-ingest/src/cli/replay.ts` | 10 | Module resolution |
| `packages/feature-flags/src/FeatureFlagService.ts` | 9 | EventEmitter, modules |
| `packages/maestro-core/src/plugins/cosign-plugin.ts` | 7 | Node types |

### Root Cause Analysis

The majority of errors fall into these categories:

1. **Missing Node.js Type Definitions** (TS2591, TS2307)
   - Files using `process`, `Buffer`, `require` without `@types/node`
   - Fix: Add `@types/node` to devDependencies in affected packages

2. **Missing Third-Party Type Declarations** (TS2307)
   - Packages like `zod`, `axios`, `express`, `ioredis` missing types
   - Fix: Install corresponding `@types/*` packages or use packages with built-in types

3. **EventEmitter Inheritance Issues** (TS2339)
   - Classes extending EventEmitter but TypeScript can't find `emit` method
   - Fix: Properly extend `EventEmitter` from `events` module with correct types

4. **tsconfig Composite Setting** (TS6306)
   - `packages/sdk-ts` needs `"composite": true` in tsconfig
   - Fix: Update tsconfig.json in the referenced project

---

## ESLint Analysis

### Current Status

ESLint is currently **not runnable** due to configuration migration issues:

```
Error: A config object is using the "ignorePatterns" key, which is not supported in flat config system.
```

### Configuration Files Found

| File | Type | Status |
|------|------|--------|
| `eslint.config.js` | Flat Config | ⚠️ Migration needed |
| `eslint.config.mjs` | Flat Config | ⚠️ Migration needed |
| `.eslintrc.cjs` | Legacy | Deprecated |
| `.eslintrc.js` | Legacy | Deprecated |
| `.eslintrc.json` | Legacy | Deprecated |

### Recommended Fix

The project is using ESLint 9.x which requires flat config format. The existing configs are a mix of legacy and flat formats causing conflicts.

**Action Items:**
1. Remove legacy `.eslintrc.*` files
2. Complete migration to flat config in `eslint.config.js`
3. Convert `ignorePatterns` to `ignores` array in flat config
4. Update plugin imports to use flat config format

---

## Suggested Remediation Plan

### Phase 1: Critical Fixes (High Priority)

| Action | Files Affected | Estimated Effort |
|--------|---------------|------------------|
| Add `@types/node` to packages | 15+ packages | Low |
| Install missing `@types/*` packages | 10+ packages | Low |
| Fix tsconfig composite setting | `packages/sdk-ts` | Low |

### Phase 2: ESLint Migration (Medium Priority)

| Action | Files Affected | Estimated Effort |
|--------|---------------|------------------|
| Convert to flat config | `eslint.config.js` | Medium |
| Remove legacy configs | 4 files | Low |
| Update CI workflows if needed | `.github/workflows` | Low |

### Phase 3: Code Cleanup (Lower Priority)

| Action | Files Affected | Estimated Effort |
|--------|---------------|------------------|
| Fix EventEmitter type issues | 5+ files | Medium |
| Add proper module declarations | Various | Medium |

---

## Files to Prioritize for Cleanup

Based on error density, these files should be addressed first:

1. **`packages/maestro-cli/`** - 59+ errors across command files
2. **`services/streaming-ingest/`** - 46+ errors in server/CLI
3. **`packages/maestro-core/`** - 40+ errors in engine and plugins
4. **`packages/feature-flags/`** - 20+ errors in service and components
5. **`services/api-gateway/`** - 16+ errors in resolvers

---

## Quick Wins

These commands can help resolve many issues quickly:

```bash
# Add node types to packages missing them
cd packages/maestro-core && npm i -D @types/node

# Add common missing types
npm i -D @types/express @types/uuid

# Fix tsconfig composite
# In packages/sdk-ts/tsconfig.json, add:
# "composite": true
```

---

*This report was automatically generated. Run `npm run typecheck` for the full error output.*
