# ADR-0001: Use Helm and Terraform for Infrastructure

**Date:** 2023-10-01
**Status:** Accepted
**Area:** Infrastructure
**Owner:** Platform Guild
**Tags:** helm, terraform, iac, kubernetes, infrastructure

## Context

Summit requires deployment across multiple environments (dev, staging, production) and multiple cloud providers (AWS, GCP, Azure). We need:

- **Reproducible infrastructure**: Avoid "works on my machine" or drift between environments
- **Version-controlled infrastructure**: Track changes, enable rollback, code review for infra changes
- **Multi-cloud support**: Abstract cloud-specific details, enable portability
- **Kubernetes management**: Consistent deployment of 20+ microservices with dependencies
- **Secrets management**: Secure handling of API keys, database credentials, certificates

Traditional approaches (manual `kubectl apply`, shell scripts, click-ops) don't scale:
- No reproducibility (drift between environments)
- No audit trail (who changed what?)
- Error-prone (missing dependencies, wrong ordering)
- Slow onboarding (new engineers don't know how to deploy)

## Decision

We will use **Terraform for infrastructure provisioning** and **Helm for Kubernetes application deployments**.

### Core Decision

**Terraform:**
- Provision cloud infrastructure (VPCs, subnets, EKS/GKE/AKS clusters, RDS, S3, IAM)
- Manage DNS, CDN, load balancers
- State stored in remote backend (S3 + DynamoDB for locking)
- Workspaces for environment separation (dev, staging, prod)

**Helm:**
- Package Kubernetes applications as Helm charts
- Manage application lifecycle (install, upgrade, rollback)
- Values files for environment-specific configuration
- Chart repository for versioned releases

### Key Components
- **Terraform modules**: Reusable infrastructure components (`terraform/modules/`)
- **Helm charts**: Application packages (`helm/charts/`)
- **Helmfile**: Orchestrate multi-chart deployments
- **External Secrets Operator**: Sync secrets from AWS Secrets Manager/GCP Secret Manager

## Alternatives Considered

### Alternative 1: Pulumi
- **Pros:** Real programming languages (TypeScript, Python), better testing
- **Cons:** Smaller ecosystem, team unfamiliar, fewer cloud providers
- **Cost/Complexity:** Similar complexity, smaller community

### Alternative 2: CloudFormation / Cloud-native tools
- **Pros:** Native cloud integration, no state management
- **Cons:** Vendor lock-in, different tool per cloud (CF, GCP Deployment Manager, ARM)
- **Cost/Complexity:** Lock-in risk, no multi-cloud

### Alternative 3: Ansible
- **Pros:** Agentless, familiar to ops team
- **Cons:** Not declarative, poor cloud resource management, slow
- **Cost/Complexity:** Imperative approach doesn't fit infrastructure

## Consequences

### Positive
- Infrastructure-as-code enables version control, code review, and rollback
- Terraform state provides source of truth for infrastructure
- Helm charts standardize application deployment across environments
- Reproducible deployments reduce "works in staging but not prod"
- Declarative approach (vs. imperative scripts) reduces errors

### Negative
- Learning curve for engineers unfamiliar with Terraform HCL and Helm
- Terraform state management requires discipline (locking, remote backend)
- Helm chart complexity grows with application complexity
- "Terraform drift" (manual changes outside Terraform) requires vigilance

### Operational Impact
- **Monitoring:** Track Terraform apply success rate, Helm deployment status
- **Security:** Terraform state contains secrets (use encryption, access control)
- **Compliance:** Infrastructure changes tracked in Git, auditable

## Code References

### Core Implementation
- `terraform/` - Terraform modules and configurations
- `terraform/environments/` - Environment-specific configurations (dev, staging, prod)
- `helm/charts/` - Helm charts for all services
- `infrastructure/helmfile.yaml` - Helmfile for orchestration

### CI Integration
- `.github/workflows/terraform-plan.yml` - Terraform plan on PR
- `.github/workflows/terraform-apply.yml` - Terraform apply on merge to main
- `.github/workflows/helm-deploy.yml` - Helm deployment workflow

## Tests & Validation

### Unit Tests
- `terraform/modules/*/tests/` - Terraform module tests (using Terratest)
- Helm chart linting via `helm lint`

### Integration Tests
- `.github/workflows/infra-deploy.yml` - Deploy to test environment
- Smoke tests after Helm deployment

### CI Enforcement
- Terraform plan required on all PRs touching `terraform/`
- Helm chart validation on PRs touching `helm/charts/`
- Required approvals for production Terraform applies

## Migration & Rollout

### Migration Steps
1. Created Terraform modules for existing AWS infrastructure
2. Imported existing resources into Terraform state
3. Created Helm charts for all services
4. Migrated deployments from manual kubectl to Helm
5. Set up CI/CD pipelines for automated deployments

### Timeline
- Phase 1: Terraform for AWS (Oct 2023)
- Phase 2: Helm charts for all services (Nov 2023)
- Phase 3: Multi-cloud expansion (Q1 2024)
- Completion: All infrastructure managed via Terraform/Helm (Jan 2024)

## References

### Related ADRs
None (this was our first ADR)

### External Resources
- [Terraform Documentation](https://www.terraform.io/docs)
- [Helm Documentation](https://helm.sh/docs/)
- [Helmfile](https://github.com/helmfile/helmfile)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2023-10-01 | Platform Guild | Initial version |
| 2024-11-20 | Platform Guild | Expanded with template sections |
