# ADR-003: Build System Optimization

**Status**: Proposed
**Date**: 2025-11-21
**Deciders**: Architecture Team, DevOps Team
**Technical Story**: Reduce build times from 15-25 min to 5-8 min

## Context and Problem Statement

Current build performance is significantly below optimal:

| Metric | Current | Industry Best | Gap |
|--------|---------|---------------|-----|
| Cold build | 15-25 min | 5-8 min | 2-3x slower |
| Cached build | 3-8 min | 30s-2 min | 4-6x slower |
| `pnpm install` | 2-3 min | <1 min | 2-3x slower |
| Test execution | 10-15 min | 3-5 min | 2-3x slower |

**Root causes identified:**
1. Only **46/417 workspaces** in TypeScript project references
2. Serial build chains (`test → build → ^build`)
3. **35 separate Jest configs** with duplicated setup
4. Turbo cache not optimized for workspace structure

## Decision Drivers

- Developer productivity (faster feedback loops)
- CI/CD efficiency (cost reduction)
- Enable rapid iteration during refactoring

## Considered Options

### Option 1: Incremental Optimization (Recommended)
Fix TypeScript project references, optimize Turbo, consolidate test configs.

### Option 2: Alternative Build System
Switch to Nx, Bazel, or other build system.

**Rejected**: High migration cost, team unfamiliar with alternatives, Turbo is sufficient when properly configured.

### Option 3: Minimal Changes
Add more CI runners to parallelize builds.

**Rejected**: Treats symptoms not causes, increases costs without addressing core issues.

## Decision Outcome

**Chosen Option: Option 1 - Incremental Optimization**

### TypeScript Project References

#### Current State
```json
// tsconfig.build.json - only 46 projects listed
{
  "references": [
    { "path": "packages/common-types" },
    { "path": "packages/sdk-ts" },
    // ... 44 more
    // MISSING: 371 other workspaces!
  ]
}
```

#### Target State
```json
// tsconfig.build.json - all workspaces included
{
  "extends": "./tsconfig.base.json",
  "references": [
    // Auto-generated from pnpm-workspace.yaml
    { "path": "apps/web" },
    { "path": "apps/gateway" },
    { "path": "packages/common-types" },
    // ... all 417 workspaces
  ],
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true
  }
}
```

#### Implementation Script
```bash
#!/bin/bash
# scripts/generate-ts-references.sh

# Generate tsconfig.build.json from pnpm workspaces
pnpm ls -r --json | jq -r '.[].path' | while read pkg; do
  if [ -f "$pkg/tsconfig.json" ]; then
    echo "    { \"path\": \"$pkg\" },"
  fi
done
```

### Turbo Pipeline Optimization

#### Current State
```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // Serial chain
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],  // Waits for build
      "outputs": ["coverage/**"]
    }
  }
}
```

#### Target State
```json
// turbo.json - optimized
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env", "tsconfig.base.json"],
  "globalPassThroughEnv": ["NODE_ENV", "CI"],

  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".next/**"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],  // Parallel with build
      "outputs": ["*.tsbuildinfo"],
      "cache": true
    },
    "test": {
      "dependsOn": [],  // No build dependency - tests can run in parallel
      "outputs": ["coverage/**"],
      "cache": true,
      "env": ["CI", "NODE_ENV"]
    },
    "test:unit": {
      "dependsOn": [],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "test:integration": {
      "dependsOn": ["build"],  // Integration tests need build
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "dependsOn": [],  // Fully parallel
      "outputs": [],
      "cache": true
    },
    "smoke": {
      "dependsOn": ["build"],
      "outputs": [],
      "cache": false  // Always run
    }
  }
}
```

**Key changes:**
- `test` no longer depends on `build` (unit tests can run on source)
- `typecheck` runs in parallel with `build`
- `lint` has no dependencies (fully parallel)
- Separate `test:unit` and `test:integration` for finer control

### Jest Configuration Consolidation

#### Current State
- **35 separate Jest config files** across workspaces
- Duplicated transforms, module mappers, setup files
- Inconsistent test patterns

#### Target State
**Single root config with project inheritance:**

```javascript
// jest.config.js (root)
module.exports = {
  projects: [
    '<rootDir>/apps/*/jest.config.js',
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/services/*/jest.config.js',
  ],

  // Shared defaults
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', { /* SWC config */ }],
  },
  moduleNameMapper: {
    '^@intelgraph/(.*)$': '<rootDir>/packages/$1/src',
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Performance
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
```

```javascript
// packages/common-types/jest.config.js (workspace)
module.exports = {
  displayName: 'common-types',
  rootDir: __dirname,
  // Inherits all defaults from root
  // Only override what's necessary
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
```

### Docker Build Optimization

#### Multi-Stage Builds
```dockerfile
# Dockerfile.optimized
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY services/*/package.json ./services/
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS builder
COPY . .
RUN pnpm build --filter=@intelgraph/api

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

#### BuildKit Caching
```yaml
# docker-compose.dev.yml
services:
  api:
    build:
      context: .
      dockerfile: services/api/Dockerfile
      cache_from:
        - type=registry,ref=ghcr.io/brianclong/summit/api:cache
      cache_to:
        - type=registry,ref=ghcr.io/brianclong/summit/api:cache,mode=max
```

### Expected Performance Gains

| Optimization | Expected Improvement |
|--------------|---------------------|
| TS Project References | 30-50% faster incremental builds |
| Turbo Pipeline | 40% faster CI (parallel execution) |
| Jest Consolidation | 20% faster test setup |
| Docker BuildKit | 50% faster image builds (cached) |
| **Combined** | **2-3x overall improvement** |

## Consequences

### Positive
- Build times reduced from 15-25 min to 5-8 min
- Cached builds under 2 minutes
- Better developer experience (faster feedback)
- Lower CI costs

### Negative
- Initial setup effort for project references
- Need to regenerate references when adding packages
- Some tests may need adjustment to run without build

### Risks

| Risk | Mitigation |
|------|------------|
| Broken project references | Automated generation script |
| Test failures without build | Separate unit/integration test tasks |
| Cache invalidation issues | Global dependencies in turbo.json |

## Implementation Plan

1. **Week 1**: Expand TypeScript project references
2. **Week 1**: Optimize Turbo pipeline
3. **Week 2**: Consolidate Jest configs
4. **Week 2**: Implement Docker BuildKit caching
5. **Week 3**: Measure and iterate

## Related Documents

- [Monorepo Refactoring Plan](../MONOREPO_REFACTORING_PLAN.md)
- [ADR-001: Workspace Taxonomy](./ADR-001-workspace-taxonomy.md)
- [ADR-005: CI/CD Consolidation](./ADR-005-cicd-consolidation.md)
