# Extension Compatibility Policy

## Purpose

This policy defines supported version ranges, breaking-change handling, deprecation signals, and support tiers for Summit extensions.

## Authority

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/releases/MVP-4_GA_BASELINE.md`
- `docs/releases/GA-CORE-RELEASE-NOTES.md`
- `docs/release/GA_EVIDENCE_INDEX.md`
- `docs/security/SECURITY_REMEDIATION_LEDGER.md`

## Supported Versions

- Extensions must declare compatible Summit versions using semantic version ranges.
- Compatibility must align to GA baseline behavior, including deterministic error handling.
- Extensions must not claim GA status unless explicitly listed in a GA authority file.

## Breaking-Change Handling

- Breaking changes require a major version increment in the extension.
- Extensions must document any change that alters data contracts, policy behavior, or provenance outputs.
- Extensions must provide migration steps inside their own release notes.

## Deprecation Signals

- Deprecations must be explicit in extension documentation and release notes.
- Deprecations must preserve policy-as-code enforcement and evidence capture.

## Support Tiers

- **Supported**: Extension is documented, has current verification evidence, and is approved by governance.
- **Best Effort**: Extension is documented but lacks governance approval or current evidence.

## Governed Exceptions

Any deviation from this policy is a **Governed Exception** and requires approval with evidence.
