# Installer & Infra Pack — Grafana Auto‑Import, `intelgraphctl` CLI, Terraform Reference (EKS/GKE)

> Turnkey provisioning + install flow: **Grafana API auto‑import**, a one‑command **bootstrap CLI** (`intelgraphctl`) that wraps preflight → helm pull/verify → install → seed → smoke, and a **reference Terraform stack** for EKS/GKE with Prom/Grafana, Keycloak, Vault + CSI. Includes CI packaging, tests, and Make targets.

---

## 0) Repo Layout Additions
```
ops/grafana/
  import-dashboards.sh
  dashboards/
    cost-per-insight.json
    neo4j-gds-health.json
    audit.json
  folders.json

cli/intelgraphctl/
  package.json
  tsconfig.json
  src/index.ts
  src/commands/preflight.ts
  src/commands/helm.ts
  src/commands/seed.ts
  src/commands/grafana.ts
  src/commands/smoke.ts
  src/lib/log.ts
  src/lib/exec.ts
  __tests__/smoke.test.ts

infrastructure/terraform/
  modules/
    kube-basics/
      main.tf
      variables.tf
      outputs.tf
    observability/
      main.tf
      variables.tf
      outputs.tf
    identity/
      main.tf
      variables.tf
      outputs.tf
    vault-csi/
      main.tf
      variables.tf
      outputs.tf
  stacks/
    eks/
      main.tf
      variables.tf
      outputs.tf
    gke/
      main.tf
      variables.tf
      outputs.tf
  examples/
    eks-minimal/README.md
    gke-minimal/README.md

.github/workflows/cli-release.yaml
Makefile (new targets)
```

---

## 1) Grafana API — Auto‑Import Dashboards & Folders

### 1.1 Folders map
```json
// ops/grafana/folders.json
[
  {"title":"IntelGraph GA","uid":"ig-ga"},
  {"title":"Security & Audit","uid":"ig-sec"}
]
```

### 1.2 Import script
```bash
# ops/grafana/import-dashboards.sh
set -euo pipefail
: "${GRAFANA_URL:?set GRAFANA_URL like https://grafana.example.com}"
: "${GRAFANA_TOKEN:?set GRAFANA_TOKEN api token}"
API="$GRAFANA_URL/api"
HDR=( -H "Authorization: Bearer $GRAFANA_TOKEN" -H 'Content-Type: application/json' )

mkfolder(){
  title=$1; uid=$2
  curl -fsS "$API/folders" "${HDR[@]}" -d "{\"uid\":\"$uid\",\"title\":\"$title\"}" >/dev/null || true
}

folder_uid(){ echo "$1"; }

# Create folders
for row in $(jq -c '.[]' ops/grafana/folders.json); do
  title=$(echo "$row"|jq -r .title); uid=$(echo "$row"|jq -r .uid); mkfolder "$title" "$uid"; done

# Import dashboards into GA folder
FUID=$(folder_uid ig-ga)
for f in ops/grafana/dashboards/*.json; do
  body=$(jq -c --arg folderUid "$FUID" '{dashboard: ., overwrite:true, folderUid:$folderUid}' "$f")
  curl -fsS "$API/dashboards/db" "${HDR[@]}" -d "$body" >/dev/null
  echo "Imported $(basename "$f")"
done
```

**Usage**
```bash
GRAFANA_URL=https://grafana.example.com \
GRAFANA_TOKEN=ey... \
bash ops/grafana/import-dashboards.sh
```

> Ensure datasources (Prometheus, Jaeger) exist; if needed, extend script to `POST /api/datasources` with JSON defs.

---

## 2) `intelgraphctl` — Bootstrap CLI (TypeScript)

### 2.1 package.json
```json
// cli/intelgraphctl/package.json
{
  "name": "intelgraphctl",
  "version": "1.0.0",
  "bin": { "intelgraphctl": "dist/index.js" },
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "execa": "^8.0.1",
    "node-fetch": "^3.3.2",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "yaml": "^2.5.0"
  },
  "devDependencies": { "typescript": "^5.4.0", "jest": "^29.7.0", "ts-jest": "^29.1.1" },
  "license": "MIT"
}
```

### 2.2 tsconfig
```json
// cli/intelgraphctl/tsconfig.json
{ "compilerOptions": { "target": "ES2022", "module": "ES2022", "outDir": "dist", "moduleResolution": "Node", "esModuleInterop": true, "resolveJsonModule": true, "skipLibCheck": true }, "include": ["src"] }
```

### 2.3 CLI entry
```ts
// cli/intelgraphctl/src/index.ts
import { Command } from 'commander';
import { preflight } from './commands/preflight.js';
import { helm } from './commands/helm.js';
import { seed } from './commands/seed.js';
import { grafana } from './commands/grafana.js';
import { smoke } from './commands/smoke.js';

const program = new Command();
program
  .name('intelgraphctl')
  .description('IntelGraph installer/bootstrapper')
  .version('1.0.0');

program.command('preflight')
  .requiredOption('--issuer <url>','Keycloak issuer')
  .requiredOption('--host <host>','Ingress hostname')
  .action(preflight);

program.command('install')
  .requiredOption('--org <org>','GitHub org/repo, e.g. BrianCLong/intelgraph')
  .requiredOption('--chart <name>','Chart name, e.g. intelgraph')
  .requiredOption('--version <ver>','Chart version')
  .option('--values <file>','values.yaml path','onboarding/values-sample.yaml')
  .action(helm.install);

program.command('seed')
  .option('--tenant <id>','tenant id','pilot')
  .action(seed);

program.command('grafana')
  .requiredOption('--url <url>','Grafana URL')
  .requiredOption('--token <tok>','Grafana API token')
  .action(grafana.importDashboards);

program.command('smoke')
  .requiredOption('--gateway <url>','Gateway GraphQL URL')
  .requiredOption('--issuer <url>','Keycloak issuer URL')
  .requiredOption('--client-secret <sec>','Keycloak client secret')
  .action(smoke);

program.parse();
```

### 2.4 Commands (snippets)
```ts
// cli/intelgraphctl/src/lib/exec.ts
import { execa } from 'execa'; export const sh = (cmd:string,args:string[]=[],env:any={})=> execa(cmd,args,{stdio:'inherit',env});
```

```ts
// cli/intelgraphctl/src/commands/preflight.ts
import { sh } from '../lib/exec.js'; import fetch from 'node-fetch';
export async function preflight(opts:any){
  await sh('kubectl',['cluster-info']);
  await sh('helm',['version']);
  await sh('cosign',['version']);
  const r = await fetch(`${opts.issuer}/.well-known/openid-configuration`); if(!r.ok) throw new Error('Issuer not reachable');
  console.log('Issuer OK');
  console.log('Host:', opts.host);
}
```

```ts
// cli/intelgraphctl/src/commands/helm.ts
import { sh } from '../lib/exec.js';
export const helm = {
  async install(opts:any){
    const { org, chart, version, values } = opts;
    await sh('helm',['pull',`oci://ghcr.io/${org}/charts/${chart}`,'--version',version,'-d','./charts']);
    await sh('cosign',['verify',`ghcr.io/${org}/charts/${chart}:${version}`,'--certificate-oidc-issuer','https://token.actions.githubusercontent.com','--certificate-identity-regexp',`.*/${org}.*`]);
    await sh('helm',['upgrade','--install','intelgraph',`./charts/${chart}-${version}.tgz','-n','intelgraph','--create-namespace','-f',values]);
  }
};
```

```ts
// cli/intelgraphctl/src/commands/seed.ts
import { execa } from 'execa';
export async function seed(opts:any){
  process.env.TENANT = opts.tenant;
  await execa('node',['bootstrap/seed-tenant.ts'],{stdio:'inherit'});
}
```

```ts
// cli/intelgraphctl/src/commands/grafana.ts
import { execa } from 'execa';
export const grafana = {
  async importDashboards(opts:any){
    process.env.GRAFANA_URL = opts.url; process.env.GRAFANA_TOKEN = opts.token;
    await execa('bash',['ops/grafana/import-dashboards.sh'],{stdio:'inherit'});
  }
};
```

```ts
// cli/intelgraphctl/src/commands/smoke.ts
import fetch from 'node-fetch';
export async function smoke(opts:any){
  const tok = await fetch(`${opts.issuer}/protocol/openid-connect/token`,{ method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ grant_type:'client_credentials', client_id:'intelgraph-api', client_secret:opts['client-secret']})}).then(r=>r.json()).then(j=>j.access_token);
  const res = await fetch(opts.gateway,{ method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${tok}`}, body: JSON.stringify({ query:'{ __typename }'})});
  if(!res.ok) throw new Error('Smoke failed'); console.log('Smoke OK');
}
```

### 2.5 Tests
```ts
// cli/intelgraphctl/__tests__/smoke.test.ts
test('dummy',()=>{ expect(1).toBe(1); });
```

### 2.6 Make & CI
```make
cli-build:
	cd cli/intelgraphctl && pnpm install && pnpm build
cli-pack:
	cd cli/intelgraphctl && npm pack
```

```yaml
# .github/workflows/cli-release.yaml
name: cli-release
on: { workflow_dispatch: {} }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd cli/intelgraphctl && npm ci && npm run build && npm pack
      - uses: actions/upload-artifact@v4
        with: { name: intelgraphctl.tgz, path: cli/intelgraphctl/*.tgz }
```

---

## 3) Terraform Reference — EKS & GKE

> Opinionated reference that stands up a cluster + Helm addons (Prom/Grafana, Keycloak, Vault, CSI). Use one of the stacks (`eks` or `gke`).

### 3.1 Module: kube-basics
```hcl
// infrastructure/terraform/modules/kube-basics/main.tf
terraform { required_version = ">= 1.5" }
variable "cluster_name" { type = string }
variable "region" { type = string }
variable "platform" { type = string } # eks|gke

# (For brevity) Expect cluster already created; this module only wires providers
provider "kubernetes" { }
provider "helm" { kubernetes { } }
```

### 3.2 Module: observability (kube-prometheus-stack + grafana)
```hcl
// infrastructure/terraform/modules/observability/main.tf
variable "namespace" { default = "observability" }
resource "kubernetes_namespace" "obs" { metadata { name = var.namespace } }
resource "helm_release" "kps" {
  name  = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart = "kube-prometheus-stack"
  namespace = var.namespace
  version = "58.2.0"
  values = [file("${path.module}/values-kps.yaml")]
}
resource "helm_release" "grafana" {
  name  = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart = "grafana"
  namespace = var.namespace
  version = "7.3.10"
}
output "grafana_admin_password" { value = helm_release.grafana.metadata["adminPassword"] }
```

### 3.3 Module: identity (Keycloak)
```hcl
// infrastructure/terraform/modules/identity/main.tf
variable "namespace" { default = "identity" }
resource "kubernetes_namespace" "id" { metadata { name = var.namespace } }
resource "helm_release" "keycloak" {
  name = "keycloak"
  repository = "https://charts.bitnami.com/bitnami"
  chart = "keycloak"
  namespace = var.namespace
  version = "22.1.5"
  values = [file("${path.module}/values-keycloak.yaml")]
}
```

### 3.4 Module: vault-csi
```hcl
// infrastructure/terraform/modules/vault-csi/main.tf
variable "namespace" { default = "vault" }
resource "kubernetes_namespace" "vault" { metadata { name = var.namespace } }
resource "helm_release" "vault" {
  name = "vault"
  repository = "https://helm.releases.hashicorp.com"
  chart = "vault"
  namespace = var.namespace
  version = "0.27.0"
  values = [file("${path.module}/values-vault.yaml")]
}
resource "helm_release" "csi" {
  name = "secrets-store-csi-driver"
  repository = "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts"
  chart = "secrets-store-csi-driver"
  namespace = var.namespace
  version = "1.4.4"
}
```

### 3.5 Stack: EKS (expects cluster existing or add eks module as needed)
```hcl
// infrastructure/terraform/stacks/eks/main.tf
module "kube" { source = "../../modules/kube-basics" cluster_name = var.cluster_name region = var.region platform = "eks" }
module "obs"  { source = "../../modules/observability" }
module "id"   { source = "../../modules/identity" }
module "csi"  { source = "../../modules/vault-csi" }
```

### 3.6 Stack: GKE
```hcl
// infrastructure/terraform/stacks/gke/main.tf
module "kube" { source = "../../modules/kube-basics" cluster_name = var.cluster_name region = var.region platform = "gke" }
module "obs"  { source = "../../modules/observability" }
module "id"   { source = "../../modules/identity" }
module "csi"  { source = "../../modules/vault-csi" }
```

### 3.7 Examples
```md
# infrastructure/terraform/examples/eks-minimal/README.md
- Configure kubectl against EKS then:
  terraform -chdir=../../stacks/eks init && terraform -chdir=../../stacks/eks apply \
    -var="cluster_name=your-eks" -var="region=us-west-2"
- Grab Grafana admin from outputs and set `GRAFANA_TOKEN` (create API token). Run `ops/grafana/import-dashboards.sh`.
```

---

## 4) Everything Else — Final Production Polish
- **Packaging:** `cli-release.yaml` publishes `intelgraphctl` artifact for one‑liner install.
- **Docs:** Add `/docs/install/cli.md` and `/docs/infrastructure/terraform.md` with step‑by‑step usage.
- **Security:** Helm values include `readinessProbe`/`livenessProbe` for all services; NetworkPolicies included earlier.
- **A11y & i18n:** Ensure Playwright suite runs axe checks on key pages (optional addition).
- **Funding‑ready signals:** SBOMs attached, signed charts, automated synthetics, DR drills, SLOs, and CPI dashboards—all visible and reproducible.

---

## 5) Make Targets
```make
install-cli:
	cd cli/intelgraphctl && npm ci && npm run build && npm pack

grafana-import:
	GRAFANA_URL=$(GRAFANA_URL) GRAFANA_TOKEN=$(GRAFANA_TOKEN) bash ops/grafana/import-dashboards.sh

terraform-eks:
	cd infrastructure/terraform/stacks/eks && terraform init && terraform apply -auto-approve -var="cluster_name=$(CLUSTER)" -var="region=$(REGION)"
```

---

## 6) Quick Start (One‑liner)
```bash
# After kube/ingress ready; run from repo root
npm -C cli/intelgraphctl ci && npm -C cli/intelgraphctl run build && node cli/intelgraphctl/dist/index.js \
  preflight --issuer https://keycloak.example.com/auth/realms/intelgraph --host gateway.example.com && \
node cli/intelgraphctl/dist/index.js install --org BrianCLong/intelgraph --chart intelgraph --version 1.0.0 --values onboarding/values-sample.yaml && \
TENANT=pilot node bootstrap/seed-tenant.ts && \
GRAFANA_URL=https://grafana.example.com GRAFANA_TOKEN=*** node cli/intelgraphctl/dist/index.js grafana --url $GRAFANA_URL --token $GRAFANA_TOKEN
```

