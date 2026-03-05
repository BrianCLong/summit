# Switchboard Skill Trust Model

## Purpose

Define the trust ladder for skills and the enforcement mechanics that keep the ecosystem safe while remaining developer-friendly.

## Trust Ladder

1. **Verified**
   - Signed bundles with pinned digests.
   - Mandatory sandbox probes.
   - Capability linting and policy compatibility checks.
   - Required deterministic receipts on success.
2. **Community**
   - Signed bundles with warnings.
   - Limited capability scopes and egress caps.
   - Default-on redaction for receipts.
3. **Private**
   - Tenant-only distribution.
   - Strict allowlist of capabilities.
   - Mandatory sandbox probes and receipts.

## Mandatory Controls

- **Signed bundles**: All skills are signed; verification is enforced at install and run.
- **Capability scopes**: Skills declare the minimum set of permissions; policy engine enforces.
- **Sandbox probes**: All skills must pass network, filesystem, and process probes.
- **Receipts**: Each execution emits a receipt with inputs, outputs, policy decisions, and hashes.

## Lifecycle

1. **Publish**
   - Author signs bundle and submits metadata.
2. **Review**
   - Automated probes + policy lint.
   - Verified tier requires human review.
3. **Distribute**
   - Signed bundle + digest pinned in registry.
4. **Run**
   - Verify signature → enforce policy → run in sandbox → emit receipt.

## Rejection Criteria

- Undeclared network access or process execution.
- Failing probes (egress, private network access).
- Missing capability declaration.
- Non-deterministic receipt emission.

## Governance Outputs

- Evidence bundle with probe results, signing metadata, and capability lint reports.
- Deterministic replay report for Verified skills.
