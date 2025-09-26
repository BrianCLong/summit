# Security Operations

Configuration snippets for SPIRE server/agents, Vault policies, Vault agents, and Envoy mTLS.

- `spire-server.conf` — minimal SPIRE server configuration for issuing SVIDs.
- `vault-policy.hcl` — Vault policy granting intelgraph services access to namespaced secrets.
- `vault/intelgraph-vault-setup.yaml` — Kubernetes resources for Vault agent injection.
- `secrets-rotation-guide.md` — operational steps for rotating credentials in Vault and Docker.
- `envoy-mtls.yaml` — sample Envoy filter for enforcing mTLS.
