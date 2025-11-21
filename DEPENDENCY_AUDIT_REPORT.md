# Summit Platform - Dependency Audit Report

**Date**: 2025-11-20
**Branch**: `claude/audit-consolidate-dependencies-01YPzrDfHwfp3ycfCVZ6eF7R`
**Auditor**: Automated dependency audit
**Repository**: https://github.com/BrianCLong/summit

---

## Executive Summary

This comprehensive dependency audit analyzed the Summit/IntelGraph monorepo containing **355 package.json files** across multiple workspaces. The audit identified security vulnerabilities, version inconsistencies, and opportunities for optimization.

### Key Findings

- **Security Vulnerabilities**: 8 NPM vulnerabilities (1 critical, 5 high, 2 moderate) + 8 Python vulnerabilities
- **Version Duplicates**: 178 packages have multiple versions across the workspace
- **Potentially Unused Dependencies**: ~170 dependencies flagged for review (heuristic analysis)
- **Workspace Packages**: 355 package.json files analyzed

### Risk Assessment

- **CRITICAL**: Immediate action required for parse-url SSRF vulnerability
- **HIGH**: Multiple high-severity vulnerabilities in xlsx, moment, glob, parse-path, and Python packages
- **MEDIUM**: Version fragmentation causing potential maintenance issues
- **LOW**: Outdated packages and potentially unused dependencies

---

## 1. Security Vulnerabilities

### 1.1 NPM/JavaScript Vulnerabilities (8 Total)

#### CRITICAL Severity (1)

| Package | Vulnerability | Affected Versions | Fixed In | Impact |
|---------|--------------|-------------------|----------|---------|
| **parse-url** | Server-Side Request Forgery (SSRF) | <8.1.0 | ≥8.1.0 | Allows attackers to make arbitrary requests from the server |

**Advisory**: https://github.com/advisories/GHSA-j9fq-vwqv-2fm2

#### HIGH Severity (5)

| Package | Vulnerability | Affected Versions | Fixed In | Impact |
|---------|--------------|-------------------|----------|---------|
| **parse-path** | Authorization Bypass | <5.0.0 | ≥5.0.0 | Can bypass authorization checks |
| **xlsx** | Prototype Pollution | <0.19.3 | No fix available | Allows prototype pollution attacks |
| **xlsx** | Regular Expression DoS | <0.20.2 | No fix available | CPU exhaustion via crafted input |
| **moment** | Inefficient RegEx Complexity | ≥2.18.0 <2.29.4 | ≥2.29.4 | ReDoS attack vector |
| **glob** | Command Injection | ≥11.0.0 <11.1.0 | ≥11.1.0 | CLI command injection via -c flag |

**Advisories**:
- parse-path: https://github.com/advisories/GHSA-3j8f-xvm3-ffx4
- xlsx (prototype): https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
- xlsx (ReDoS): https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
- moment: https://github.com/advisories/GHSA-wc69-rhjr-hc9g
- glob: https://github.com/advisories/GHSA-5j98-mcp5-4vw2

#### MODERATE Severity (2)

| Package | Vulnerability | Affected Versions | Fixed In | Impact |
|---------|--------------|-------------------|----------|---------|
| **parse-url** | Hostname Spoofing | <8.1.0 | ≥8.1.0 | Parses HTTP URLs incorrectly, vulnerable to hostname spoofing |
| **esbuild** | Dev Server CORS Bypass | ≤0.24.2 | ≥0.25.0 | Development server allows unauthorized cross-origin requests |

**Advisories**:
- parse-url: https://github.com/advisories/GHSA-pqw5-jmp5-px4v
- esbuild: https://github.com/advisories/GHSA-67mh-4wv8-2f99

### 1.2 Python Vulnerabilities (8 Total)

**Location**: `copilot/requirements.txt` and related Python packages

| Package | Version | Severity | CVE/ID | Fixed In | Impact |
|---------|---------|----------|--------|----------|---------|
| **fastapi** | 0.104.1 | HIGH | PYSEC-2024-38 | 0.109.1 | ReDoS in python-multipart form parsing |
| **python-jose** | 3.3.0 | HIGH | PYSEC-2024-232 | 3.4.0 | Algorithm confusion with ECDSA keys (similar to CVE-2022-29217) |
| **python-jose** | 3.3.0 | HIGH | PYSEC-2024-233 | 3.4.0 | JWT bomb DoS via high compression JWE tokens |
| **python-multipart** | 0.0.6 | HIGH | GHSA-2jv5-9r88-3w3p | 0.0.7 | ReDoS in Content-Type header parsing |
| **python-multipart** | 0.0.6 | MEDIUM | GHSA-59g5-xgcq-4qw3 | 0.0.18 | CPU exhaustion via excessive logging |
| **starlette** | 0.27.0 | HIGH | GHSA-f96h-pmfr-66vw | 0.40.0 | Memory exhaustion via large form fields |
| **starlette** | 0.27.0 | MEDIUM | GHSA-2c2j-9gv5-cj73 | 0.47.2 | Event loop blocking during file uploads |
| **ecdsa** | 0.19.1 | MEDIUM | GHSA-wj6h-64fc-37mp | N/A | Minerva timing attack (out of scope for maintainer) |

**Note**: The `en-core-web-lg` package could not be audited as it's not on PyPI.

---

## 2. Duplicate Dependencies Analysis

**Total packages with multiple versions**: 178

### 2.1 Top Duplicate Offenders

#### TypeScript (21 versions!)

Most common versions:
- `^5.9.3`: 184 packages ← **Target version**
- `^5.3.3`: 26 packages
- `^5.4.5`: 14 packages
- `^5.3.0`: 12 packages
- `^5.7.3`: 9 packages

**Recommendation**: Consolidate to `^5.9.3` across all workspaces.

#### @types/node (20 versions)

Most common versions:
- `^24.10.1`: 140 packages ← **Target version**
- `^20.0.0`: 23 packages
- `^20.10.0`: 23 packages
- `^20.12.7`: 14 packages
- `^22.14.0`: 7 packages

**Recommendation**: Consolidate to `^24.10.1` (latest LTS-aligned types).

#### ESLint (15 versions)

Most common versions:
- `^9.39.1`: 56 packages ← **Target version**
- `9.39.1`: 7 packages (remove caret)
- `^9.11.1`: 4 packages
- `^8.57.0`: 3 packages (major version behind)

**Recommendation**: Consolidate to `^9.39.1`, migrate remaining ESLint 8.x packages.

#### Jest (8 versions)

Most common versions:
- `^30.2.0`: 118 packages ← **Target version**
- `^29.7.0`: 19 packages
- `^29.5.0`: 3 packages

**Recommendation**: Migrate all workspaces to Jest 30.x.

#### Zod (8 versions)

Most common versions:
- `^4.1.12`: 72 packages ← **Zod v4 (experimental)**
- `^3.22.4`: 29 packages
- `^3.22.0`: 10 packages
- `^3.23.8`: 6 packages

**⚠️ WARNING**: Zod v4 is in beta/experimental. Consider standardizing on stable v3.x (`^3.24.1`) unless v4 features are critical.

#### Express (7 versions)

- `^5.1.0`: 32 packages
- `^4.18.2`: 21 packages
- `^4.19.2`: 6 packages

**Recommendation**: Standardize on Express 5.x (stable as of 2024) or stay on latest 4.x if compatibility concerns exist.

### 2.2 Other Notable Duplicates

- **@types/react**: 11 versions (consolidate to `^19.2.5`)
- **axios**: 10 versions (consolidate to `^1.11.0` or newer)
- **graphql**: 7 versions (consolidate to `^16.12.0`)
- **pg**: 7 versions (consolidate to `^8.16.3`)
- **react/react-dom**: 6 versions each (consolidate to `^19.2.0` or `^18.3.1`)

**Full duplicate report**: `/tmp/dependency-duplicates-report.json`

---

## 3. Outdated Packages

### 3.1 Root Package Status

Most root-level dependencies show as "missing" because they're managed by workspaces. Key findings:

| Package | Current (Wanted) | Latest | Notes |
|---------|------------------|--------|-------|
| @typescript-eslint/* | 8.46.4 | **8.47.0** | Minor update available |
| eslint-plugin-jest | 29.1.0 | **29.2.0** | Minor update available |
| markdownlint-cli | 0.45.0 | **0.46.0** | Minor update available |

### 3.2 Workspace-Level Analysis

Due to pnpm workspace complexity (355 packages), a recursive outdated check failed. Recommend:
1. Per-workspace audits for critical packages
2. Automated Dependabot/Renovate configuration
3. Turbo-based update scripts

---

## 4. Potentially Unused Dependencies

**Heuristic analysis** found ~170 potentially unused dependencies across 18 sampled workspaces.

### 4.1 Top Candidates for Review

| Workspace | Count | Examples |
|-----------|-------|----------|
| **@intelgraph/mobile-interface** | 39 | `react-dom`, `tailwindcss`, `@headlessui/react` |
| **@intelgraph/mobile-native** | 31 | `react-native-screens`, `@react-native-firebase/app` |
| **intelgraph-platform (root)** | 23 | `ajv`, `docx`, `dotenv`, `cross-env` |
| **@intelgraph/web** | 23 | `@radix-ui/*`, `@hookform/resolvers` |
| **intelgraph-client** | 19 | `@emotion/react`, `d3-selection`, `zod` |

### 4.2 Analysis Limitations

- **Heuristic-based**: Only checks for import/require statements in `src/` directories
- **False positives**: May flag:
  - Peer dependencies
  - Runtime-loaded modules
  - Configuration-only packages (e.g., tailwindcss, postcss)
  - Test utilities
- **Manual verification required** before removal

**Full report**: `/tmp/unused-deps-analysis.json`

---

## 5. Recommendations & Action Plan

### 5.1 Immediate Actions (Priority: CRITICAL)

1. **Fix parse-url SSRF vulnerability**
   ```bash
   pnpm update parse-url@latest -r
   ```

2. **Update high-severity packages**
   ```bash
   pnpm update parse-path@latest moment@latest glob@latest -r
   ```

3. **Update Python dependencies in copilot/**
   ```bash
   # In copilot/ directory
   pip install --upgrade fastapi python-jose python-multipart starlette
   # Update requirements.txt accordingly
   ```

### 5.2 Short-Term Actions (Priority: HIGH)

4. **Address xlsx vulnerabilities**
   - **No fix available** from upstream
   - Options:
     - Remove xlsx dependency if possible
     - Replace with maintained alternative (e.g., `exceljs`, `xlsx-populate`)
     - Accept risk if only used for trusted input

5. **Consolidate TypeScript versions**
   ```bash
   # Create script to update all package.json files
   find . -name "package.json" -not -path "*/node_modules/*" \
     -exec sed -i 's/"typescript": "[^^]*"/"typescript": "^5.9.3"/g' {} \;
   pnpm install
   ```

6. **Consolidate @types/node versions**
   ```bash
   # Similar approach, target ^24.10.1
   ```

7. **Update esbuild for dev server fix**
   ```bash
   pnpm update esbuild@latest -r
   ```

### 5.3 Medium-Term Actions (Priority: MEDIUM)

8. **Standardize Jest versions**
   - Migrate all workspaces from Jest 29.x → 30.x
   - Update `@types/jest` to `^30.0.0`
   - Test compatibility with existing test suites

9. **Evaluate Zod v4 usage**
   - **If v4 is intentional**: Document why and accept fragmentation
   - **If v4 is accidental**: Downgrade to stable `^3.24.1`
   - Create workspace policy to prevent accidental v4 adoption

10. **Consolidate React versions**
    - Decide on React 18.x LTS vs React 19.x
    - Update all workspaces consistently
    - Test for breaking changes

11. **Express version alignment**
    - Migrate to Express 5.x if compatible
    - Otherwise consolidate on `^4.21.2`

### 5.4 Long-Term Actions (Priority: LOW)

12. **Review potentially unused dependencies**
    - Manual audit of flagged packages (170 total)
    - Use tools like `depcheck` or `unimported` for validation
    - Remove confirmed unused deps

13. **Implement automated dependency management**
    - Configure Dependabot or Renovate Bot
    - Set up automated security updates
    - Enable automatic PR creation for patch updates

14. **Establish workspace dependency policies**
    - Use pnpm workspace protocols for internal packages
    - Create shared dependency catalogs
    - Enforce version consistency via tooling (e.g., syncpack)

15. **Regular audit cadence**
    - Monthly security audits
    - Quarterly dependency updates
    - Annual major version migrations

---

## 6. Upgrade Path Plan

### Phase 1: Security Hardening (Week 1)

**Goal**: Eliminate all critical and high-severity vulnerabilities

- [ ] Update parse-url to ≥8.1.0
- [ ] Update parse-path to ≥5.0.0
- [ ] Update moment to ≥2.29.4
- [ ] Update glob to ≥11.1.0
- [ ] Update esbuild to ≥0.25.0
- [ ] Update Python packages in copilot/:
  - [ ] fastapi → 0.109.1+
  - [ ] python-jose → 3.4.0+
  - [ ] python-multipart → 0.0.18+
  - [ ] starlette → 0.47.2+
- [ ] Address xlsx vulnerability (evaluate alternatives)
- [ ] Run `pnpm audit` and `pip-audit` to verify fixes
- [ ] Test golden path: `make smoke`

### Phase 2: Version Consolidation (Weeks 2-3)

**Goal**: Reduce version fragmentation for critical packages

- [ ] Consolidate TypeScript → `^5.9.3`
- [ ] Consolidate @types/node → `^24.10.1`
- [ ] Consolidate ESLint → `^9.39.1`
- [ ] Consolidate Jest → `^30.2.0`
- [ ] Consolidate @types/jest → `^30.0.0`
- [ ] Decide on Zod strategy (v3 stable vs v4 experimental)
- [ ] Consolidate React/React-DOM → `^19.2.0` OR `^18.3.1`
- [ ] Consolidate Express → `^5.1.0` OR `^4.21.2`
- [ ] Update lockfile: `pnpm install`
- [ ] Run full test suite: `pnpm test`
- [ ] Verify build: `pnpm build`

### Phase 3: Dependency Cleanup (Week 4)

**Goal**: Remove unused dependencies and optimize workspace

- [ ] Manually verify top 50 "potentially unused" dependencies
- [ ] Remove confirmed unused packages
- [ ] Update package.json files
- [ ] Run `pnpm install --lockfile-only` to prune
- [ ] Measure bundle size improvements
- [ ] Document removed dependencies

### Phase 4: Automation & Governance (Ongoing)

**Goal**: Prevent future dependency drift

- [ ] Enable Dependabot for automated security updates
- [ ] Configure Renovate for automated dependency PRs
- [ ] Set up `syncpack` to enforce version consistency
- [ ] Add pre-commit hooks for dependency validation
- [ ] Create DEPENDENCY_POLICY.md document
- [ ] Schedule monthly dependency review meetings

---

## 7. Testing Strategy

### Pre-Update Testing

Before any dependency updates:
1. Ensure golden path is green: `make smoke`
2. Run full test suite: `pnpm test`
3. Run linters: `pnpm lint`
4. Run type checks: `pnpm typecheck`
5. Build all packages: `pnpm build`

### Post-Update Testing

After each phase:
1. Re-run all pre-update checks
2. Test critical user workflows (Investigation → Entities → Relationships → Copilot)
3. Verify Docker compose stack: `make up && make smoke`
4. Check for breaking changes in changelogs
5. Monitor CI/CD pipeline results

### Rollback Plan

If issues arise:
1. Use git to revert changes: `git revert <commit>`
2. Restore lockfile: `git checkout HEAD~1 pnpm-lock.yaml`
3. Re-install: `pnpm install`
4. Document issue in GitHub issue tracker

---

## 8. Risk Mitigation

### High-Risk Updates

The following updates carry higher risk of breaking changes:

| Package | Current → Target | Risk Level | Mitigation |
|---------|------------------|------------|------------|
| React | 18.x → 19.x | HIGH | Extensive testing, gradual rollout |
| Express | 4.x → 5.x | MEDIUM | Review breaking changes, update middleware |
| Jest | 29.x → 30.x | MEDIUM | Review test configuration changes |
| Zod | 3.x → 4.x | HIGH | DO NOT upgrade unless necessary (v4 is beta) |

### Low-Risk Updates

The following updates are low-risk:

- Parse-url, parse-path, moment, glob (security patches)
- TypeScript, @types/node (minor versions)
- ESLint, Prettier (tooling)
- Development-only dependencies

---

## 9. Metrics & KPIs

### Current State

- **Total Dependencies**: Unknown (355 package.json files)
- **Security Vulnerabilities**: 16 (8 NPM + 8 Python)
- **Duplicate Versions**: 178 packages
- **Potentially Unused**: ~170 dependencies

### Target State (Post-Audit)

- **Security Vulnerabilities**: 0 (or documented/accepted)
- **Duplicate Versions**: <50 packages (70% reduction)
- **Potentially Unused**: <50 dependencies (70% reduction)
- **Outdated Packages**: <10% (excluding major version changes)

### Success Criteria

- ✅ All critical and high-severity vulnerabilities resolved
- ✅ TypeScript, @types/node, ESLint, Jest consolidated to single versions
- ✅ All tests passing (`pnpm test`)
- ✅ Golden path smoke test passing (`make smoke`)
- ✅ No increase in bundle sizes
- ✅ CI/CD pipeline green

---

## 10. Appendices

### Appendix A: Generated Reports

- **Duplicate dependencies**: `/tmp/dependency-duplicates-report.json`
- **Unused dependencies**: `/tmp/unused-deps-analysis.json`
- **NPM audit**: `/tmp/npm-audit-results.json`

### Appendix B: Useful Commands

```bash
# Security audits
pnpm audit
pnpm audit --fix
python3 -m pip_audit -r requirements.txt

# Dependency analysis
pnpm list -r --depth=0
pnpm outdated -r
pnpm why <package-name>

# Update commands
pnpm update <package>@latest -r        # Update across all workspaces
pnpm update --latest                   # Update to latest versions (respecting ranges)
pnpm dedupe                            # Deduplicate dependencies

# Workspace management
pnpm -r exec pnpm update <package>     # Run command in each workspace
pnpm --filter <workspace> update       # Update specific workspace

# Verification
make smoke                             # Golden path test
pnpm test                              # Run tests
pnpm lint                              # Run linters
pnpm typecheck                         # Type checking
```

### Appendix C: External Resources

- **pnpm workspace docs**: https://pnpm.io/workspaces
- **npm audit docs**: https://docs.npmjs.com/cli/v10/commands/npm-audit
- **pip-audit**: https://pypi.org/project/pip-audit/
- **GitHub Security Advisories**: https://github.com/advisories
- **Dependabot**: https://docs.github.com/en/code-security/dependabot
- **Renovate Bot**: https://docs.renovatebot.com/

---

## 11. Sign-Off

This audit provides a comprehensive analysis of the Summit platform's dependency health. Implementation of the recommended actions will significantly improve security posture, reduce maintenance burden, and establish sustainable dependency management practices.

**Next Steps**:
1. Review this report with the engineering team
2. Prioritize action items based on business impact
3. Create GitHub issues for each phase
4. Assign owners and timelines
5. Begin Phase 1 (Security Hardening)

**Questions or concerns?** Contact the platform engineering team or security team.

---

**Report Version**: 1.0
**Last Updated**: 2025-11-20
**Status**: Draft - Pending Review
