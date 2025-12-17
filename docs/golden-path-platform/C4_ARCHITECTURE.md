# C4-Style Platform Overview

> **Version**: 1.0.0
> **Last Updated**: 2025-12-06

This document provides a C4-model architecture overview of the Golden Path Platform for CompanyOS.

---

## Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  SYSTEM CONTEXT                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│    ┌──────────────┐         ┌──────────────────────────────────┐                    │
│    │  Developers  │────────▶│     Golden Path Platform         │                    │
│    │              │         │                                  │                    │
│    │ • Create     │         │  • Service scaffolding           │                    │
│    │   services   │         │  • CI/CD orchestration           │                    │
│    │ • Deploy     │         │  • Policy enforcement            │                    │
│    │   changes    │         │  • Observability integration     │                    │
│    │ • Monitor    │         │                                  │                    │
│    │   systems    │         └──────────────────────────────────┘                    │
│    └──────────────┘                        │                                        │
│                                            │                                        │
│    ┌──────────────┐                        ▼                                        │
│    │   Security   │         ┌──────────────────────────────────┐                    │
│    │     Team     │────────▶│      Production Services         │                    │
│    │              │         │                                  │                    │
│    │ • Audit      │         │  • API Services                  │                    │
│    │ • Policies   │         │  • Workers                       │                    │
│    │ • Compliance │         │  • Batch Jobs                    │                    │
│    └──────────────┘         │  • Data Services                 │                    │
│                             │  • Frontends                     │                    │
│    ┌──────────────┐         └──────────────────────────────────┘                    │
│    │     SRE      │                        │                                        │
│    │     Team     │                        ▼                                        │
│    │              │         ┌──────────────────────────────────┐                    │
│    │ • Incidents  │────────▶│     External Systems             │                    │
│    │ • SLOs       │         │                                  │                    │
│    │ • Capacity   │         │  • GitHub (source control)       │                    │
│    └──────────────┘         │  • Container Registry            │                    │
│                             │  • Kubernetes Clusters           │                    │
│                             │  • Observability Stack           │                    │
│                             └──────────────────────────────────┘                    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### System Context Description

| Element | Type | Description |
|---------|------|-------------|
| **Developers** | Person | Engineers who create, deploy, and maintain services |
| **Security Team** | Person | Responsible for security policies, audits, and compliance |
| **SRE Team** | Person | Manages reliability, incidents, and capacity planning |
| **Golden Path Platform** | System | The platform providing standardized development experience |
| **Production Services** | System | Deployed services running in Kubernetes |
| **External Systems** | System | Third-party and infrastructure dependencies |

---

## Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GOLDEN PATH PLATFORM                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           DEVELOPER EXPERIENCE                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │   Scaffold CLI  │  │    Templates    │  │  Documentation  │             │   │
│  │  │                 │  │    Repository   │  │      Portal     │             │   │
│  │  │ • companyos     │  │                 │  │                 │             │   │
│  │  │   create        │  │ • API Service   │  │ • Guides        │             │   │
│  │  │ • companyos     │  │ • Worker        │  │ • API Reference │             │   │
│  │  │   migrate       │  │ • Batch Job     │  │ • Examples      │             │   │
│  │  │ • companyos     │  │ • Data Service  │  │ • Runbooks      │             │   │
│  │  │   validate      │  │ • Frontend      │  │                 │             │   │
│  │  └────────┬────────┘  └────────┬────────┘  └─────────────────┘             │   │
│  └───────────┼────────────────────┼─────────────────────────────────────────────┘   │
│              │                    │                                                  │
│              ▼                    ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                              CI/CD LAYER                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │ Reusable        │  │  Build System   │  │   Artifact      │             │   │
│  │  │ Workflows       │  │                 │  │   Management    │             │   │
│  │  │                 │  │ • Docker        │  │                 │             │   │
│  │  │ • Lint          │  │   BuildKit      │  │ • Container     │             │   │
│  │  │ • Test          │  │ • Turbo Cache   │  │   Registry      │             │   │
│  │  │ • Security      │  │ • pnpm Store    │  │ • SBOM Store    │             │   │
│  │  │ • Build         │  │                 │  │ • Cosign        │             │   │
│  │  │ • Deploy        │  │                 │  │   Signatures    │             │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │   │
│  └───────────┼────────────────────┼────────────────────┼────────────────────────┘   │
│              │                    │                    │                            │
│              ▼                    ▼                    ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                            GOVERNANCE LAYER                                  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │  Policy Engine  │  │ Admission       │  │  Audit Ledger   │             │   │
│  │  │     (OPA)       │  │ Controller      │  │                 │             │   │
│  │  │                 │  │  (Kyverno)      │  │ • Deployment    │             │   │
│  │  │ • ABAC          │  │                 │  │   records       │             │   │
│  │  │ • Deploy gates  │  │ • Image policy  │  │ • Policy        │             │   │
│  │  │ • Error budget  │  │ • Pod security  │  │   decisions     │             │   │
│  │  │ • Compliance    │  │ • Network       │  │ • Exceptions    │             │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │   │
│  └───────────┼────────────────────┼────────────────────┼────────────────────────┘   │
│              │                    │                    │                            │
│              ▼                    ▼                    ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                          RUNTIME PLATFORM                                    │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │   Kubernetes    │  │  Service Mesh   │  │  Observability  │             │   │
│  │  │                 │  │    (Istio)      │  │     Stack       │             │   │
│  │  │ • EKS/GKE       │  │                 │  │                 │             │   │
│  │  │ • Argo Rollouts │  │ • mTLS          │  │ • Prometheus    │             │   │
│  │  │ • KEDA          │  │ • Traffic mgmt  │  │ • Grafana       │             │   │
│  │  │ • Sealed        │  │ • Observability │  │ • Loki          │             │   │
│  │  │   Secrets       │  │                 │  │ • Tempo         │             │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘             │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Container Descriptions

| Container | Technology | Purpose |
|-----------|------------|---------|
| **Scaffold CLI** | Node.js CLI | Generates new services from templates |
| **Templates Repository** | Git + YAML/JSON | Stores service archetypes and configurations |
| **Documentation Portal** | Docusaurus/MkDocs | Developer guides and API reference |
| **Reusable Workflows** | GitHub Actions | Composable CI/CD pipeline stages |
| **Build System** | Docker BuildKit, Turbo | Container and package builds |
| **Artifact Management** | ECR/GAR, Cosign | Image storage and signing |
| **Policy Engine (OPA)** | Open Policy Agent | Runtime policy decisions |
| **Admission Controller** | Kyverno | Kubernetes admission policies |
| **Audit Ledger** | PostgreSQL + API | Deployment and policy audit trail |
| **Kubernetes** | EKS/GKE | Container orchestration |
| **Service Mesh** | Istio | mTLS, traffic management |
| **Observability Stack** | Prometheus, Grafana, Loki, Tempo | Metrics, logs, traces |

---

## Level 3: Component Diagram - Scaffold CLI

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                 SCAFFOLD CLI                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                              CLI INTERFACE                                   │   │
│  │                                                                              │   │
│  │   companyos create <type> --name <name> [options]                           │   │
│  │   companyos migrate <service> --to-version <version>                        │   │
│  │   companyos validate <service>                                              │   │
│  │   companyos doctor                                                          │   │
│  │                                                                              │   │
│  └──────────────────────────────────┬──────────────────────────────────────────┘   │
│                                     │                                               │
│                                     ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                           COMMAND HANDLERS                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │CreateCommand │  │MigrateCommand│  │ValidateCmd   │  │ DoctorCmd    │     │  │
│  │  │             │  │              │  │              │  │              │     │  │
│  │  │ • Parse args │  │ • Detect ver │  │ • Run linter │  │ • Check deps │     │  │
│  │  │ • Validate  │  │ • Plan diff  │  │ • Check SLOs │  │ • Verify env │     │  │
│  │  │ • Execute   │  │ • Apply      │  │ • Test CI    │  │ • Test conn  │     │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │  │
│  └─────────┼─────────────────┼─────────────────┼─────────────────┼──────────────┘  │
│            │                 │                 │                 │                  │
│            ▼                 ▼                 ▼                 ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                             CORE SERVICES                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │ Template Engine  │  │ Config Manager   │  │  File Generator  │           │  │
│  │  │                  │  │                  │  │                  │           │  │
│  │  │ • Load templates │  │ • Zod schemas    │  │ • Create dirs    │           │  │
│  │  │ • Variable sub   │  │ • Defaults       │  │ • Write files    │           │  │
│  │  │ • Conditionals   │  │ • Validation     │  │ • Set perms      │           │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │  │
│  │                                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │ Git Integration  │  │ Package Manager  │  │   Post-Hooks     │           │  │
│  │  │                  │  │                  │  │                  │           │  │
│  │  │ • Init repo      │  │ • pnpm install   │  │ • Run build      │           │  │
│  │  │ • Initial commit │  │ • Link workspace │  │ • Run lint       │           │  │
│  │  │ • Branch setup   │  │ • Lock file      │  │ • Print next     │           │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                           TEMPLATE REGISTRY                                   │  │
│  │                                                                              │  │
│  │   ~/.companyos/templates/                                                    │  │
│  │   ├── api-service/                                                          │  │
│  │   │   ├── template.yaml          # Template metadata                        │  │
│  │   │   └── files/                 # Template files                           │  │
│  │   ├── worker/                                                               │  │
│  │   ├── batch-job/                                                            │  │
│  │   ├── data-service/                                                         │  │
│  │   ├── frontend/                                                             │  │
│  │   └── library/                                                              │  │
│  │                                                                              │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level 3: Component Diagram - CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD PIPELINE SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                          GITHUB ACTIONS RUNNER                               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                              │
│                                      ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        REUSABLE WORKFLOW ORCHESTRATOR                        │   │
│  │                                                                              │   │
│  │   _golden-path-pipeline.yml                                                  │   │
│  │   ├── Triggers: push, pull_request, workflow_dispatch                       │   │
│  │   ├── Inputs: service, environment, skip_*, overrides                       │   │
│  │   └── Jobs: lint → test → security → build → deploy → verify → promote      │   │
│  │                                                                              │   │
│  └──────────────────────────────────┬──────────────────────────────────────────┘   │
│                                     │                                               │
│         ┌───────────────────────────┼───────────────────────────┐                  │
│         ▼                           ▼                           ▼                  │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐             │
│  │  _lint.yml  │            │  _test.yml  │            │_security.yml│             │
│  │             │            │             │            │             │             │
│  │ • ESLint    │            │ • Jest      │            │ • CodeQL    │             │
│  │ • Prettier  │            │ • pytest    │            │ • Gitleaks  │             │
│  │ • TypeCheck │            │ • Coverage  │            │ • Trivy     │             │
│  └─────────────┘            └─────────────┘            │ • License   │             │
│                                                        └─────────────┘             │
│         ┌───────────────────────────┼───────────────────────────┐                  │
│         ▼                           ▼                           ▼                  │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐             │
│  │ _build.yml  │            │ _deploy.yml │            │ _verify.yml │             │
│  │             │            │             │            │             │             │
│  │ • BuildKit  │            │ • Helm      │            │ • Health    │             │
│  │ • Cosign    │            │ • ArgoCD    │            │ • Smoke     │             │
│  │ • SBOM      │            │ • OPA gate  │            │ • SLO check │             │
│  └─────────────┘            └─────────────┘            └─────────────┘             │
│                                     │                                               │
│                                     ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           PROMOTION CONTROLLER                               │   │
│  │                                                                              │   │
│  │   _promote.yml                                                               │   │
│  │   ├── Canary Analysis (Prometheus queries)                                   │   │
│  │   ├── Progressive Traffic Shift (10% → 50% → 100%)                          │   │
│  │   ├── Automatic Rollback on SLO violation                                   │   │
│  │   └── Post-deploy monitoring and alerting                                    │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level 3: Component Diagram - Governance Layer

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GOVERNANCE LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         POLICY DECISION POINT (OPA)                          │   │
│  │                                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │  ABAC Policies  │  │ Deploy Policies │  │Budget Policies  │             │   │
│  │  │                 │  │                 │  │                 │             │   │
│  │  │ • Tenant check  │  │ • Image signed  │  │ • Error budget  │             │   │
│  │  │ • Purpose check │  │ • Freeze check  │  │ • Rate limits   │             │   │
│  │  │ • Role check    │  │ • Env gates     │  │ • Cost quotas   │             │   │
│  │  │ • PII handling  │  │ • Rollback req  │  │ • Burn rate     │             │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘             │   │
│  │                                                                              │   │
│  │  Policy Bundle Server: policies.companyos.internal                          │   │
│  │  Update Frequency: Every 5 minutes (pull-based)                             │   │
│  │  Decision Log: Shipped to audit ledger                                       │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                    ADMISSION CONTROLLER (KYVERNO)                            │   │
│  │                                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │   │
│  │  │  Image Policy   │  │   Pod Security  │  │ Network Policy  │             │   │
│  │  │                 │  │                 │  │                 │             │   │
│  │  │ • Signed only   │  │ • No privileged │  │ • Default deny  │             │   │
│  │  │ • Registry      │  │ • Drop caps     │  │ • Egress rules  │             │   │
│  │  │   allowlist     │  │ • Read-only fs  │  │ • Service mesh  │             │   │
│  │  │ • Tag patterns  │  │ • Non-root      │  │   required      │             │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘             │   │
│  │                                                                              │   │
│  │  Enforcement Mode: Audit (staging), Enforce (production)                     │   │
│  │  Policy Reports: Exported to Prometheus metrics                              │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           AUDIT LEDGER                                       │   │
│  │                                                                              │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐   │   │
│  │  │                         Event Types                                  │   │   │
│  │  │                                                                      │   │   │
│  │  │  • deployment.created    • policy.evaluated    • exception.granted  │   │   │
│  │  │  • deployment.promoted   • policy.violated     • exception.expired  │   │   │
│  │  │  • deployment.rolled_back• policy.bypassed     • audit.accessed     │   │   │
│  │  │                                                                      │   │   │
│  │  └─────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                              │   │
│  │  Storage: PostgreSQL with append-only tables                                │   │
│  │  Retention: 7 years (compliance requirement)                                │   │
│  │  Access: Read-only API with RBAC                                            │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE DEPLOYMENT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Developer                                                                          │
│      │                                                                              │
│      │ 1. git push                                                                  │
│      ▼                                                                              │
│  ┌─────────┐    2. webhook    ┌─────────────┐    3. clone     ┌─────────────┐      │
│  │ GitHub  │─────────────────▶│   Actions   │────────────────▶│  Runner     │      │
│  │  Repo   │                  │  Workflow   │                 │             │      │
│  └─────────┘                  └─────────────┘                 └──────┬──────┘      │
│                                                                      │              │
│      ┌───────────────────────────────────────────────────────────────┘              │
│      │                                                                              │
│      │  4. lint, test, security                                                     │
│      ▼                                                                              │
│  ┌─────────────┐    5. build     ┌─────────────┐    6. push    ┌─────────────┐     │
│  │   Source    │────────────────▶│   Docker    │──────────────▶│  Container  │     │
│  │    Code     │                 │   Image     │               │  Registry   │     │
│  └─────────────┘                 └─────────────┘               └──────┬──────┘     │
│                                                                       │             │
│      ┌────────────────────────────────────────────────────────────────┘             │
│      │                                                                              │
│      │  7. sign (Cosign)                                                            │
│      ▼                                                                              │
│  ┌─────────────┐    8. attest    ┌─────────────┐                                   │
│  │   Signed    │────────────────▶│    SBOM     │                                   │
│  │   Image     │                 │   Store     │                                   │
│  └──────┬──────┘                 └─────────────┘                                   │
│         │                                                                           │
│         │  9. deploy request                                                        │
│         ▼                                                                           │
│  ┌─────────────┐   10. verify    ┌─────────────┐   11. admit   ┌─────────────┐     │
│  │    Helm     │────────────────▶│   Cosign    │──────────────▶│  Kyverno    │     │
│  │   Release   │                 │   Verify    │               │  Admission  │     │
│  └─────────────┘                 └─────────────┘               └──────┬──────┘     │
│                                                                       │             │
│         ┌─────────────────────────────────────────────────────────────┘             │
│         │                                                                           │
│         │  12. policy check                                                         │
│         ▼                                                                           │
│  ┌─────────────┐   13. decide    ┌─────────────┐   14. allow   ┌─────────────┐     │
│  │    OPA      │────────────────▶│   Policy    │──────────────▶│ Kubernetes  │     │
│  │   Query     │                 │  Decision   │               │   Deploy    │     │
│  └─────────────┘                 └─────────────┘               └──────┬──────┘     │
│                                                                       │             │
│         ┌─────────────────────────────────────────────────────────────┘             │
│         │                                                                           │
│         │  15. rollout                                                              │
│         ▼                                                                           │
│  ┌─────────────┐   16. canary    ┌─────────────┐   17. analyze ┌─────────────┐     │
│  │    Argo     │────────────────▶│   Traffic   │──────────────▶│ Prometheus  │     │
│  │  Rollouts   │                 │    Shift    │               │   Metrics   │     │
│  └─────────────┘                 └─────────────┘               └──────┬──────┘     │
│                                                                       │             │
│         ┌─────────────────────────────────────────────────────────────┘             │
│         │                                                                           │
│         │  18. promote (if healthy) OR rollback (if degraded)                       │
│         ▼                                                                           │
│  ┌─────────────┐   19. record    ┌─────────────┐                                   │
│  │   Service   │────────────────▶│   Audit     │                                   │
│  │   Running   │                 │   Ledger    │                                   │
│  └─────────────┘                 └─────────────┘                                   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION TOPOLOGY                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │                              AWS / GCP                                         │ │
│  │                                                                                │ │
│  │   Region: us-east-1 / us-central1                                             │ │
│  │                                                                                │ │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐│ │
│  │   │                        Kubernetes Cluster                                ││ │
│  │   │                                                                          ││ │
│  │   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    ││ │
│  │   │   │   Node 1    │  │   Node 2    │  │   Node 3    │                    ││ │
│  │   │   │  (m5.xlarge)│  │  (m5.xlarge)│  │  (m5.xlarge)│                    ││ │
│  │   │   └─────────────┘  └─────────────┘  └─────────────┘                    ││ │
│  │   │                                                                          ││ │
│  │   │   Namespaces:                                                            ││ │
│  │   │   ┌─────────────────────────────────────────────────────────────────┐  ││ │
│  │   │   │ production    │ staging       │ preview-*     │ system          │  ││ │
│  │   │   │               │               │               │                 │  ││ │
│  │   │   │ • API pods    │ • API pods    │ • PR envs     │ • Istio        │  ││ │
│  │   │   │ • Worker pods │ • Worker pods │ • Ephemeral   │ • Prometheus   │  ││ │
│  │   │   │ • Jobs        │ • Jobs        │               │ • Grafana      │  ││ │
│  │   │   │               │               │               │ • Loki         │  ││ │
│  │   │   └─────────────────────────────────────────────────────────────────┘  ││ │
│  │   │                                                                          ││ │
│  │   └─────────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                                │ │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │   │   RDS/CloudSQL  │  │   ElastiCache   │  │   Neo4j Aura    │              │ │
│  │   │   PostgreSQL    │  │     Redis       │  │   Graph DB      │              │ │
│  │   │   Multi-AZ      │  │   Cluster       │  │                 │              │ │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  │                                                                                │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Integration Points

| Integration | Protocol | Authentication | Purpose |
|-------------|----------|----------------|---------|
| GitHub → Actions | Webhook | HMAC signature | Trigger pipelines |
| Actions → Registry | HTTPS | OIDC token | Push images |
| Actions → K8s | HTTPS | kubeconfig/SA | Deploy workloads |
| K8s → OPA | gRPC | mTLS | Policy decisions |
| Services → Prometheus | HTTP | mTLS | Metrics scrape |
| Services → Loki | HTTP | mTLS | Log shipping |
| Services → Tempo | gRPC | mTLS | Trace export |

---

## Related Documents

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md)
- [CI/CD Pipeline Design](./CICD_PIPELINE.md)
- [Service Onboarding Checklist](./ONBOARDING_CHECKLIST.md)
