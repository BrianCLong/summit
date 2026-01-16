# Day 0: Planning & Prerequisites

## Objectives
- Confirm architectural requirements.
- Provision cloud or on-prem infrastructure.
- Establish connectivity and access controls.

## 1. Requirements Checklist
- [ ] **Infrastructure:** AWS Account / Azure Subscription / VMWare Cluster.
- [ ] **Compute:** Kubernetes Cluster (EKS v1.27+, AKS, or upstream k8s).
  - Minimum: 3 Nodes, 4 vCPU, 16GB RAM each.
- [ ] **Database:** PostgreSQL 14+ (RDS or self-hosted).
- [ ] **Storage:** S3 Bucket or MinIO for artifacts.
- [ ] **Network:**
  - VPC/VNet created.
  - Subnets defined (Private/Public).
  - Outbound internet access for image pulling (or private registry configured).

## 2. Access Management
- [ ] Create `summit-admin` IAM role / service account.
- [ ] Grant permissions for:
  - EKS Cluster Admin.
  - S3 Read/Write.
  - RDS Connect.
  - Secrets Manager Read.

## 3. Artifact Access
- [ ] Receive Summit License Key.
- [ ] Verify access to Summit Container Registry (`cr.summit.io`).
- [ ] Download Enterprise Adoption Kit.

## 4. Topology Selection
- Refer to Reference Architectures:
  - [Cloud Single-Tenant](../reference-architectures/cloud-single-tenant.md)
  - [Cloud Multi-Tenant](../reference-architectures/cloud-multi-tenant.md)
  - [Hybrid](../reference-architectures/hybrid.md)
  - [On-Prem](../reference-architectures/onprem.md)

## Success Criteria
- Infrastructure provisioned.
- Connectivity verified (e.g., `kubectl get nodes` works).
- Credentials for DB and Registry available.
