# Phase 2 Batch Upgrade Playbook (Summit-Specific)

**Purpose**: Repeatable security burn-down engine for ~750 workspaces
**Timeline**: 4 weeks (March 1-28, 2026)
**Strategy**: Minimize CI cycles, avoid override sprawl
**Package Manager**: pnpm 10.0.0

---

## 0) One-Time Setup (Baseline + Safety Nets)

```bash
# Start fresh from main
git checkout main && git pull
git checkout -b chore/security-phase2-batch-01

# Verify environment
pnpm -v  # Should be 10.0.0
node -v  # Should be >=18.18

# Clean install
pnpm install --frozen-lockfile || pnpm install

# Create baseline snapshots
mkdir -p /tmp/summit-security-audit
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.before.json 2>&1 || true
pnpm audit --json > /tmp/summit-security-audit/audit.all.before.json 2>&1 || true

# Dependency graph snapshots (blast radius analysis)
pnpm list -r --depth 2 > /tmp/summit-security-audit/pnpm-list.depth2.before.txt 2>&1 || true
pnpm why -r minimatch > /tmp/summit-security-audit/why.minimatch.before.txt 2>&1 || true
pnpm why -r axios > /tmp/summit-security-audit/why.axios.before.txt 2>&1 || true
pnpm why -r fast-xml-parser > /tmp/summit-security-audit/why.fast-xml-parser.before.txt 2>&1 || true
pnpm why -r basic-ftp > /tmp/summit-security-audit/why.basic-ftp.before.txt 2>&1 || true
```

---

## 1) Batch Definition Strategy

**One batch per dependency family** → One PR → One CI run

| Batch | Focus | Packages | Risk | Week |
|-------|-------|----------|------|------|
| A | React Router (XSS) | react-router-dom | High | 1 |
| B | Apollo Server | @apollo/server migration | High | 2 |
| C | HTTP Stack | axios, undici, node-fetch | Medium | 2 |
| D | Parsers | yaml, xml, markdown | High | 3 |
| E | Archive/File | tar, unzipper | Medium | 3 |
| F | Dev Tooling | eslint, jest, storybook | Low | 4 |

---

## 2) Core Commands (Summit-Specific)

### Find Candidates

```bash
# Show outdated deps across all workspaces
pnpm -r outdated 2>&1 | tee /tmp/summit-outdated.txt

# Blast radius for specific package
pnpm why -r <package-name>

# Check current version across workspace
pnpm list <package-name> --depth=Infinity | grep <package-name> | sort | uniq
```

### Upgrade Strategies

**Strategy 1: Direct dependency upgrade (preferred)**
```bash
# Upgrade everywhere (root + all workspaces)
pnpm -r up <package>@latest

# Upgrade in specific workspace only
pnpm --filter "intelgraph-server" up <package>@latest
pnpm --filter "client" up <package>@latest
```

**Strategy 2: Selective workspace upgrade**
```bash
# Server packages
pnpm --filter "./server" up <package>@latest
pnpm --filter "./packages/*" up <package>@latest

# Client only
pnpm --filter "./client" up <package>@latest
```

**Strategy 3: Override (temporary containment)**
```json
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "<package>": "^X.Y.Z"
    }
  }
}
```

Then: `pnpm install`

---

## Batch A — React Router XSS (Week 1, High Priority)

**CVE**: CVE-2026-21884/22029
**Risk Score**: 60/75
**Blast Radius**: Client frontend only

```bash
# Create branch
git checkout -b chore/sec-batch-a-react-router

# Investigate current usage
pnpm why -r react-router-dom
pnpm list react-router-dom --depth=Infinity

# Upgrade in client workspace
cd client
pnpm up react-router-dom@latest react-router@latest
cd ..

# Install and rebuild
pnpm install
pnpm build:client

# Run client tests
pnpm test:client

# Run e2e tests (if Playwright installed)
# pnpm exec playwright install  # One-time
pnpm test:e2e:golden-path

# Audit delta
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.batch-a.json 2>&1 || true

# Commit
git add -A
git commit -m "fix(security): upgrade React Router to fix XSS (CVE-2026-21884/22029)

- Upgrades react-router-dom to latest
- Fixes open redirect XSS vulnerability
- Risk Score: 60/75 → 0
- Blast radius: Client package only

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"

# Push and create PR
git push -u origin chore/sec-batch-a-react-router
gh pr create --title "fix(security): Batch A - React Router XSS remediation" \
  --body "$(cat <<'EOF'
## Batch A: React Router XSS Fix

**CVE**: CVE-2026-21884/22029
**Severity**: HIGH
**Risk Score**: 60/75

### Changes
- ✅ Updated react-router-dom in client package
- ✅ Client tests passing
- ✅ E2E tests passing (routing behavior verified)

### Validation
\`\`\`bash
cd client && pnpm list react-router-dom
\`\`\`

### Audit Delta
See artifact: /tmp/summit-security-audit/audit-prod.after.batch-a.json

### References
- [PHASE-2-CVE-TRIAGE.md](../blob/main/docs/security/PHASE-2-CVE-TRIAGE.md#5-cve-2026-2188422029-react-router-xss)
EOF
)"
```

---

## Batch B — Apollo Server Migration (Week 2, High Priority)

**CVE**: CVE-2026-23897
**Risk Score**: 75/75
**Blast Radius**: Core GraphQL API (server, gateway, packages/api-framework)

**⚠️ Breaking Changes**: apollo-server-express v3 → @apollo/server v5

```bash
git checkout main && git pull
git checkout -b chore/sec-batch-b-apollo-server

# Investigate current usage
pnpm why -r apollo-server-express
grep -r "apollo-server-express" server/src --include="*.ts" | wc -l

# Migration strategy:
# 1. Replace apollo-server-express imports
# 2. Update middleware integration
# 3. Update error classes

# Find all Apollo imports
grep -r "from 'apollo-server-express'" server/src --include="*.ts" | cut -d: -f1 | sort | uniq

# Update server package
pnpm --filter "intelgraph-server" remove apollo-server-express
pnpm --filter "intelgraph-server" add @apollo/server@latest

# Update imports (manual or via sed)
# ForbiddenError, AuthenticationError → now from @apollo/server
find server/src -name "*.ts" -type f -exec sed -i '' \
  "s/from 'apollo-server-express'/from '@apollo\/server\/errors'/g" {} \;

# Update gql tag import
find server/src -name "*.ts" -type f -exec sed -i '' \
  "s/import { gql } from 'apollo-server-express'/import { gql } from 'graphql-tag'/g" {} \;

# Install graphql-tag if needed
pnpm --filter "intelgraph-server" add graphql-tag

# Build and test
pnpm install
pnpm build:server
pnpm test:server

# GraphQL integration tests
pnpm test:integration

# Audit delta
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.batch-b.json 2>&1 || true

# Commit
git add -A
git commit -m "fix(security): migrate Apollo Server v3→v5 (CVE-2026-23897)

BREAKING CHANGE: Migrated from apollo-server-express v3 to @apollo/server v5

- Fixes DoS vulnerability in standalone server
- Updates error classes (ForbiddenError, AuthenticationError)
- Updates gql tag import to graphql-tag
- Risk Score: 75/75 → 0

Migration guide: https://www.apollographql.com/docs/apollo-server/migration

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"
```

**Manual steps required**:
1. Update server startup code (expressMiddleware setup)
2. Update context function signature
3. Update error formatting
4. Test GraphQL resolvers

**Reference**: https://www.apollographql.com/docs/apollo-server/migration/

---

## Batch C — HTTP Stack (Week 2, Medium Priority)

**Targets**: axios (already updated), undici, node-fetch
**Note**: Axios already updated in Phase 1

```bash
git checkout main && git pull
git checkout -b chore/sec-batch-c-http

# Check current versions
pnpm list axios undici node-fetch --depth=Infinity | grep -E "(axios|undici|node-fetch)"

# Upgrade HTTP clients
pnpm -r up undici@latest node-fetch@latest

# Install and build
pnpm install
pnpm -r build

# Run tests
pnpm test:server
pnpm test:client

# Audit delta
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.batch-c.json 2>&1 || true

# Commit
git add -A
git commit -m "chore(security): Batch C - HTTP stack dependency updates

- Updates undici to latest
- Updates node-fetch to latest
- axios already updated in Phase 1

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"
```

---

## Batch D — Parsers (Week 3, High Priority)

**Targets**: js-yaml, yaml, fast-xml-parser (already updated), marked, dompurify
**Risk**: XML/YAML injection, XSS in markdown rendering

```bash
git checkout main && git pull
git checkout -b chore/sec-batch-d-parsers

# Investigate parser usage
pnpm why -r js-yaml || true
pnpm why -r yaml || true
pnpm why -r marked || true

# Upgrade parsers
pnpm -r up js-yaml@latest yaml@latest marked@latest dompurify@latest sanitize-html@latest

# Install and build
pnpm install
pnpm -r build

# Test document ingestion workflows
pnpm test:integration

# Audit delta
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.batch-d.json 2>&1 || true

# Commit
git add -A
git commit -m "fix(security): Batch D - Parser library updates

- Updates js-yaml, yaml to latest
- Updates marked (markdown parser)
- Updates dompurify, sanitize-html
- fast-xml-parser already updated in Phase 1

Mitigates injection risks in document parsing.

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"
```

---

## Batch E — Archive/File Handling (Week 3, Medium Priority)

**Targets**: tar (already updated), unzipper, adm-zip, fs-extra
**Risk**: Path traversal, symlink attacks

```bash
git checkout main && git pull
git checkout -b chore/sec-batch-e-archives

# Investigate file handling libraries
pnpm why -r tar || true
pnpm why -r unzipper || true
pnpm why -r adm-zip || true

# Upgrade archive handlers
pnpm -r up unzipper@latest adm-zip@latest fs-extra@latest

# Install and build
pnpm install
pnpm -r build

# Test file upload workflows
pnpm test:server -- --testNamePattern="upload|file|archive"

# Audit delta
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.batch-e.json 2>&1 || true

# Commit
git add -A
git commit -m "fix(security): Batch E - Archive/file handling updates

- Updates unzipper, adm-zip, fs-extra
- tar already updated in Phase 1

Mitigates path traversal and symlink attack vectors.

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"
```

---

## Batch F — Dev Tooling (Week 4, Low Priority)

**Targets**: eslint, typescript-eslint, jest, vitest, storybook
**Risk**: Low (dev dependencies only)

```bash
git checkout main && git pull
git checkout -b chore/sec-batch-f-devtools

# Upgrade dev dependencies
pnpm -r up eslint@latest \
  @typescript-eslint/eslint-plugin@latest \
  @typescript-eslint/parser@latest \
  vitest@latest \
  @storybook/react-vite@latest

# Install
pnpm install

# Run linters
pnpm lint

# Run tests
pnpm test

# Audit delta
pnpm audit --json > /tmp/summit-security-audit/audit.all.after.batch-f.json 2>&1 || true

# Commit
git add -A
git commit -m "chore(security): Batch F - Dev tooling updates

- Updates eslint, typescript-eslint
- Updates vitest, storybook
- Low risk: dev dependencies only

Refs: docs/security/PHASE-2-CVE-TRIAGE.md"
```

---

## Summit-Specific Test Commands

### Full Test Suite
```bash
# Quick sanity
pnpm test:quick

# Server unit tests
pnpm test:server
pnpm test:unit

# Client tests
pnpm test:client

# Integration tests
pnpm test:integration

# E2E golden path
pnpm test:e2e:golden-path

# Full test suite
pnpm test
```

### Build Verification
```bash
# Build everything
pnpm build

# Build specific packages
pnpm build:server
pnpm build:client

# Type checking
pnpm typecheck
pnpm typecheck:server
pnpm typecheck:client
```

### Lint & Format
```bash
# Run linters
pnpm lint

# Check formatting
pnpm format:check
```

---

## CI-Friendly PR Template

```markdown
## Security Batch [X]: [Package Family]

**CVE(s)**: [List CVEs]
**Severity**: CRITICAL|HIGH|MEDIUM|LOW
**Risk Score**: [X]/75 → 0

### Changes
- ✅ Package A: vX.Y.Z → vA.B.C
- ✅ Package B: vX.Y.Z → vA.B.C

### Validation
\`\`\`bash
# Verify versions
pnpm list <package> --depth=Infinity | grep <package>

# Test results
pnpm test:server  # ✅ Passing
pnpm test:client  # ✅ Passing
pnpm build       # ✅ Success
\`\`\`

### Audit Delta
Before: X vulnerabilities (Y critical, Z high)
After: X vulnerabilities (Y critical, Z high)

### Breaking Changes
- [ ] None
- [ ] Migration required (see commit message)

### Rollback Plan
Revert this PR

### References
- [PHASE-2-CVE-TRIAGE.md](../blob/main/docs/security/PHASE-2-CVE-TRIAGE.md)
- [SECURITY-AUDIT-2026-02-28.md](../blob/main/docs/security/SECURITY-AUDIT-2026-02-28.md)
```

---

## Post-Batch Audit Summary

```bash
# Compare before/after
pnpm audit --prod --json > /tmp/summit-security-audit/audit-prod.after.json 2>&1 || true
pnpm audit --json > /tmp/summit-security-audit/audit.all.after.json 2>&1 || true

# Count vulnerabilities
jq '.metadata.vulnerabilities' /tmp/summit-security-audit/audit-prod.before.json 2>/dev/null || true
jq '.metadata.vulnerabilities' /tmp/summit-security-audit/audit-prod.after.json 2>/dev/null || true

# Generate diff report
diff -u \
  <(jq -S '.vulnerabilities | keys' /tmp/summit-security-audit/audit.all.before.json 2>/dev/null || true) \
  <(jq -S '.vulnerabilities | keys' /tmp/summit-security-audit/audit.all.after.json 2>/dev/null || true) \
  > /tmp/summit-security-audit/audit-diff.txt 2>&1 || true
```

---

## Blast Radius Reports (Attach to PRs)

```bash
# Generate "why" reports for each batch
for pkg in react-router-dom @apollo/server undici js-yaml unzipper; do
  pnpm why -r "$pkg" > "/tmp/summit-security-audit/why.$pkg.txt" 2>&1 || true
done

# Attach to PR as artifacts or paste key sections
```

---

## Override Debt Tracking

Create `docs/security/PHASE2-OVERRIDE-DEBT.md`:

```markdown
# Override Debt Tracker

**Rule**: If an override remains after 2 batches, escalate to direct upgrade or replacement.

| Package | Override Added | Target Version | Status | Action |
|---------|---------------|----------------|--------|--------|
| minimatch | Phase 1 | >=9.0.5 | ✅ Resolved to 10.1.1 | Keep |
| basic-ftp | Phase 1 | >=5.0.5 | ⚠️ Not used | Remove override |

**Action Items**:
- [ ] Remove basic-ftp override (not in dependency tree)
- [ ] Validate minimatch resolution across all workspaces
```

---

## Emergency Rollback Procedure

If a batch PR causes issues in production:

```bash
# Revert the merge
gh pr view <PR-NUMBER> --json mergeCommit,headRefName | \
  jq -r '"git revert \(.mergeCommit.oid) -m 1"' | bash

# Or revert the PR directly
git revert <merge-commit-sha> -m 1
git push

# Create hotfix PR
git checkout -b hotfix/revert-security-batch-X
git commit -m "revert: security batch X due to production issue

Issue: [description]
Rollback: Reverts PR #XXXX
Next steps: [investigation plan]"
```

---

## Success Metrics (Track Weekly)

| Metric | Baseline | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|--------|----------|--------|--------|--------|--------|--------|
| Critical CVEs | 21 | | | | | 0-3 |
| High CVEs | 1,837 | | | | | <500 |
| Direct Upgrades | 0 | | | | | >15 |
| Active Overrides | 16 | | | | | <10 |
| Test Pass Rate | | | | | | >98% |

---

## References

- [PHASE-2-CVE-TRIAGE.md](./PHASE-2-CVE-TRIAGE.md)
- [SECURITY-AUDIT-2026-02-28.md](./SECURITY-AUDIT-2026-02-28.md)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Apollo Server Migration](https://www.apollographql.com/docs/apollo-server/migration/)

---

**Document Status**: ✅ Ready for Execution
**First Batch**: Batch A - React Router (Week 1)
**Owner**: Security Team
