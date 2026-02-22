# Incident: Suspected Repo Compromise

## 1. Initial Response
- Freeze releases immediately.
- Disable GitHub Actions if suspicious workflow activity is detected.
- Identify the first malicious commit and the compromised account.

## 2. Containment
- Rotate GitHub Personal Access Tokens (PATs) and fine-grained tokens for all maintainers.
- Invalidate cloud provider keys (AWS, GCP, Azure) used in CI/CD.
- Clear CI/CD caches and build artifacts.

## 3. Remediation
- Revert malicious commits and force-push to a known-good state if necessary (with extreme caution).
- Audit all recent dependency changes and lockfile updates.
- Re-review and re-approve all pending Pull Requests.

## 4. Evidence Preservation
- Preserve evidence bundles under `security/evidence/runs/<EVD-ID>/`.
- Export GitHub audit logs for the period of compromise.

## 5. Recovery
- Enable Actions with hardened policies.
- Force all maintainers to re-authenticate and verify their local security posture.
