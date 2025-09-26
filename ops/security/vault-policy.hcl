# Vault policy granting the intelgraph services scoped access to Vault KV v2 secrets
path "secret/data/intelgraph/*" {
  capabilities = ["read"]
}

path "secret/metadata/intelgraph/*" {
  capabilities = ["read", "list"]
}
