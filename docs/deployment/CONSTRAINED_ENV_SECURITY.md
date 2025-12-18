# Security & Compliance in Constrained Environments

**Owner**: On-Prem, Private Cloud & Edge Deployments Team
**Status**: Draft
**Last Updated**: October 2025

## 1. Overview

Deploying CompanyOS in constrained environments (Customer On-Prem, Private Cloud, Edge) shifts the shared responsibility model. While CompanyOS ensures the security of the *software*, the customer becomes responsible for the security of the *infrastructure*. This document outlines the security architecture, requirements, and compliance controls for these environments.

## 2. Key Management & Secrets

In SaaS, we manage keys. In constrained environments, we must trust the customer's infrastructure to protect them.

### 2.1. Secret Injection
*   **Runtime Injection**: Secrets (DB passwords, API keys) must be injected as Environment Variables or mounted files at runtime.
*   **No Hardcoded Secrets**: Our container images never contain default credentials.
*   **Integration**: We support integration with:
    *   Kubernetes Secrets
    *   HashiCorp Vault
    *   AWS Secrets Manager (for Private Cloud)
    *   Hardware Security Modules (HSM) via PKCS#11 (Enterprise Feature)

### 2.2. Encryption at Rest
*   **Database**: We rely on the underlying storage encryption (e.g., LUKS, EBS Encryption) or database-level encryption features (TDE) where licensed.
*   **Application Level**: Sensitive fields in the database are encrypted using a **Master Key** provided by the customer at boot time.
    *   *Key Rotation*: We provide CLI tools to re-encrypt data when the master key is rotated.

### 2.3. Encryption in Transit
*   **Internal**: All internal service-to-service communication supports TLS 1.3.
*   **External**: All external interfaces force HTTPS.
*   **Certificates**: Customers must provide valid certificates (CA-signed or internal PKI). We do not generate self-signed certs in production.

## 3. Software Integrity & Verification

To operate in high-threat environments, customers must verify that the software they are running is authentic and unmodified.

### 3.1. Signed Artifacts
*   **Container Signing**: All Docker images are signed using **Cosign / Sigstore**.
*   **Verification**: The deployment manifest includes the public key required to verify signatures before pulling/running images.
    *   *Kubernetes*: We provide Policy Controller configurations (e.g., Kyverno) to enforce signature verification.

### 3.2. SBOM (Software Bill of Materials)
*   Every release includes a comprehensive **SPDX/CycloneDX SBOM**.
*   This allows security teams to independently scan for vulnerabilities (CVEs) in our dependency tree without needing access to our source code.

### 3.3. Reproducible Builds
*   We strive for bit-for-bit reproducible builds for our core binaries, allowing independent auditing.

## 4. Supported Environment Checklist

For a customer environment to be **officially supported** by CompanyOS, it must meet the following criteria.

### 4.1. Infrastructure & OS
- [ ] **OS**: Linux Kernel 5.4+ (RHEL 8+, Ubuntu 20.04+, Debian 11+).
- [ ] **Container Runtime**: Docker Engine 20.10+ or Containerd 1.6+.
- [ ] **Orchestration**: Kubernetes 1.25+ (if using K8s).
- [ ] **Entropy**: Sufficient entropy source (e.g., `haveged` or hardware RNG) for crypto operations.
- [ ] **Time Sync**: NTP synchronized clocks (Max drift < 500ms).

### 4.2. Network & Connectivity
- [ ] **Internal DNS**: Functional DNS resolution for service discovery.
- [ ] **Firewall**: Ingress allow-listed on port 443. Internal traffic allowed between nodes.
- [ ] **Proxies**: If a proxy is required for outbound traffic (license checks), environment variables (`HTTP_PROXY`, `NO_PROXY`) must be correctly propagated.

### 4.3. Security Controls
- [ ] **Root Access**: Deployment mechanism (Helm/Compose) requires appropriate permissions, but application containers run as **non-root users**.
- [ ] **SELinux/AppArmor**: Supported but may require specific profile configurations documented in our hardening guide.
- [ ] **File System**: Persistent volumes must support file locking (Postgres/Neo4j requirement). NFS is generally *not* recommended for databases.

### 4.4. Compliance
- [ ] **Audit Logging**: Host-level audit logging configured to capture container activities.
- [ ] **Access Control**: Operational access to the cluster limited to authorized personnel (RBAC).

## 5. Policy & Governance (OPA)

CompanyOS ships with an embedded Open Policy Agent (OPA) engine.
*   **Immutable Policy Bundle**: In constrained environments, the "Base Policy" is immutable and part of the signed release.
*   **Customer Extensions**: Customers can mount a secondary "Local Policy" file to add specific organizational constraints (e.g., "Only allow access from IP range X").
*   **Fail-Closed**: If the policy engine cannot be reached or fails, all access is denied.

## 6. Hardening Guide (Summary)

We require customers to follow standard hardening practices:
1.  **CIS Benchmarks**: Apply CIS Benchmarks for the underlying OS and Kubernetes/Docker.
2.  **Least Privilege**: Do not grant the CompanyOS service account cluster-admin privileges unless strictly necessary for initial setup.
3.  **Network Segmentation**: Place the database layer in a separate subnet with no direct internet access.
4.  **Vulnerability Scanning**: Regularly scan the running images using tools like Trivy or Clair.
