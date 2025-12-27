# Security Vulnerability Mitigations

## expr-eval (CVE-202X-XXXX)

**Vulnerability:** Prototype Pollution & Function Restriction Bypass
**Version:** <= 2.0.2 (Latest available on npm is 2.0.2)
**Mitigation:**
- The project currently uses `expr-eval` v2.0.2, which is the latest published version on npm but still flagged as vulnerable.
- **Action:** We are monitoring for a new release (v2.0.3+). In the meantime, input validation and sanitization are strictly enforced on all expression evaluation paths to prevent malicious payloads. Use of this library is restricted to trusted internal administrators.

## xlsx (SheetJS)

**Vulnerability:** Prototype Pollution (< 0.19.3) and ReDoS (< 0.20.2)
**Current State:**
- `server` depends on `node-nlp` which depends on `@nlpjs/xtables` which depends on `xlsx@0.18.5`.
- Attempted to force upgrade to `xlsx@0.20.3` via vendor URL, but encountered package manager resolution issues in the monorepo environment.
**Mitigation:**
- The vulnerability is in a transitive dependency used for specific NLP table processing.
- **Action:** We recommend replacing `node-nlp` with a secure alternative or waiting for `node-nlp` to update its dependencies.
- In the interim, ensure that no untrusted Excel files are processed by the NLP service. The service is currently internal-facing only.
