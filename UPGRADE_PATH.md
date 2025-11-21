# Summit Platform - Dependency Upgrade Path

**Date**: 2025-11-20
**Status**: Ready for Implementation
**Related**: See `DEPENDENCY_AUDIT_REPORT.md` for detailed analysis

This document provides a step-by-step upgrade path for consolidating and updating dependencies across the Summit monorepo.

---

## Quick Reference

| Phase | Focus | Duration | Risk | Status |
|-------|-------|----------|------|--------|
| **Phase 1** | Security Hardening | 1 week | LOW | 🔴 Not Started |
| **Phase 2** | Version Consolidation | 2-3 weeks | MEDIUM | 🔴 Not Started |
| **Phase 3** | Dependency Cleanup | 1 week | LOW | 🔴 Not Started |
| **Phase 4** | Automation & Governance | Ongoing | LOW | 🔴 Not Started |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## Phase 1: Security Hardening (Week 1)

**Goal**: Eliminate all critical and high-severity vulnerabilities

### 1.1 NPM Security Updates

#### Task 1.1.1: Fix parse-url SSRF (CRITICAL)

```bash
# Update parse-url to fix SSRF vulnerability
pnpm update parse-url@latest -r

# Verify the update
pnpm why parse-url
pnpm audit | grep parse-url
```

**Verification**:
- [ ] All instances of parse-url are ≥8.1.0
- [ ] No parse-url vulnerabilities in `pnpm audit`

---

#### Task 1.1.2: Fix parse-path Authorization Bypass (HIGH)

```bash
# Update parse-path
pnpm update parse-path@latest -r

# Verify
pnpm audit | grep parse-path
```

**Verification**:
- [ ] All instances of parse-path are ≥5.0.0
- [ ] No parse-path vulnerabilities in `pnpm audit`

---

#### Task 1.1.3: Fix moment.js ReDoS (HIGH)

```bash
# Update moment (or consider migrating to date-fns/dayjs)
pnpm update moment@latest -r

# Verify
pnpm list moment -r --depth=0
```

**Verification**:
- [ ] All instances of moment are ≥2.29.4
- [ ] OR migration plan to date-fns/dayjs created

**Note**: Consider deprecating moment.js in favor of modern alternatives (date-fns, dayjs, or native Temporal API).

---

#### Task 1.1.4: Fix glob Command Injection (HIGH)

```bash
# Update glob
pnpm update glob@latest -r

# Verify
pnpm audit | grep glob
```

**Verification**:
- [ ] All instances of glob are ≥11.1.0
- [ ] No glob vulnerabilities in `pnpm audit`

---

#### Task 1.1.5: Fix esbuild Dev Server CORS (MODERATE)

```bash
# Update esbuild
pnpm update esbuild@latest -r

# Verify
pnpm list esbuild -r --depth=0
```

**Verification**:
- [ ] All instances of esbuild are ≥0.25.0
- [ ] Dev servers tested and functioning

---

#### Task 1.1.6: Address xlsx Vulnerabilities (HIGH - No Fix Available)

**Options**:

**Option A**: Remove xlsx dependency
```bash
# Identify where xlsx is used
pnpm why xlsx

# Remove if unused
pnpm remove xlsx -r
```

**Option B**: Replace with maintained alternative
```bash
# Install alternative (e.g., exceljs)
pnpm add exceljs -r
# Migrate code from xlsx to exceljs
# Remove xlsx
pnpm remove xlsx -r
```

**Option C**: Accept risk with documentation
```bash
# Document in SECURITY.md that xlsx is used only for trusted input
# Add to known issues tracker
```

**Decision Required**:
- [ ] xlsx usage assessed
- [ ] Migration strategy chosen (A, B, or C)
- [ ] Implementation completed
- [ ] Security exception documented (if Option C)

---

### 1.2 Python Security Updates

#### Task 1.2.1: Update FastAPI (HIGH)

```bash
cd copilot/
pip install --upgrade "fastapi>=0.109.1"
pip freeze | grep fastapi >> requirements.txt.new
# Manually update requirements.txt with new version
```

**Verification**:
- [ ] fastapi ≥0.109.1 in copilot/requirements.txt
- [ ] Application tested and functional
- [ ] `pip-audit` shows no fastapi vulnerabilities

---

#### Task 1.2.2: Update python-jose (HIGH)

```bash
cd copilot/
pip install --upgrade "python-jose>=3.4.0"
# Update requirements.txt
```

**Verification**:
- [ ] python-jose ≥3.4.0
- [ ] JWT functionality tested
- [ ] No ECDSA key algorithm confusion issues

---

#### Task 1.2.3: Update python-multipart (HIGH)

```bash
cd copilot/
pip install --upgrade "python-multipart>=0.0.18"
# Update requirements.txt
```

**Verification**:
- [ ] python-multipart ≥0.0.18
- [ ] Form data parsing tested
- [ ] No ReDoS vulnerabilities

---

#### Task 1.2.4: Update Starlette (HIGH)

```bash
cd copilot/
pip install --upgrade "starlette>=0.47.2"
# Update requirements.txt
```

**Verification**:
- [ ] starlette ≥0.47.2
- [ ] Application tested
- [ ] File upload functionality verified

---

#### Task 1.2.5: Address ecdsa Timing Attack (MEDIUM - No Fix)

**Options**:

**Option A**: Replace with cryptography library
```bash
pip install cryptography
# Migrate code to use cryptography instead of ecdsa
pip uninstall ecdsa
```

**Option B**: Accept risk with documentation
- Note: Maintainer considers side-channel attacks out of scope
- Document that ecdsa is used in non-critical contexts
- Add to security exceptions

**Decision Required**:
- [ ] ecdsa usage assessed
- [ ] Migration strategy chosen
- [ ] Implementation completed or exception documented

---

### 1.3 Verification & Testing

#### Task 1.3.1: Run Security Audits

```bash
# NPM audit
pnpm audit --audit-level=moderate

# Python audit (from each Python package directory)
find . -name "requirements.txt" -not -path "*/node_modules/*" \
  -exec sh -c 'echo "Auditing: $1" && python3 -m pip_audit -r "$1"' _ {} \;
```

**Verification**:
- [ ] `pnpm audit` shows 0 vulnerabilities (or only accepted exceptions)
- [ ] `pip-audit` shows 0 vulnerabilities (or only accepted exceptions)

---

#### Task 1.3.2: Run Golden Path Test

```bash
# Ensure all services start and tests pass
make down
make up
make smoke
```

**Verification**:
- [ ] All services start successfully
- [ ] Smoke tests pass
- [ ] No regression in core functionality

---

#### Task 1.3.3: Run Full Test Suite

```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

**Verification**:
- [ ] All tests pass
- [ ] No linting errors
- [ ] No type errors

---

## Phase 2: Version Consolidation (Weeks 2-3)

**Goal**: Reduce version fragmentation for critical packages

### 2.1 TypeScript Consolidation

#### Task 2.1.1: Consolidate TypeScript to ^5.9.3

**Current State**: 21 different versions (184 packages already on ^5.9.3)

**Strategy**: Automated replacement

```bash
# Create backup
git checkout -b typescript-consolidation

# Replace all TypeScript versions in package.json files
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.archive/*" | while read file; do
  # Update devDependencies
  sed -i.bak 's/"typescript": *"[^"]*"/"typescript": "^5.9.3"/' "$file"
  # Clean up backup
  rm -f "${file}.bak"
done

# Reinstall
pnpm install

# Verify
pnpm list typescript -r --depth=0
```

**Manual Steps**:
1. Review `tsconfig.json` files for compatibility
2. Check for TypeScript 5.9-specific breaking changes
3. Update any type-related code if needed

**Verification**:
- [ ] All package.json files use `"typescript": "^5.9.3"`
- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] All tests pass

---

### 2.2 @types/node Consolidation

#### Task 2.2.1: Consolidate @types/node to ^24.10.1

**Current State**: 20 different versions (140 packages already on ^24.10.1)

```bash
# Replace all @types/node versions
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.archive/*" | while read file; do
  sed -i.bak 's/"@types\/node": *"[^"]*"/"@types\/node": "^24.10.1"/' "$file"
  rm -f "${file}.bak"
done

pnpm install
```

**Verification**:
- [ ] All package.json files use `"@types/node": "^24.10.1"`
- [ ] Type checking passes
- [ ] No Node.js API type errors

---

### 2.3 ESLint Consolidation

#### Task 2.3.1: Consolidate ESLint to ^9.39.1

**Current State**: 15 versions, 3 packages still on ESLint 8.x

**Strategy**: Two-phase approach

**Phase 1**: Migrate ESLint 8.x packages to 9.x
```bash
# Find ESLint 8.x packages
grep -r '"eslint": *"^8' . --include="package.json" | grep -v node_modules

# Manually update each package
# Review ESLint 8 → 9 migration guide: https://eslint.org/docs/latest/use/migrate-to-9.0.0
```

**Phase 2**: Consolidate all to ^9.39.1
```bash
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.archive/*" | while read file; do
  sed -i 's/"eslint": *"[^"]*"/"eslint": "^9.39.1"/' "$file"
done

pnpm install
pnpm lint
```

**Verification**:
- [ ] All ESLint 8.x packages migrated
- [ ] All package.json files use `"eslint": "^9.39.1"`
- [ ] `pnpm lint` passes
- [ ] ESLint configs updated for v9 compatibility

---

### 2.4 Jest Consolidation

#### Task 2.4.1: Migrate Jest 29.x → 30.x

**Current State**: 118 packages on Jest 30.x, 19 on 29.x

**Migration Steps**:

1. **Identify Jest 29.x packages**:
```bash
grep -r '"jest": *"^29' . --include="package.json" | grep -v node_modules
```

2. **Update to Jest 30.x**:
```bash
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"jest": *"^29\.[^"]*"/"jest": "^30.2.0"/' "$file"
  sed -i 's/"@types\/jest": *"^29\.[^"]*"/"@types\/jest": "^30.0.0"/' "$file"
done

pnpm install
```

3. **Review breaking changes**: https://jestjs.io/docs/upgrading-to-jest30

4. **Run tests**:
```bash
pnpm test
```

**Verification**:
- [ ] All packages using Jest are on ^30.2.0
- [ ] @types/jest updated to ^30.0.0
- [ ] All tests pass
- [ ] No Jest deprecation warnings

---

### 2.5 Zod Version Strategy

#### Task 2.5.1: Decide on Zod Version Strategy

**Current State**:
- 72 packages on Zod v4.x (experimental)
- 50+ packages on Zod v3.x (stable)

**⚠️ IMPORTANT**: Zod v4 is in beta/experimental

**Decision Matrix**:

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **A**: Standardize on v3.24.1 (stable) | Stable, production-ready | Lose v4 features, requires downgrade | ✅ **Recommended** |
| **B**: Standardize on v4.1.12 (experimental) | Latest features | Experimental, may have breaking changes | ⚠️ Use with caution |
| **C**: Mixed versions (status quo) | No immediate work | Maintenance burden, confusion | ❌ Not recommended |

**Recommended Action**: Standardize on Zod v3.24.1

```bash
# Downgrade all Zod v4 packages to v3
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"zod": *"^4\.[^"]*"/"zod": "^3.24.1"/' "$file"
  sed -i 's/"zod": *"4\.[^"]*"/"zod": "^3.24.1"/' "$file"
done

pnpm install
```

**Code Migration**:
- Review Zod v4 → v3 breaking changes
- Update validation schemas if needed
- Test all validation logic

**Verification**:
- [ ] Decision documented (A, B, or C)
- [ ] All packages on chosen version
- [ ] Validation tests pass
- [ ] No Zod-related runtime errors

---

### 2.6 React Consolidation

#### Task 2.6.1: Choose React Version Strategy

**Current State**:
- 8 packages on React 18.0.0
- 5 packages on React 18.2.0
- 4 packages on React 19.2.0
- 2 packages on React 19.1.1
- 5 packages on various other versions

**Decision Required**: React 18.x LTS or React 19.x?

**Option A**: Consolidate on React 18.3.1 (LTS)
```bash
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"react": *"[^"]*"/"react": "^18.3.1"/' "$file"
  sed -i 's/"react-dom": *"[^"]*"/"react-dom": "^18.3.1"/' "$file"
  sed -i 's/"@types\/react": *"[^"]*"/"@types\/react": "^18.3.1"/' "$file"
  sed -i 's/"@types\/react-dom": *"[^"]*"/"@types\/react-dom": "^18.3.0"/' "$file"
done
```

**Option B**: Consolidate on React 19.2.0 (Latest)
```bash
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"react": *"[^"]*"/"react": "^19.2.0"/' "$file"
  sed -i 's/"react-dom": *"[^"]*"/"react-dom": "^19.2.0"/' "$file"
  sed -i 's/"@types\/react": *"[^"]*"/"@types\/react": "^19.2.5"/' "$file"
  sed -i 's/"@types\/react-dom": *"[^"]*"/"@types\/react-dom": "^19.2.3"/' "$file"
done
```

**Recommendation**: Start with Option A (React 18.3.1 LTS) unless React 19 features are required.

**Verification**:
- [ ] Decision documented
- [ ] All packages on chosen React version
- [ ] UI components tested
- [ ] No React warnings in console
- [ ] Build succeeds

---

### 2.7 Express Consolidation

#### Task 2.7.1: Consolidate Express Version

**Current State**:
- 32 packages on Express 5.1.0
- 21 packages on Express 4.18.2
- 12 packages on various Express 4.x versions

**Decision**: Express 4.x LTS or Express 5.x?

**Option A**: Consolidate on Express 5.1.0 (latest stable)
- Express 5 is now stable (as of 2024)
- Breaking changes from v4 documented

**Option B**: Consolidate on Express 4.21.2 (LTS)
- More conservative
- Fewer breaking changes

**Recommendation**: Express 5.1.0 if time allows for testing; otherwise 4.21.2

```bash
# For Express 5.1.0:
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"express": *"[^"]*"/"express": "^5.1.0"/' "$file"
  sed -i 's/"@types\/express": *"[^"]*"/"@types\/express": "^5.0.3"/' "$file"
done
```

**Migration Notes**:
- Review Express 4 → 5 migration guide
- Update middleware (body-parser, etc.)
- Test all API endpoints

**Verification**:
- [ ] Decision documented
- [ ] All packages on chosen Express version
- [ ] API endpoints tested
- [ ] No Express-related errors

---

### 2.8 Other Package Consolidation

#### Task 2.8.1: Consolidate axios, graphql, pg, and other duplicates

**Quick wins** (low risk):

```bash
# axios → ^1.11.0 (or newer if available)
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"axios": *"[^"]*"/"axios": "^1.11.0"/' "$file"
done

# graphql → ^16.12.0
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"graphql": *"[^"]*"/"graphql": "^16.12.0"/' "$file"
done

# pg → ^8.16.3
find . -name "package.json" -not -path "*/node_modules/*" | while read file; do
  sed -i 's/"pg": *"[^"]*"/"pg": "^8.16.3"/' "$file"
done

pnpm install
```

**Verification**:
- [ ] axios consolidated
- [ ] graphql consolidated
- [ ] pg consolidated
- [ ] Tests pass

---

### 2.9 Phase 2 Final Verification

```bash
# Rebuild everything
pnpm install
pnpm build

# Run full test suite
pnpm test

# Run linting and type checking
pnpm lint
pnpm typecheck

# Run golden path
make smoke
```

**Verification**:
- [ ] All builds succeed
- [ ] All tests pass
- [ ] No linting errors
- [ ] No type errors
- [ ] Golden path smoke test passes
- [ ] Version duplicates reduced by >70%

---

## Phase 3: Dependency Cleanup (Week 4)

**Goal**: Remove unused dependencies and optimize workspace

### 3.1 Unused Dependency Review

#### Task 3.1.1: Review Top Candidates

**High Priority** (likely safe to remove after verification):

1. **@intelgraph/mobile-interface** (39 potentially unused):
   - Manually verify each dependency
   - Use `depcheck` or `unimported` for validation

2. **@intelgraph/mobile-native** (31 potentially unused):
   - Check React Native peer dependencies
   - Verify native module usage

3. **intelgraph-platform root** (23 potentially unused):
   - Check if used in scripts
   - Verify build tool dependencies

**Commands**:
```bash
# Install depcheck globally
npm install -g depcheck

# Run depcheck on a workspace
cd packages/mobile-interface
depcheck
```

**Verification**:
- [ ] Top 5 workspaces manually reviewed
- [ ] Unused dependencies documented
- [ ] Dependencies removed with testing

---

#### Task 3.1.2: Automated Cleanup (Use with Caution)

```bash
# Run depcheck on all workspaces and generate report
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.archive/*" | while read file; do
  dir=$(dirname "$file")
  echo "Checking $dir..."
  cd "$dir"
  depcheck --json > /tmp/depcheck-$(basename "$dir").json
  cd -
done
```

**Manual Review Required**: Do NOT automatically remove dependencies flagged by depcheck.

**Verification**:
- [ ] Reports reviewed
- [ ] False positives identified
- [ ] Safe removals completed
- [ ] Tests pass after each removal

---

### 3.2 Lockfile Optimization

#### Task 3.2.1: Prune and Deduplicate

```bash
# Remove unused dependencies from lockfile
pnpm install --lockfile-only

# Deduplicate dependencies
pnpm dedupe

# Clean up node_modules
rm -rf node_modules
pnpm install

# Verify
du -sh node_modules
```

**Verification**:
- [ ] Lockfile optimized
- [ ] node_modules size reduced (track before/after)
- [ ] All packages still installable
- [ ] Tests pass

---

### 3.3 Bundle Size Analysis

#### Task 3.3.1: Measure Bundle Sizes

```bash
# Build all packages
pnpm build

# Use webpack-bundle-analyzer or similar
npx webpack-bundle-analyzer --help

# For Vite projects
npx vite-bundle-visualizer
```

**Track Metrics**:
- Total bundle size before cleanup: ____ MB
- Total bundle size after cleanup: ____ MB
- Reduction: ____ %

**Verification**:
- [ ] Bundle sizes measured
- [ ] No size regressions
- [ ] Optimization opportunities documented

---

## Phase 4: Automation & Governance (Ongoing)

**Goal**: Prevent future dependency drift

### 4.1 Dependabot Configuration

#### Task 4.1.1: Enable Dependabot

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # npm/pnpm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    reviewers:
      - "platform-team"
    labels:
      - "dependencies"
      - "security"
    # Only auto-merge security patches
    allow:
      - dependency-type: "direct"
        update-type: "security"

  # Python dependencies
  - package-ecosystem: "pip"
    directory: "/copilot"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
    reviewers:
      - "platform-team"
    labels:
      - "dependencies"
      - "python"
```

**Verification**:
- [ ] Dependabot enabled
- [ ] First batch of PRs received
- [ ] Review process documented

---

### 4.2 Renovate Bot (Alternative to Dependabot)

#### Task 4.2.1: Configure Renovate

Create `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true
    },
    {
      "matchPackagePatterns": ["^@types/"],
      "automerge": true
    }
  ],
  "rangeStrategy": "bump",
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 5am on monday"]
  }
}
```

**Verification**:
- [ ] Renovate bot installed
- [ ] Configuration tested
- [ ] Auto-merge policies documented

---

### 4.3 syncpack Configuration

#### Task 4.3.1: Install and Configure syncpack

```bash
# Install syncpack
pnpm add -D -w syncpack

# Add to package.json scripts
{
  "scripts": {
    "deps:check": "syncpack list-mismatches",
    "deps:fix": "syncpack fix-mismatches"
  }
}

# Run initial check
pnpm deps:check
```

Create `.syncpackrc.json`:

```json
{
  "versionGroups": [
    {
      "label": "Use workspace protocol for local packages",
      "dependencies": ["@intelgraph/**"],
      "packages": ["**"],
      "dependencyTypes": ["prod", "dev"],
      "pinVersion": "workspace:*"
    }
  ],
  "semverGroups": [
    {
      "range": "^",
      "dependencies": ["**"],
      "packages": ["**"]
    }
  ]
}
```

**Verification**:
- [ ] syncpack installed
- [ ] No mismatches reported
- [ ] Pre-commit hook added

---

### 4.4 Pre-commit Hooks

#### Task 4.4.1: Add Dependency Validation Hooks

Update `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Existing hooks (gitleaks, lint-staged, etc.)

# Add dependency validation
pnpm deps:check || {
  echo "❌ Dependency version mismatch detected!"
  echo "Run 'pnpm deps:fix' to fix automatically."
  exit 1
}

# Check for security vulnerabilities
pnpm audit --audit-level=high --json > /tmp/audit.json || {
  echo "⚠️  Security vulnerabilities detected!"
  echo "Review with 'pnpm audit' and fix before committing."
  exit 1
}
```

**Verification**:
- [ ] Hook tested
- [ ] Blocks commits with dependency issues
- [ ] Team notified of new hook

---

### 4.5 Documentation

#### Task 4.5.1: Create DEPENDENCY_POLICY.md

Create `DEPENDENCY_POLICY.md`:

```markdown
# Dependency Management Policy

## Version Consistency

- All workspaces MUST use the same version of shared dependencies
- Use `pnpm deps:check` to validate before committing
- Use `pnpm deps:fix` to auto-fix mismatches

## Security

- Security patches MUST be applied within 7 days
- Critical vulnerabilities MUST be addressed within 48 hours
- Run `pnpm audit` before every release

## Updates

- Patch updates: Auto-merge if tests pass (Dependabot/Renovate)
- Minor updates: Manual review required
- Major updates: Requires tech lead approval and migration plan

## Adding New Dependencies

1. Check if similar dependency already exists
2. Verify package is actively maintained (recent commits, open issues)
3. Check for security advisories
4. Add to appropriate workspace only
5. Document why dependency is needed (in PR description)

## Removing Dependencies

1. Verify no usage with `depcheck`
2. Check for peer dependency requirements
3. Test thoroughly before removal
4. Document removal reason

## Workspace Dependencies

- Use `workspace:*` protocol for internal packages
- Do NOT pin to specific versions
- Keep workspace dependencies up-to-date

## Review Cadence

- Weekly: Dependabot/Renovate PRs
- Monthly: Dependency audit review
- Quarterly: Major version upgrade planning
```

**Verification**:
- [ ] Policy documented
- [ ] Team trained on policy
- [ ] Policy added to onboarding docs

---

### 4.6 Monitoring & Alerts

#### Task 4.6.1: Set Up Dependency Monitoring

**Options**:

1. **Snyk**: https://snyk.io
   - Continuous security monitoring
   - Automated PRs for vulnerabilities

2. **Socket.dev**: https://socket.dev
   - Supply chain security
   - Detects malicious packages

3. **GitHub Security Alerts**:
   - Already enabled for most repos
   - Configure notification settings

**Verification**:
- [ ] Monitoring tool chosen
- [ ] Integration configured
- [ ] Alert routing set up
- [ ] Team notified of alerts

---

## Appendix: Scripts & Tools

### Script: Bulk Version Update

Create `scripts/update-dependency-version.sh`:

```bash
#!/bin/bash
# Usage: ./scripts/update-dependency-version.sh <package-name> <new-version>

PACKAGE=$1
VERSION=$2

if [ -z "$PACKAGE" ] || [ -z "$VERSION" ]; then
  echo "Usage: $0 <package-name> <new-version>"
  echo "Example: $0 typescript ^5.9.3"
  exit 1
fi

echo "Updating $PACKAGE to $VERSION across all package.json files..."

find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.archive/*" | while read file; do
  if grep -q "\"$PACKAGE\":" "$file"; then
    echo "Updating $file..."
    sed -i.bak "s/\"$PACKAGE\": *\"[^\"]*\"/\"$PACKAGE\": \"$VERSION\"/" "$file"
    rm -f "${file}.bak"
  fi
done

echo "Running pnpm install..."
pnpm install

echo "Done! Verify with: pnpm list $PACKAGE -r --depth=0"
```

Make executable:
```bash
chmod +x scripts/update-dependency-version.sh
```

---

### Script: Dependency Audit Runner

Create `scripts/run-dependency-audit.sh`:

```bash
#!/bin/bash
# Comprehensive dependency audit

set -e

echo "🔍 Running dependency audit..."

# NPM audit
echo "📦 Running pnpm audit..."
pnpm audit --audit-level=moderate || {
  echo "⚠️  NPM vulnerabilities found!"
  pnpm audit --audit-level=moderate > /tmp/npm-audit.log
}

# Python audit
echo "🐍 Running pip-audit..."
if command -v pip-audit &> /dev/null; then
  find . -name "requirements.txt" -not -path "*/node_modules/*" | while read file; do
    echo "Auditing $file..."
    pip-audit -r "$file" || echo "⚠️  Vulnerabilities in $file"
  done
else
  echo "⚠️  pip-audit not installed. Run: pip install pip-audit"
fi

# Check for duplicates
echo "🔢 Checking for duplicate dependencies..."
node scripts/analyze-deps.js

# Check for outdated packages
echo "📊 Checking for outdated packages..."
pnpm outdated -r || true

echo "✅ Audit complete! Review reports in /tmp/"
```

---

## Success Metrics

Track the following metrics throughout the upgrade process:

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Security Vulnerabilities (NPM) | 8 | 0 | - |
| Security Vulnerabilities (Python) | 8 | 0 | - |
| Packages with Duplicate Versions | 178 | <50 | - |
| Potentially Unused Dependencies | 170 | <50 | - |
| node_modules Size | - MB | -20% | - |
| Build Time | - sec | No regression | - |
| Test Pass Rate | 100% | 100% | - |

---

## Rollback Procedures

If any phase causes issues:

1. **Identify the problem**:
   ```bash
   git log --oneline
   pnpm test 2>&1 | tee /tmp/test-errors.log
   ```

2. **Revert changes**:
   ```bash
   git revert <commit-hash>
   # or
   git reset --hard <previous-commit>
   ```

3. **Restore lockfile**:
   ```bash
   git checkout HEAD~1 pnpm-lock.yaml
   pnpm install
   ```

4. **Verify rollback**:
   ```bash
   make smoke
   pnpm test
   ```

5. **Document the issue**:
   - Create GitHub issue with error logs
   - Tag with "dependency-upgrade" label
   - Assign to platform team

---

## Sign-Off Checklist

### Phase 1 Complete
- [ ] All critical vulnerabilities fixed
- [ ] All high vulnerabilities fixed
- [ ] Python packages updated
- [ ] Tests passing
- [ ] Smoke tests passing
- [ ] Sign-off from: ________________

### Phase 2 Complete
- [ ] TypeScript consolidated
- [ ] @types/node consolidated
- [ ] ESLint consolidated
- [ ] Jest consolidated
- [ ] React version decided and implemented
- [ ] Express version decided and implemented
- [ ] Other duplicates reduced by 70%
- [ ] Tests passing
- [ ] Sign-off from: ________________

### Phase 3 Complete
- [ ] Unused dependencies reviewed
- [ ] Safe dependencies removed
- [ ] Lockfile optimized
- [ ] Bundle sizes measured
- [ ] No size regressions
- [ ] Sign-off from: ________________

### Phase 4 Complete
- [ ] Dependabot or Renovate configured
- [ ] syncpack installed and configured
- [ ] Pre-commit hooks updated
- [ ] DEPENDENCY_POLICY.md created
- [ ] Team trained
- [ ] Monitoring set up
- [ ] Sign-off from: ________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Next Review**: After Phase 1 completion
