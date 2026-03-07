# age key custody and rotation

## Custody model

- **Org age keypair**: Generated via `make secrets/bootstrap`. The public key is committed at `.security/keys/age-org.pub`; the private key lives only in `security/key-vault` (outside git) and the CI secret store (`AGE_ORG_PRIVATE_KEY`).
- **Access**: Developers use delegated personal age keys added as additional recipients in `.sops.yaml`. Only the platform security team can read the org private key.
- **Storage**: Private key is stored in an HSM-backed vault with rotation metadata (issuer, timestamp, ticket).

## Rotation

- Run `make secrets/rotate name=<SECRET_NAME>` to create blue/green versions and reseal manifests.
- Rotate the org age key quarterly: generate a new keypair, update `.security/keys/age-org.pub`, refresh CI secrets, and re-seal all environments via `make secrets/bootstrap && make secrets/lint`.
- Keep the previous key available for 7 days after rotation to allow decrypting legacy ciphertext while resealing completes.

## Break-glass

- Break-glass access requires VP Security approval plus incident ticket. Retrieve the private key from the vault with reason-for-access recorded. Access grants are time-bounded (≤1 hour) and audited.
- After use: re-encrypt any touched secrets immediately, rotate impacted secrets, and attach the audit record to the incident postmortem.
