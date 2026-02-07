package secrets
import future.keywords.if
import future.keywords.in
import future.keywords.contains

import data.inventory

# Fail if potential plaintext secret keywords are found
violation[msg] {
  inventory.files[f]
  f.content =~ /(?i)(password|secret|token|apikey)[:=]\s*["']?[A-Za-z0-9_\-]{12,}/
  msg := sprintf("potential plaintext secret in %s", [f.path])
}

# Enforce SOPS-encrypted files under secrets/envs
violation[msg] {
  inventory.files[f]
  startswith(f.path, "secrets/envs/")
  not endswith(f.path, ".enc.yaml")
  msg := sprintf("unencrypted secret file detected: %s", [f.path])
}

# SealedSecret annotations must enforce immutability and namespace
violation[msg] {
  some f
  inventory.kubernetes[f]
  f.kind == "SealedSecret"
  not f.metadata.annotations["sealedsecrets.bitnami.com/immutable"]
  msg := sprintf("sealed secret missing immutability annotation: %s", [f.metadata.name])
}

violation[msg] {
  some f
  inventory.kubernetes[f]
  f.kind == "SealedSecret"
  not f.metadata.namespace
  msg := sprintf("sealed secret missing namespace: %s", [f.metadata.name])
}

# Helm values should not contain inline secret literals
violation[msg] {
  inventory.files[f]
  contains(f.path, "values.yaml")
  f.content =~ /(?i)(password|secret|token)[:=]\s*["']?[A-Za-z0-9_\-]{12,}/
  msg := sprintf("inline secret literal in Helm values: %s", [f.path])
}
