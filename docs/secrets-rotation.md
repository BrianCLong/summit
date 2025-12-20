# Secrets rotation and leak-prevention playbook

## Unified secrets sources

- The platform now resolves secrets from environment variables first and can fall back to external providers (for example, Vault or KMS) when `allowFallback: true` is set on a secret reference.
- Keep existing environment variables in place—no breaking renames were introduced.
- Set `KEY_ROTATION=1` to activate multi-key signing/verification. When disabled, the first configured key remains primary.

## 5-minute rotation recipe

1. Export the current and next signing/encryption keys with stable `kid` values. Provide both through the unified secrets manager (env or external) so they can be verified together.
2. Enable rotation: `KEY_ROTATION=1` and set the overlap window (default 300s) to cover in-flight tokens.
3. Deploy the new key bundle; confirm the active `kid` matches the new key and that the previous `kid` still verifies during the overlap.
4. After 5 minutes, confirm no tokens are issued with the old `kid`, then remove the retired key from the bundle.
5. Revert `KEY_ROTATION` to its previous state if you need to pause automated promotion.

## Rollback steps

- If verification fails after rotation, reintroduce the previous key (with its original `kid`) to the bundle and redeploy with `KEY_ROTATION=1` to re-open the overlap window.
- If a key was removed too early, restore it alongside the current key and redeploy; tokens signed by that `kid` will verify again during the reopened overlap.
- For emergency freezes, set `KEY_ROTATION=0` to pin the first configured key while you investigate, then re-enable rotation once fixed.

## Leak prevention checklist

- CI runs gitleaks and fails the pipeline on any detected secret.
- Runtime logging scrubs bearer tokens, API keys, signing keys, and auth headers before emitting logs. Avoid logging raw secrets, and prefer structured fields so redaction stays consistent.
