# Green Runbook Drill – Golden Path Platform

## Purpose

Validate that on-call engineers can execute the paved-road rollback and recovery procedures within 30 minutes.

## Scenario

- Introduce a synthetic latency fault in `hello-service` deployment in the stage environment.
- Allow CI/CD to deploy the faulty artifact with valid signatures.
- Detect alert via synthetic monitor breach.

## Drill Steps

1. **Detection**: Confirm alert in monitoring dashboard and incident channel.
2. **Evidence Collection**: Download SBOM, provenance, cosign signatures from the release artifacts bucket.
3. **Policy Verification**: Execute `task opa:check` with real input data.
4. **Rollback**: Follow `docs/rollback-playbook.md` to revert to previous revision.
5. **Validation**: Run smoke tests (`scripts/smoke-test.sh` placeholder) ensuring SLO recovery.
6. **Documentation**: Update runbook drill log with timing, owners, and improvements.

## Success Criteria

- Drill completed ≤ 30 minutes.
- No manual step deviates from documented process.
- Evidence archived in compliance storage.
