# Extension Review Checklist

Use this checklist to approve or endorse an extension. All items must be satisfied or documented as a **Governed Exception**.

## Authority Alignment

- [ ] Extension scope aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.
- [ ] Extension scope aligns with `docs/releases/MVP-4_GA_BASELINE.md`.
- [ ] Extension documentation references `docs/releases/GA-CORE-RELEASE-NOTES.md` where relevant.
- [ ] Evidence references mapped to `docs/release/GA_EVIDENCE_INDEX.md`.
- [ ] Security posture recorded in `docs/security/SECURITY_REMEDIATION_LEDGER.md`.

## Architecture Fit

- [ ] Extension does not bypass policy-as-code or identity enforcement.
- [ ] Extension does not modify provenance or audit outputs.
- [ ] Extension does not introduce hidden data egress.
- [ ] Extension behavior remains deterministic on invalid input.

## Security Posture

- [ ] Dependency inventory recorded with licenses and versions.
- [ ] High-severity vulnerability scan results attached.
- [ ] Secret handling documented and verified.
- [ ] Logging avoids PII and respects data boundaries.

## Evidence Provided

- [ ] Unit verification evidence attached.
- [ ] Integration verification evidence attached.
- [ ] Evidence artifacts are labeled with scope and date.

## Maintenance Expectations

- [ ] Supported Summit version range declared.
- [ ] On-call or owner contact recorded.
- [ ] Change classification recorded (patch | minor | major).

## Governed Exceptions

- [ ] Any deviation is documented with rationale and approving authority.
