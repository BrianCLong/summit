# Dependency Governance Policy

## 1. Introduction

This policy establishes the standards for managing third-party dependencies in the IntelGraph codebase. The goal is to minimize supply chain risks, ensure legal compliance, and maintain a stable build environment.
It aligns with the Summit Readiness Assertion for enforced dependency integrity controls.

## 2. Allowed Licenses

We strictly enforce license compliance to prevent legal exposure.

### ✅ Allowed Licenses (Green List)

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- Unlicense
- CC0-1.0
- Python Software Foundation License (PSF)
- Mozilla Public License 2.0 (MPL-2.0) - _Check for file-level requirements_

### ❌ Denied Licenses (Red List)

- GPL (any version) - _Copyleft risk_
- AGPL (any version) - _Network copyleft risk_
- LGPL (any version) - _Requires careful linking_
- SSPL (Server Side Public License)
- Creative Commons Non-Commercial (CC-BY-NC)
- Beerware
- WTFPL

**Note:** Any exception requires legal review and approval from the Open Source Program Office (OSPO) or equivalent governance body.

## 3. Pinning Requirements

To ensure reproducible builds and prevent malicious package injection via floating tags:

### 3.1 Package Dependencies (NPM/Python/Rust)

- **Must be pinned to an exact version.**
- Wildcards like `^`, `~`, `*`, `>`, `>=` are **prohibited**.
- Example:
  - ✅ `"express": "4.18.2"`
  - ❌ `"express": "^4.18.2"`

### 3.2 GitHub Actions

- **Must be pinned to a full SHA-1 commit hash.**
- Tags like `@v1`, `@main`, `@latest` are **prohibited**.
- Comments should indicate the version the SHA corresponds to.
- Example:
  - ✅ `uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab # v3.5.2`
  - ❌ `uses: actions/checkout@v3`

### 3.3 Lockfiles

- `package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, and `Cargo.lock` must always be committed.
- CI pipelines must enforce consistency (e.g., `pnpm install --frozen-lockfile`).

### 3.4 Package Manager Enforcement (.npmrc)

The repository-level `.npmrc` is authoritative for pnpm guardrails and is treated as policy-as-code
for dependency integrity.

- **`engine-strict=true`** enforces declared Node/pnpm engine ranges and prevents drift.
- **`legacy-peer-deps=false`**, **`strict-peer-dependencies=true`**, and
  **`auto-install-peers=false`** require explicit peer alignment and block silent peer resolution.
- **`verify-store-integrity=true`** validates pnpm store integrity before installs.
- **`prefer-frozen-lockfile=true`** is mandated for CI to ensure lockfile fidelity in all
  dependency installs.

## 4. New Dependency Workflow

Adding a new dependency involves the following steps:

1.  **Justification:** Explain why the dependency is needed and why existing libraries are insufficient.
2.  **Vetting:**
    - Check for maintenance activity (last commit within 12 months).
    - Check for known vulnerabilities (CVEs).
    - Verify license compliance.
3.  **PR Process:**
    - Use the "Dependency Request" PR template.
    - CI will automatically scan for license violations and unpinned versions.
    - A manual review from a Code Owner is required.

## 5. Automated Enforcement

The following automated checks run in CI:

- **License Scanner:** Fails on forbidden licenses.
- **Pinning Checker:** Fails on unpinned packages or actions.
- **Vulnerability Scanner:** Fails on Critical/High CVEs (see Vulnerability Management Policy).
