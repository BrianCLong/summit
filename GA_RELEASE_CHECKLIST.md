# GA Release Checklist

This checklist **must** be cleared before the `v2.0.0-GA` release.

## 1. Legal Compliance

- [ ] **License Audit**: `THIRD_PARTY_NOTICES.md` is generated and up-to-date.
- [ ] **SPDX Headers**: Top-level source files have SPDX headers or `THIRD_PARTY_NOTICES.md` covers them.
- [ ] **Terms of Service**: `docs/legal/TERMS.md` exists and reflects the current business model.
- [ ] **Privacy Policy**: `docs/legal/PRIVACY.md` exists and accurately describes data collection.
- [ ] **DPA**: `docs/legal/DPA.md` exists (even if placeholder).
- [ ] **Subprocessors**: `docs/legal/SUBPROCESSORS.md` exists.

## 2. Security Posture

- [ ] **Security Policy**: `SECURITY.md` is present in root with reporting instructions.
- [ ] **Threat Model**: `docs/security/THREAT_MODEL.md` is up-to-date.
- [ ] **Vulnerability Scan**: No "High" or "Critical" vulnerabilities in dependencies (run `npm audit` or `snyk test`).
- [ ] **Code Owners**: `CODEOWNERS` covers `/docs/legal/` and `/docs/security/`.
- [ ] **No Unknown P0 Risks**: All known P0 security/legal risks are either resolved or explicitly accepted in the Risk Register.

## 3. Release Hygiene

- [ ] **CI Checks Pass**: All tests and the `check:ga` script pass.
- [ ] **Documentation**: `README.md` links to the Legal/Security docs.
