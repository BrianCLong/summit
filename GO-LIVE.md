# GO-LIVE.md

## Summary

### What changed

**ArgoCD + SOPS**

- `deploy/argocd/repo-server-sops-patch.yaml` installs `sops` and `helm-secrets` in repo-server.
- `deploy/argocd/cmp-sops.yaml` registers the `sops-helm` CMP plugin.
- `deploy/argocd/apps/companyos-sops.yaml` uses the plugin to decrypt at render.

**ExternalDNS + IRSA (Terraform)**

- `infra/iam/externaldns/main.tf` creates IRSA provider, role & policy for Route53.
- Outputs `externaldns_role_arn` to annotate the ExternalDNS service account.
- `deploy/externaldns/values.yaml` references the IRSA role and filters `topicality.co`.

**Prod values generation (immutable)**

- `scripts/gen-values-prod.sh` pins image digests + injects IRSA ARNs.
- `scripts/gen-values-prod-autodiscover.sh` discovers AWS Account ID, cluster OIDC, and IRSA roles; then writes `charts/companyos/values-prod.yaml`.

**(Previously landed) Supply chain / Ops**

- CI `cosign` keyless signing; Kyverno/Gatekeeper policies.
- HPAs + resource budgets baked into charts.
- SBOM (Syft) + vuln scan (Grype) workflow.
- ExternalDNS annotations on Ingress; SealedSecrets + SOPS options.

### What to commit / share

The files above + an updated `GO-LIVE.md` (use the runbook below).

## One-touch deployment & verification runbook

### 0) Prereqs (once)

```bash
# kube context set to your EKS cluster
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
kubectl create ns ingress-nginx --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx

helm repo add jetstack https://charts.jetstack.io
kubectl create ns cert-manager --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install cert-manager jetstack/cert-manager -n cert-manager --set installCRDs=true
kubectl apply -f scripts/clusterissuer-letsencrypt.yaml

# (Recommended) ExternalDNS + IAM policy (so api/console hostnames auto-provision)
# (Recommended) Kyverno (enforce signed images) OR Gatekeeper (digest pinning demo)
```

### 1) ExternalDNS IRSA (Terraform)

```bash
terraform -chdir=infra/iam/externaldns init
terraform -chdir=infra/iam/externaldns apply \
  -var='eks_oidc_url=https://<EKS_OIDC_URL>' \
  -var='eks_oidc_thumbprint=<THUMBPRINT>' \
  -var='hosted_zone_ids=["ZXXXXXXXXXXXX"]'

# Take the output: externaldns_role_arn → set in deploy/externaldns/values.yaml
```

### 2) Install ExternalDNS

```bash
kubectl create ns external-dns --dry-run=client -o yaml | kubectl apply -f -
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm upgrade --install external-dns external-dns/external-dns \
  -n external-dns -f deploy/externaldns/values.yaml
```

### 3) Generate prod values with digests + ARNs

```bash
export AWS_REGION=us-west-2
export CLUSTER_NAME=summit-company-eks
./scripts/gen-values-prod-autodiscover.sh   # writes charts/companyos/values-prod.yaml
```

### 4) Deploy CompanyOS (immutable images)

```bash
kubectl create ns companyos --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install companyos charts/companyos \
  -n companyos -f charts/companyos/values-prod.yaml
```

### 5) Wire ArgoCD + SOPS (optional GitOps)

```bash
kubectl -n argocd patch deploy argocd-repo-server --type merge -p "$(cat deploy/argocd/repo-server-sops-patch.yaml)"
kubectl -n argocd apply -f deploy/argocd/cmp-sops.yaml
kubectl -n argocd apply -f deploy/argocd/apps/companyos-sops.yaml
```

### 6) DNS & TLS

Ensure A records exist or let ExternalDNS create them:

- `api.topicality.co` → Ingress LB
- `console.topicality.co` → Ingress LB

```bash
kubectl -n external-dns logs deploy/external-dns | tail -n 50
kubectl -n companyos get ingress
```

### 7) Supply-chain enforcement

```bash
# Kyverno verify-signature policy (enforces cosign keyless sigs)
kubectl apply -f k8s/policies/kyverno-require-cosign.yaml

# (alternative demo) Gatekeeper digest-pinning
kubectl apply -f k8s/policies/gatekeeper-template.yaml
kubectl apply -f k8s/policies/gatekeeper-constraint.yaml
```

### 8) Health & smoke tests

```bash
# Services/ingress
kubectl -n companyos get deploy,svc,ingress

# App checks
curl -I https://api.topicality.co/healthz
open https://console.topicality.co
```

### 9) HPA behavior (watch autoscaling)

```bash
kubectl -n companyos get hpa
kubectl -n companyos top pods
```

### 10) Cosign verification (out-of-band)

```bash
# Replace with your ECR registry + image
cosign verify $AWS_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/summit-company/core-intelgraph-api:latest
```

### “Done-done” checklist (copy/paste)

- [ ] Terraform `externaldns_role_arn` applied & annotated in `deploy/externaldns/values.yaml`
- [ ] `charts/companyos/values-prod.yaml` created with image digests + IRSA ARNs
- [ ] `helm upgrade --install companyos …` succeeds in `companyos` namespace
- [ ] ExternalDNS created/updated Route53 records for `api.*` and `console.*`
- [ ] TLS certs show Issued in `cert-manager`
- [ ] Kyverno policy applied; unsigned image admission is blocked
- [ ] SBOM artifacts uploaded by CI; Grype scan passes
- [ ] HPAs present and scaling under load
- [ ] ArgoCD SOPS path (if used) syncs cleanly
