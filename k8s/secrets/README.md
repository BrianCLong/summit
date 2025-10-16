# Secrets approaches

## Option A: SealedSecrets (Bitnami)

- Install controller: `helm repo add bitnami https://charts.bitnami.com/bitnami && helm upgrade --install sealed-secrets bitnami/sealed-secrets -n kube-system`
- Use `scripts/seal-secret.sh` to produce SealedSecret manifests in `k8s/secrets/*.sealed.yaml`

## Option B: SOPS + age

- Generate age key: `age-keygen -o key.txt`; export public key into `.sops.yaml`
- Encrypt: `sops --encrypt --in-place k8s/secrets/example.enc.yaml`
- Decrypt on deploy: integrate with ArgoCD SOPS plugin or Helmfile `helmDefaults.kubeContext` + `secrets` plugin.
