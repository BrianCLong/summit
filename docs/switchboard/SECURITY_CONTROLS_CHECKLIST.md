# Security Controls Checklist (v0.1)

Implementation Checklist for Switchboard Engineering

## 1. Secrets Handling

- [ ] **No Hardcoded Secrets:** Check source code for passwords/tokens.
- [ ] **Env Var Injection:** Secrets must be injected via env (e.g., `SWITCHBOARD_SECRET_GITHUB_PAT`).
- [ ] **Key Rotation:** Implement or document rotation procedures for API keys/tokens.
- [ ] **Memory Protection:** Scrub sensitive memory (e.g., capability args) immediately after use where possible.

## 2. SSRF / Egress Controls

- [ ] **Deny Private IP Ranges:** Block `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16` (metadata) for user-provided URLs.
- [ ] **DNS Rebinding Protection:** Resolve DNS once and check IP before connecting.
- [ ] **Allowlist:** Only permit outbound connections to registered MCP server URLs.
- [ ] **Protocol Restriction:** Only allow `http`, `https`. No `file://`, `gopher://`.

## 3. Sandboxing & Isolation

- [ ] **Container Isolation:** Each MCP server (if managed) runs in its own container/cgroup.
- [ ] **Resource Quotas:** CPU/RAM limits per tenant/server.
- [ ] **Process Isolation:** Use `seccomp` or similar to restrict syscalls.
- [ ] **Capabilities:** Drop unnecessary Linux capabilities (e.g., `CAP_SYS_ADMIN`).

## 4. Logging & Redaction

- [ ] **PII Scrubbing:** Redact emails, phone numbers, credit cards from logs.
- [ ] **Secret Redaction:** Ensure `Bearer <token>` becomes `Bearer [REDACTED]`.
- [ ] **Audit Trail:** Log every `Decision` (Allow/Deny) with principal ID, resource, and timestamp.
- [ ] **No Payload Logging:** By default, do *not* log full request/response payloads unless debug mode is enabled (and PII scrubbing is active).

## 5. Provenance & Integrity

- [ ] **Receipt Signing:** Sign receipts with a private key (Ed25519).
- [ ] **Hash Chaining:** Link receipts to the previous receipt hash (Ledger).
- [ ] **Policy Version:** Record the exact policy version/hash used for the decision.
- [ ] **Input/Output Hash:** Store SHA256 of inputs/outputs, not the raw data.

## 6. Multi-Tenant Hardening

- [ ] **Tenant ID Check:** Verify `X-Tenant-ID` matches the authenticated user's tenant claim on *every* request.
- [ ] **Data Isolation:** Ensure DB queries always include `WHERE tenant_id = ?`.
- [ ] **Cache Partitioning:** Ensure cache keys include `{tenant_id}`.

## 7. Supply Chain & Dependencies

- [ ] **SBOM:** Generate SBOM for every build.
- [ ] **Dependency Pinning:** Pin all dependencies (lockfiles).
- [ ] **Vulnerability Scan:** Run `trivy` or `snyk` in CI.
- [ ] **Signed Commits:** Require GPG-signed commits.

## 8. Must-Have Tests

- [ ] **Auth Bypass:** Test accessing Tenant B's resource with Tenant A's token (must fail).
- [ ] **SSRF Probe:** Test registering a server at `http://169.254.169.254` (must fail).
- [ ] **Policy Enforcement:** Test a denied action ensures *no* execution occurs.
- [ ] **Redaction:** Test that a secret in input is not present in logs.
