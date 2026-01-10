# Customer Zero - Adoption Questionnaire

**Objective:** To understand your technical and operational environment. This information helps us provide better support during your evaluation and assess mutual compatibility.

Please answer the following questions to the best of your ability. This is purely an intake form to capture your requirements; it does not imply any commitment to future features.

---

### Section A: Environment Constraints

1.  **Cloud Provider(s):**
    *   [ ] AWS
    *   [ ] Azure
    *   [ ] GCP
    *   [ ] On-Premise / Private Cloud
    *   [ ] Other: ____________

2.  **Container Orchestration:**
    *   [ ] Kubernetes (Self-managed)
    *   [ ] EKS (AWS)
    *   [ ] AKS (Azure)
    *   [ ] GKE (GCP)
    *   [ ] OpenShift
    *   [ ] Docker Compose
    *   [ ] Other: ____________

3.  **Database Environment:**
    *   Are you able to provision PostgreSQL and Redis, as required by the platform?
        *   [ ] Yes
        *   [ ] No
    *   Do you have a preferred managed database provider (e.g., RDS, Azure Database)?
        *   _________________________

---

### Section B: Security Posture Expectations

1.  **Identity Provider:**
    *   What OIDC-compliant identity provider do you use? (e.g., Okta, Azure AD, Keycloak)
        *   _________________________

2.  **Secret Management:**
    *   How do you manage secrets for applications?
        *   [ ] HashiCorp Vault
        *   [ ] AWS Secrets Manager
        *   [ ] Azure Key Vault
        *   [ ] Kubernetes Secrets
        *   [ ] Environment variables
        *   [ ] Other: ____________

3.  **Network Security:**
    *   Do you operate within a service mesh (e.g., Istio, Linkerd)?
        *   [ ] Yes
        *   [ ] No
    *   Are there strict egress policies that would prevent the platform from accessing external resources if needed?
        *   [ ] Yes
        *   [ ] No

---

### Section C: Deployment & Operational Model

1.  **Deployment Cadence:**
    *   What is your preferred release cycle for adopting new software versions?
        *   [ ] Monthly
        *   [ ] Quarterly
        *   [ ] Annually / Long-Term Support (LTS)

2.  **Monitoring & Alerting:**
    *   What is your primary monitoring stack?
        *   [ ] Prometheus / Grafana
        *   [ ] Datadog
        *   [ ] New Relic
        *   [ ] Splunk
        *   [ ] Other: ____________

3.  **Intended Use Case:**
    *   Briefly describe the primary problem you are hoping to solve with the Summit Platform.
        *   ________________________________________________________________
        ________________________________________________________________
        ________________________________________________________________

---

### Section D: Data Sensitivity & Integration

1.  **Data Classification:**
    *   What is the highest data classification level you anticipate processing with the platform? (e.g., Public, Sensitive, Confidential, Secret)
        *   _________________________

2.  **Integration Needs:**
    *   What are the top 3 systems you would need to integrate the Summit Platform with?
        1.  _________________________
        2.  _________________________
        3.  _________________________

---

Thank you for completing this questionnaire. Please return it to the designated support channel.
