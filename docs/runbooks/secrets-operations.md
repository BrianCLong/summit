# Secrets operations runbook

## Authoring

1. Copy a template from `secrets/templates` into `secrets/envs/<env>/<name>.enc.yaml`.
2. Edit `stringData` fields in plaintext, then run `make secrets/encrypt path=...`.
3. Commit the encrypted file only. Ensure CODEOWNERS approvals include `@sec/appsec` and `@platform/devops`.

## Sealing & deploy

1. Trigger `Seal Secrets` GitHub Action or run `.ci/scripts/secrets/seal.sh <env> <actor>` with `AGE_ORG_PRIVATE_KEY` and `KUBESEAL_CERT` exported.
2. Commit resulting `deploy/helm/intelgraph/secrets/*.sealed.yaml` files.
3. Deploy via Helm; pods consume secrets via mounted volumes/env.

## Rotation (blue/green)

1. Run `make secrets/rotate name=FOO_KEY` to generate a v2 value.
2. Add `_v2` alongside `_v1` in the secret; seal and deploy.
3. Flip consumers to `_v2`, monitor, then remove `_v1` in a follow-up PR.

## Break-glass

- Requires VP Security approval and incident ticket.
- Retrieve org private key from vault, document reason-for-access, and time-bound the session.
- After use, rotate any touched secrets and attach audit log to the incident record.

## Troubleshooting

- `sops --verify` failing: ensure `.sops.yaml` matches path and AGE key is loaded.
- Kubeseal errors: verify cert freshness and namespace/name match sealed template.
- CI failures: download `secrets-audit` artifact for path and hash history.
