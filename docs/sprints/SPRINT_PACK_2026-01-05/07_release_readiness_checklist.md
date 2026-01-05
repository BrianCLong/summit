# Release Readiness Checklist

## Governance & Authority Alignment

- [ ] Sprint outcome aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.
- [ ] All changes comply with `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`.
- [ ] PRs contain the AGENT-METADATA block per `.github/PULL_REQUEST_TEMPLATE.md`.

## CI / Quality Gates

- [ ] `pr-quality-gate.yml` green.
- [ ] `ga-ready.yml` green.
- [ ] `release-integrity.yml` green.
- [ ] `supply-chain-integrity.yml` green.
- [ ] `scripts/check-boundaries.cjs` green.

## Security & Compliance

- [ ] `pnpm audit --prod` completed and triaged.
- [ ] Secret scan signal clean for runtime code (`rg -n "AKIA[0-9A-Z]{16}" -S server/src`).
- [ ] OPA policy evaluation errors addressed or explicitly handled via policy-as-code.
- [ ] Immutable audit log persistence + tamper-evidence verified.
- [ ] SBOM scan workflow (`sbom-scan.yml`) green.

## Product & Reliability

- [ ] `pnpm --filter intelgraph-server test` green.
- [ ] `make smoke` green.
- [ ] Governance acceptance tests green.

## Documentation & Status

- [ ] `docs/roadmap/STATUS.json` updated with sprint results.
- [ ] Release notes drafted (see `08_release_notes_draft.md`).
