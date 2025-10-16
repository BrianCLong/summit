# Secrets Management

Options:

- External Secrets Operator + Vault
  - Install ESO and Vault SecretStore.
  - Enable `externalSecrets.enabled` in chart values (e.g., `helm/server`).
  - Secrets are synced into K8s Secrets consumed by pods.

- SOPS + GitOps
  - Configure `.sops.yaml` and encrypt `*-secret.yaml` files.
  - Decrypt during deploy with a CI runner that has key access.

Never commit plaintext secrets. Use `.env.example` as reference only.
