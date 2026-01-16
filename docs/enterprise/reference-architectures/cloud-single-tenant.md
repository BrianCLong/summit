# Cloud Single-Tenant Reference Architecture

## Overview
This reference architecture describes a secure, isolated single-tenant deployment of the Summit platform on a public cloud provider (AWS). It is designed for enterprise customers with strict data isolation and compliance requirements.

## Network Topology
- **VPC:** Dedicated VPC with public and private subnets across 3 Availability Zones (AZs).
- **Public Subnets:** Contain Load Balancers (ALB/NLB) and NAT Gateways.
- **Private Subnets (App):** Contain EKS Worker Nodes.
- **Private Subnets (Data):** Contain RDS, ElastiCache, and other stateful services.
- **Connectivity:**
  - Ingress via ALB with WAF.
  - Egress via NAT Gateway with strict filtering.
  - VPN/Direct Connect for administrative access.

## IAM Boundaries
- **Control Plane:**
  - Dedicated IAM Role for EKS Cluster.
  - Dedicated IAM Role for EKS Node Group.
- **Data Plane:**
  - IRSA (IAM Roles for Service Accounts) used for pod-level access to AWS resources (S3, Secrets Manager).
  - No long-lived credentials in pods.
- **User Access:**
  - SSO integration (OIDC/SAML) for console access.
  - RBAC within Kubernetes mapped to IAM roles.

## Data Flows
1. **User Request:** Internet -> WAF -> ALB -> Ingress Controller -> Service -> Pod.
2. **Inter-Service:** TLS mTLS via Service Mesh (Linkerd/Istio) or direct TLS.
3. **Database Access:** Pod -> Private Subnet (Data) -> RDS (TLS enabled).
4. **Secrets:** Pod -> Secrets Store CSI Driver -> AWS Secrets Manager.

## Logging & Monitoring
- **Logging:**
  - Application logs -> stdout/stderr -> FluentBit -> CloudWatch Logs / Splunk / Datadog.
  - Audit logs enabled for EKS and AWS API calls (CloudTrail).
- **Monitoring:**
  - Prometheus/Grafana for metrics (Cluster & App).
  - CloudWatch Alarms for infrastructure health.

## Backup & Recovery
- **Database:** Automated daily snapshots with 35-day retention. Cross-region replication enabled for DR.
- **State:** S3 versioning and replication enabled.
- **RPO/RTO:** RPO < 15 mins, RTO < 4 hours.

## Upgrade Path
- **Strategy:** Blue/Green or Rolling Updates.
- **Cadence:** Quarterly releases aligned with Summit LTS versions.
- **Process:**
  1. Update IaC (Terraform).
  2. Deploy new images to staging.
  3. Validate.
  4. Promote to production.
