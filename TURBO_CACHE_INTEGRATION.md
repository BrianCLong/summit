# Turbo Cache Integration Guide

This document explains how to integrate Turborepo caching into your CI/CD pipelines.

## Local Turbo Cache (GitHub Actions)

Add this to any workflow that runs `pnpm run build`, `test`, `lint`, or `typecheck`:

```yaml
- name: Cache Turbo build outputs
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-

- name: Build
  run: pnpm run build
  env:
    TURBO_TELEMETRY_DISABLED: 1
```

**Benefits:**
- ✅ Faster builds by reusing cached outputs
- ✅ No external dependencies
- ✅ Works out of the box

**Cache Hit Rates:**
- First run: ~0% (cold cache)
- Subsequent runs: 70-90% (depending on changes)

---

## Remote Turbo Cache (Vercel)

For even better caching across multiple runners and developers:

### 1. Set up Vercel Turbo

1. Visit https://vercel.com/signup (free for open source)
2. Create a team or use personal account
3. Go to Settings → Tokens → Create new token
4. Copy the token

### 2. Add GitHub Secrets

In your repository settings:
- **Secret:** `TURBO_TOKEN` = `<your-vercel-token>`
- **Variable:** `TURBO_TEAM` = `<your-team-name>`

### 3. Update Workflows

```yaml
- name: Build with Remote Cache
  run: pnpm run build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

**Benefits:**
- ✅ Shared cache across all CI runs and developers
- ✅ Even faster builds (80-95% cache hits)
- ✅ Team collaboration

---

## Current Integration Status

### ✅ Completed
- [x] Enhanced `turbo.json` with proper caching configuration
- [x] Local cache directory (`.turbo`) configured
- [x] All standard tasks defined (build, dev, test, lint, typecheck)
- [x] Example workflow created (`.github/workflows/_turbo-cache-example.yml`)

### 📋 To Integrate into Existing Workflows

The following workflows should be updated to use Turbo caching:

1. **`.github/workflows/pr-validation.yml`** (PRIMARY)
   - Add Turbo cache step before build/test
   - Add `TURBO_TELEMETRY_DISABLED=1` to env

2. **`.github/workflows/tests.changed.yml`**
   - Add Turbo cache step

3. **`.github/workflows/typecheck.changed.yml`**
   - Add Turbo cache step

4. **`.github/workflows/lint.changed.yml`**
   - Add Turbo cache step

### Update Template

For each workflow, add this **before** the build/test steps:

```yaml
- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml') }}-
      ${{ runner.os }}-turbo-
```

And add to **each pnpm command**:

```yaml
env:
  TURBO_TELEMETRY_DISABLED: 1
  # Optional: Enable remote cache
  # TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  # TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## Verification

After integrating, check your build times:

```bash
# First run (cold cache)
time pnpm run build

# Second run (warm cache) - should be much faster
time pnpm run build
```

Expected improvements:
- **Cold cache:** ~5-10 minutes (full build)
- **Warm cache:** ~1-2 minutes (cached artifacts)
- **Cache hit rate:** 70-95% (depending on changes)

---

## Troubleshooting

### Cache not working

1. Check `.turbo` directory exists:
   ```bash
   ls -la .turbo
   ```

2. Verify turbo.json is valid:
   ```bash
   cat turbo.json
   ```

3. Enable debug logging:
   ```bash
   TURBO_LOG_VERBOSITY=debug pnpm run build
   ```

### Cache is too large

Turbo cache can grow. To clean:
```bash
rm -rf .turbo
```

In CI, caches auto-expire after 7 days of inactivity.

---

## Best Practices

1. **Always use frozen lockfile:**
   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Cache node_modules separately:**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'pnpm'  # Caches node_modules
   ```

3. **Use specific cache keys:**
   ```yaml
   key: ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
   ```

4. **Monitor cache hit rates:**
   - Check Actions logs for "Cache hit" messages
   - Aim for >70% hit rate on warm builds

5. **Remote cache for teams:**
   - Set up Vercel Turbo for distributed teams
   - Shares cache across all developers and CI

---

## Example: Updated pr-validation.yml Snippet

Here's how to update the existing `pr-validation.yml`:

```yaml
# Add after "Install dependencies" step
- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-${{ hashFiles('pnpm-lock.yaml') }}-
      ${{ runner.os }}-turbo-

# Update build/test commands
- name: Run Build Validation
  if: matrix.validation == 'build'
  run: |
    pnpm run build
    pnpm run typecheck
  env:
    TURBO_TELEMETRY_DISABLED: 1

- name: Run Test Validation
  if: matrix.validation == 'test'
  run: pnpm run test --coverage
  env:
    TURBO_TELEMETRY_DISABLED: 1
```

---

## Next Steps

1. ✅ Review this guide
2. ⬜ Add Turbo cache to `pr-validation.yml`
3. ⬜ Add Turbo cache to other CI workflows
4. ⬜ (Optional) Set up Vercel Remote Cache
5. ⬜ Monitor cache hit rates and build times
6. ⬜ Document improvements in PR

**Expected Impact:**
- CI build time: **-40% to -60%**
- Developer build time: **-50% to -80%** (with remote cache)
- Overall productivity: **+20% to +30%**
