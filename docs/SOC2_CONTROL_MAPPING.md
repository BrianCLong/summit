# SOC 2 Control Mapping

This document maps the technical controls implemented in the Summit (IntelGraph) platform to the SOC 2 Trust Service Criteria.

| Control Category | Technical Control | SOC 2 Trust Service Criteria |
| :--- | :--- | :--- |
| **Change Management** | All code changes are managed through Git and require a pull request. | CC3.2 |
| | Pull requests are gated by a comprehensive CI/CD pipeline. | CC3.2 |
| | The CI/CD pipeline enforces vulnerability scanning, static analysis, and other quality checks. | CC4.1 |
| **Access Control** | Access to the production environment is restricted to authorized personnel. | CC6.1 |
| | The principle of least privilege is applied to all user and system accounts. | CC6.1 |
| **Security** | Secret scanning is performed on every pull request to prevent the exposure of sensitive information. | CC7.1 |
| | Static Application Security Testing (SAST) is used to identify and remediate vulnerabilities in the codebase. | CC7.1 |
| | Dependency vulnerability scanning is performed to identify and remediate vulnerabilities in third-party libraries. | CC7.1 |
| | Filesystem and container scanning is used to identify and remediate vulnerabilities in the runtime environment. | CC7.1 |
| | Infrastructure-as-Code (IaC) scanning is used to identify and remediate misconfigurations in the infrastructure. | CC7.1 |
| | Policy enforcement is used to ensure that the production environment is configured in accordance with security best practices. | CC7.1 |
| | Dynamic Application Security Testing (DAST) is used to identify and remediate vulnerabilities in the running application. | CC7.1 |
| **Availability** | The application is deployed in a high-availability configuration. | A1.1 |
| | The application is monitored 24/7 for performance and availability. | A1.2 |
| | A disaster recovery plan is in place and tested regularly. | A1.2 |
| **Confidentiality** | All data is encrypted in transit and at rest. | C1.1 |
| | Access to sensitive data is restricted to authorized personnel. | C1.2 |
