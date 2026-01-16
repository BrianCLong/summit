# Hybrid Reference Architecture

## Overview
This architecture supports a hybrid model where the Control Plane resides in the Cloud (SaaS) while the Data Plane (Agents/Collectors) runs in the Customer's On-Premises environment or Private Cloud.

## Network Topology
- **Cloud (Control Plane):** Standard SaaS deployment.
- **On-Prem (Data Plane):**
  - Summit Agents deployed on VMs or Kubernetes.
  - Outbound-only connectivity to Summit Cloud (no inbound ports required).
- **Connectivity:**
  - HTTPS (443) to specific Summit API endpoints.
  - Optional: PrivateLink / VPN for enhanced security.

## IAM Boundaries
- **Control Plane:** Managed by Summit.
- **Data Plane:** Managed by Customer.
  - Agent authentication via API Keys or mTLS certificates.
  - Role-based access for local resources.

## Data Flows
1. **Telemetry Collection:** Agent collects metadata/logs from local systems.
2. **Sanitization:** Sensitive data redacted locally before transmission.
3. **Transmission:** Encrypted (TLS 1.3) push to Summit Cloud Ingress.
4. **Commands:** Agents poll Control Plane for configuration updates (Long Polling / WebSockets).

## Logging & Monitoring
- **Data Plane:** Agents log locally to customer's SIEM. Health heartbeats sent to Control Plane.
- **Control Plane:** Full observability of the aggregation layer.

## Backup & Recovery
- **Data Plane:** Stateless agents; easy redeployment via configuration management (Ansible/Helm).
- **Control Plane:** Standard SaaS backup procedures.

## Upgrade Path
- **Control Plane:** Managed by Summit.
- **Data Plane:**
  - Customer triggers upgrade via provided Helm Charts or RPM/DEB packages.
  - Supports N-1 version compatibility.
