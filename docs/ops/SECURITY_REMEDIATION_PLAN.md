# Security Vulnerability Remediation Plan

**Date**: 2026-01-03
**Orchestrator**: Claude Code (Backlog Execution Orchestrator)
**Repository**: BrianCLong/summit
**Branch**: `claude/master-orchestrator-prompt-WHxWp`

---

## Executive Summary

**CRITICAL SECURITY ISSUE**: 145 vulnerabilities detected by GitHub Dependabot:

- **1 CRITICAL**
- **124 HIGH**
- **19 MODERATE**
- **1 LOW**

**Immediate Action Required**: Systematic patching of all vulnerabilities starting with critical and high-severity issues.

---

## Vulnerability Analysis (pnpm audit)

### Node.js Dependencies (6 advisories identified)

| ID          | Package       | CVE               | Severity     | Current       | Fixed       | Impact                                              |
| ----------- | ------------- | ----------------- | ------------ | ------------- | ----------- | --------------------------------------------------- |
| **1109540** | **form-data** | **CVE-2025-7783** | **CRITICAL** | **2.3.3**     | **>=2.5.4** | **Unsafe random function allows request injection** |
| 1111755     | qs            | CVE-2025-15284    | HIGH         | 6.14.0, 6.5.3 | >=6.14.1    | DoS via memory exhaustion (arrayLimit bypass)       |
| 1093150     | dicer         | CVE-2022-24434    | HIGH         | 0.3.0         | None        | DoS - HeaderParser crash (no patch available)       |
| 1097682     | tough-cookie  | CVE-2023-26136    | MODERATE     | 2.5.0         | >=4.1.3     | Prototype Pollution                                 |
| 1096727     | request       | CVE-2023-28155    | MODERATE     | 2.88.2        | None        | SSRF bypass (deprecated package)                    |
| 1109540     | form-data     | (duplicate)       | -            | 2.3.3         | >=2.5.4     | (see above)                                         |

**Total Affected Dependencies**: 7,393

### Python Dependencies (pip outdated)

| Package          | Current    | Latest     | Priority     | Risk                                |
| ---------------- | ---------- | ---------- | ------------ | ----------------------------------- |
| **cryptography** | **41.0.7** | **46.0.3** | **CRITICAL** | **Multiple CVEs in older versions** |
| PyJWT            | 2.7.0      | 2.10.1     | HIGH         | Auth token vulnerabilities          |
| urllib3          | 2.6.1      | 2.6.2      | HIGH         | HTTP security fixes                 |
| setuptools       | 68.1.2     | 80.9.0     | MODERATE     | Build security                      |
| wheel            | 0.42.0     | 0.45.1     | MODERATE     | Build security                      |

---

## Remediation Strategy

### Phase 1: CRITICAL & HIGH (Immediate - Today)

#### 1.1 CRITICAL: form-data CVE-2025-7783

**Issue**: Uses `Math.random()` for boundary values, allowing predictable PRNG exploitation and request injection.

**Action**:

```bash
pnpm update form-data@latest
```

**Verification**:

- Confirm version >=2.5.4 in all package.json files
- Test multipart form uploads
- Run full test suite

**Affected Paths**:

- Direct dependency paths need updating

---

#### 1.2 HIGH: qs CVE-2025-15284 (DoS via arrayLimit bypass)

**Issue**: `arrayLimit` option doesn't enforce limits for bracket notation, enabling memory exhaustion DoS.

**Action**:

```bash
pnpm update qs@latest
```

**Verification**:

- Confirm version >=6.14.1 in all lock files
- Test query string parsing with arrays
- Load test with large arrays to confirm protection

**Affected Paths**:

- `.>body-parser>qs`
- `apps__server>node-vault>postman-request>qs`

---

#### 1.3 HIGH: dicer CVE-2022-24434 (DoS - HeaderParser crash)

**Issue**: Malicious form crashes Node.js service. **NO PATCH AVAILABLE**.

**Action** (Mitigation):

1. **Replace deprecated dependencies** using dicer:
   - `apollo-server-testing` → use newer Apollo packages or mock differently
   - `@apollographql/graphql-upload-8-fork` → upgrade to latest `graphql-upload`

2. **If replacement not feasible**:
   - Add input validation before multipart parsing
   - Implement request size limits
   - Add monitoring/alerting for crashes

**Path**: `server>apollo-server-testing>apollo-server-core>@apollographql/graphql-upload-8-fork>busboy>dicer`

---

#### 1.4 CRITICAL: Python cryptography 41.0.7 → 46.0.3

**Issue**: Multiple known CVEs in cryptography versions <46.x

**Action**:

```bash
source .venv/bin/activate
pip install --upgrade cryptography
pip-compile --upgrade requirements.in
```

**Verification**:

- Confirm version 46.0.3 in requirements.txt
- Test all crypto operations (JWT, SSL, encryption)
- Verify no breaking changes in crypto API usage

---

### Phase 2: MODERATE (This Week)

#### 2.1 MODERATE: tough-cookie CVE-2023-26136

**Issue**: Prototype Pollution when using CookieJar in `rejectPublicSuffixes=false` mode.

**Action**:

```bash
pnpm update tough-cookie@latest
```

**Target**: >=4.1.3

**Path**: `sdk__typescript>dtslint>@definitelytyped/utils>@qiwi/npm-registry-client>request>tough-cookie`

---

#### 2.2 MODERATE: request CVE-2023-28155 (Deprecated)

**Issue**: SSRF bypass. Package is **deprecated and unmaintained**.

**Action** (Replace deprecated package):

1. **Identify all usage** of `request` package
2. **Migrate to alternatives**:
   - Modern: `axios`, `node-fetch`, `got`, or native `fetch` (Node 18+)
   - Already using: `httpx` (Python side)

**Paths**:

- `sdk__typescript>dtslint>@definitelytyped/utils>@qiwi/npm-registry-client>request`
- `apps__server>node-vault>postman-request` (likely also uses deprecated `request`)

---

#### 2.3 Python Package Updates

**Action**:

```bash
pip install --upgrade PyJWT urllib3 setuptools wheel
pip-compile --upgrade requirements.in
```

---

### Phase 3: Validation & Documentation (After Patches)

#### 3.1 Security Scanning

```bash
# Re-run audits
pnpm audit
pip list --outdated
pip check

# If available, run safety check
pip install safety
safety check

# Run SAST tools (if configured)
npm run security:check
```

#### 3.2 Testing

```bash
# Full test suite
pnpm test
pytest

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

#### 3.3 CI/CD Validation

```bash
make ga  # Run full GA gate
```

---

## Execution Checklist

### CRITICAL Priority (Complete Today)

- [ ] Update form-data to >=2.5.4 (CVE-2025-7783)
- [ ] Update qs to >=6.14.1 (CVE-2025-15284)
- [ ] Mitigate dicer vulnerability (replace or add safeguards)
- [ ] Update Python cryptography to 46.0.3
- [ ] Run pnpm audit to verify fixes
- [ ] Run pip check to verify Python fixes
- [ ] Execute full test suite
- [ ] Commit changes with security context

### HIGH Priority (Complete This Week)

- [ ] Update tough-cookie to >=4.1.3
- [ ] Replace deprecated `request` package with modern alternative
- [ ] Update PyJWT, urllib3, setuptools, wheel
- [ ] Re-run all security scans
- [ ] Update SECURITY.md with remediation details

### Documentation

- [ ] Update CHANGELOG.md with security fixes
- [ ] Create security advisory if needed
- [ ] Update dependency documentation
- [ ] Document any breaking changes from updates

---

## Risk Assessment

### Pre-Remediation Risk: **CRITICAL**

- **Attack Surface**: Web-facing multipart form uploads, query string parsing
- **Exploitation Difficulty**: Low (public PoCs available)
- **Impact**: DoS, request injection, potential data exfiltration
- **CVSS Scores**: Up to 7.5 (High)

### Post-Remediation Risk: **LOW**

- Most vulnerabilities patchable via updates
- Deprecated packages require code changes but feasible
- Estimated remediation time: 4-8 hours

---

## Breaking Changes Assessment

### Likely Safe Updates

- **form-data** 2.3.3 → 2.5.4: Minor version, should be compatible
- **qs** 6.x → 6.14.1: Patch version, backward compatible
- **tough-cookie** 2.5.0 → 4.1.3: Major version - **CHECK FOR BREAKING CHANGES**
- **cryptography** 41.x → 46.x: Major version - **TEST THOROUGHLY**

### Requires Investigation

- **dicer**: No patch - requires dependency replacement strategy
- **request**: Deprecated - requires migration to modern HTTP client

---

## Success Criteria

✅ **Phase 1 Complete When**:

- 0 critical vulnerabilities
- <10 high vulnerabilities
- All security tests pass
- No regression in functionality

✅ **Full Remediation Complete When**:

- <5 total vulnerabilities (all low/informational)
- No deprecated packages in production code
- Security scan passes in CI/CD
- Documentation updated

---

## Next Steps

1. ✅ Create this remediation plan
2. ⏳ Update form-data (CRITICAL)
3. ⏳ Update qs (HIGH)
4. ⏳ Investigate dicer mitigation
5. ⏳ Update cryptography (CRITICAL)
6. ⏳ Run validation suite
7. ⏳ Commit & push security fixes
8. ⏳ Monitor Dependabot for confirmation

---

**Estimated Total Time**: 4-8 hours
**Priority**: **IMMEDIATE** - Start now
