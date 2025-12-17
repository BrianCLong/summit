# Build Command

Build all packages in the Summit monorepo using Turbo for optimal caching and parallelization.

## Instructions

1. First, verify the project is in a clean state:
   ```bash
   git status --short
   ```

2. Run the build process:
   ```bash
   pnpm build
   ```

3. If there are TypeScript errors, run typecheck for detailed output:
   ```bash
   pnpm typecheck
   ```

4. If the build fails, check for:
   - Missing dependencies (`pnpm install`)
   - Circular dependencies in the codebase
   - Type errors that need fixing

## Build Targets

You can build specific packages using filters:

```bash
# Build server only
pnpm --filter @intelgraph/server build

# Build client only
pnpm --filter @intelgraph/client build

# Build all packages matching pattern
pnpm --filter "*api*" build
```

## Troubleshooting

If the build cache seems stale:
```bash
rm -rf .turbo node_modules/.cache
pnpm build
```

## Expected Output

A successful build will show:
- Green checkmarks for each completed task
- Turbo cache statistics
- No error messages

Report any persistent build failures to the user with specific error details and suggested fixes.
