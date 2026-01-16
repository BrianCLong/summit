# On-Premises / Air-Gapped Reference Architecture

## Overview
This architecture is for fully self-hosted deployments, including air-gapped environments (e.g., Defense, Finance). No external connectivity is assumed.

## Network Topology
- **Infrastructure:** Customer-provided Kubernetes Cluster (OpenShift, Tanzu, RKE2).
- **Load Balancing:** MetalLB or F5 Big-IP integration.
- **Air-Gap:**
  - All container images hosted in internal registry (Artifactory/Harbor).
  - Helm charts mirrored internally.

## IAM Boundaries
- **Identity:** Integration with customer's corporate LDAP/AD/SAML provider.
- **RBAC:** Mapped to AD groups.

## Data Flows
- All traffic is internal to the cluster or the local data center.
- No egress to Internet.

## Logging & Monitoring
- **Output:** Integration with Splunk, ELK, or other enterprise logging solutions via Fluentd forwarders.
- **Metrics:** Prometheus endpoint exposure for scraping by enterprise monitor.

## Backup & Recovery
- **Velero:** Recommended for cluster backup to S3-compatible storage (MinIO) or NFS.

## Upgrade Path
- **Delivery:** Bundled release artifacts (images + charts) delivered via secure portal or physical media.
- **Process:**
  1. Load images to internal registry.
  2. Apply Helm Chart upgrade.
