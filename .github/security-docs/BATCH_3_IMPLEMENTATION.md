# Batch 3 Implementation: Medium-Severity Vulnerabilities (All Ecosystems)

**Status:** PLANNED  
**Timeline:** Weeks 3-4  
**Priority:** MEDIUM  
**Estimated Effort:** 50-70 hours

## Overview

Batch 3 conducts broad cleanup of medium-severity vulnerabilities across all ecosystems to reduce overall attack surface.

## Task 3.1: Rust Dependency Audit & RUSTSEC Fixes

### Context

Rust ecosystem generally has fewer critical vulnerabilities, but memory safety issues require attention.

### Current Status

**Cargo.toml Files:** 34 total

**Workspace Structure:**
- Main workspace: `ibrs`, `bindings/ibrs-node`, `rust/summit_enterprise`
- AGQL workspace: `agql-cli`, `agql-core`, `agql-server`

### Recent Advisories

**RUSTSEC-2025-0018:** xmas-elf out-of-bounds read with malformed ELF files

### Implementation Steps

1. **Run cargo audit:**
   ```bash
   cargo audit
   ```

2. **Update vulnerable dependencies:**
   ```bash
   cargo update
   cargo audit fix
   ```

3. **Review unsafe code:**
   ```bash
   cargo clippy -- -W clippy::undocumented_unsafe_blocks
   ```

4. **Run tests:**
   ```bash
   cargo test
   cargo test --release
   ```

### Testing

- [ ] `cargo audit` passes
- [ ] `cargo test` passes for all crates
- [ ] `cargo clippy` passes
- [ ] No unsafe code warnings

### Success Criteria

- All RUSTSEC advisories resolved
- All tests pass
- No unsafe code issues

---

## Task 3.2: npm Transitive Dependency Cleanup

### Context

Deep dependency trees increase vulnerability exposure. Transitive dependencies need cleanup.

### Current Status

**npm Workspaces:**
- Root package.json (869 files)
- server/package.json
- client/package.json
- apps/web/package.json
- apps/search-engine/package.json
- apps/slo-exporter/package.json

### Implementation Steps

1. **Run npm audit:**
   ```bash
   npm audit
   pnpm audit
   ```

2. **Identify vulnerable transitive dependencies:**
   ```bash
   npm audit --json | jq '.vulnerabilities[] | select(.via[].source != .name)'
   ```

3. **Update dependencies:**
   ```bash
   npm update
   pnpm update
   npm audit fix
   pnpm audit --fix
   ```

4. **Review package-lock.json changes:**
   ```bash
   git diff package-lock.json | head -100
   ```

5. **Run tests:**
   ```bash
   npm run test
   npm run test:integration
   ```

### Testing

- [ ] npm audit passes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No functionality regressions

### Success Criteria

- All medium-severity npm vulnerabilities resolved
- Transitive dependency tree cleaned
- All tests pass

---

## Task 3.3: Python Dependency Consolidation

### Context

58 requirements files with potential version mismatches and vulnerabilities.

### Current Status

**Requirements Files:** 58 total

**Key Directories:**
- adversarial-misinfo-defense-platform/
- ai/cdis/
- airflow/
- api/
- apps/ml-engine/src/python/
- auto_scientist/
- backend/
- cognitive-targeting-engine/
- And 50+ more

### Implementation Steps

1. **Audit all requirements files:**
   ```bash
   for file in $(find . -name "requirements*.txt"); do
     echo "=== $file ==="
     pip-audit --file "$file"
   done
   ```

2. **Identify common dependencies:**
   ```bash
   grep -h "^[a-zA-Z]" $(find . -name "requirements*.txt") | sort | uniq -c | sort -rn | head -20
   ```

3. **Create consolidated requirements:**
   ```bash
   # Create root requirements.txt with common dependencies
   # Create specific requirements files for each module
   ```

4. **Update versions:**
   ```bash
   pip-audit --fix
   ```

5. **Test Python code:**
   ```bash
   python -m pytest tests/
   ```

### Testing

- [ ] pip-audit passes for all requirements files
- [ ] All Python tests pass
- [ ] No import errors
- [ ] No version conflicts

### Success Criteria

- All Python dependencies consolidated
- All medium-severity vulnerabilities resolved
- All tests pass

---

## Task 3.4: Add Security-Focused Tests

### Context

Ensure patched code is covered by tests to prevent regressions.

### Test Coverage Areas

#### npm/Node.js Security Tests

```javascript
// Test: Verify axios doesn't send sensitive data in URLs
describe('axios security', () => {
  it('should not expose sensitive data in URLs', async () => {
    // Test implementation
  });
});

// Test: Verify express middleware security
describe('express middleware security', () => {
  it('should enforce CORS restrictions', async () => {
    // Test implementation
  });
});
```

#### Python Security Tests

```python
# Test: Verify tarfile extraction is safe
def test_safe_tarfile_extraction():
    # Test implementation
    pass

# Test: Verify JSON logging doesn't execute code
def test_json_logging_safety():
    # Test implementation
    pass
```

#### Rust Security Tests

```rust
#[test]
fn test_unsafe_code_safety() {
    // Test implementation
}

#[test]
fn test_memory_safety() {
    // Test implementation
}
```

#### Go Security Tests

```go
func TestGoSecurityFixes(t *testing.T) {
    // Test implementation
}
```

### Implementation Steps

1. **Create test files:**
   - `tests/security/npm-security.test.js`
   - `tests/security/python_security.py`
   - `tests/security/rust_security.rs`
   - `tests/security/go_security.go`

2. **Write test cases:**
   - Input validation tests
   - Output encoding tests
   - Authentication tests
   - Authorization tests

3. **Run tests:**
   ```bash
   npm run test:security
   python -m pytest tests/security/
   cargo test --test security
   go test -run Security ./...
   ```

### Testing

- [ ] All security tests pass
- [ ] Test coverage > 90%
- [ ] No test failures

### Success Criteria

- Comprehensive security test coverage
- All tests pass
- Test coverage improved

---

## Pull Requests to Create

### PR 3a: Rust Dependency Audit & RUSTSEC Fixes

**Title:** `security(batch-3a): audit Rust dependencies and address RUSTSEC advisories`

**Description:**
- Runs cargo audit and addresses all RUSTSEC advisories
- Reviews and documents unsafe code
- Includes comprehensive Rust testing

**Files Changed:**
- All Cargo.toml files (34 total)
- Related Cargo.lock files

**Tests:**
- `cargo audit` passes
- `cargo test` passes
- `cargo clippy` passes

### PR 3b: npm Transitive Dependency Cleanup

**Title:** `security(batch-3b): resolve npm transitive dependency vulnerabilities`

**Description:**
- Identifies and updates vulnerable transitive dependencies
- Cleans up dependency tree
- Includes full test suite

**Files Changed:**
- package.json
- package-lock.json
- pnpm-lock.yaml

**Tests:**
- npm audit passes
- All unit tests pass
- All integration tests pass

### PR 3c: Python Consolidation & Security Tests

**Title:** `security(batch-3c): consolidate Python dependencies and add security tests`

**Description:**
- Consolidates 58 requirements files
- Updates to secure versions
- Adds comprehensive security tests

**Files Changed:**
- All requirements.txt files (58 total)
- New test files

**Tests:**
- pip-audit passes
- All Python tests pass
- Security tests pass

---

## Implementation Checklist

### Phase 1: Rust Audit
- [ ] Run `cargo audit` for all crates
- [ ] Identify RUSTSEC advisories
- [ ] Update vulnerable dependencies
- [ ] Review unsafe code
- [ ] Run all tests
- [ ] Create PR 3a

### Phase 2: npm Cleanup
- [ ] Run `npm audit` for all workspaces
- [ ] Identify transitive vulnerabilities
- [ ] Update dependencies
- [ ] Run full test suite
- [ ] Create PR 3b

### Phase 3: Python Consolidation
- [ ] Audit all requirements files
- [ ] Identify common dependencies
- [ ] Consolidate versions
- [ ] Update to secure versions
- [ ] Create PR 3c

### Phase 4: Security Tests
- [ ] Write npm security tests
- [ ] Write Python security tests
- [ ] Write Rust security tests
- [ ] Write Go security tests
- [ ] Merge into appropriate PRs

## Success Criteria

- [ ] All Rust RUSTSEC advisories resolved
- [ ] All npm transitive vulnerabilities resolved
- [ ] All Python dependencies consolidated and updated
- [ ] Comprehensive security tests added
- [ ] All tests pass
- [ ] Test coverage improved
- [ ] All PRs pass CI checks
- [ ] Code review completed

## Risk Assessment

### Risks

1. **Dependency Conflicts:** Updates may cause conflicts
2. **Breaking Changes:** New versions may introduce breaking changes
3. **Test Failures:** New tests may reveal existing issues

### Mitigation

1. Run full test suite before merging
2. Review breaking changes carefully
3. Have rollback plan ready
4. Monitor for issues post-merge

## Timeline

| Week | Task | Status |
|------|------|--------|
| 3 | Rust audit | Not Started |
| 3 | npm cleanup | Not Started |
| 3-4 | Python consolidation | Not Started |
| 4 | Security tests | Not Started |
| 4 | PR review and merge | Not Started |

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Prepared by:** Manus AI Security Implementation
