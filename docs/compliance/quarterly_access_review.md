# Quarterly Access Review Process

This document outlines the process for conducting quarterly access reviews for the CompanyOS platform, ensuring that access privileges remain appropriate and adhere to the principle of least privilege.

## 1. Purpose

To periodically verify that all user and service account access to CompanyOS systems and data is necessary, appropriate, and aligned with their current roles and responsibilities.

## 2. Scope

This process covers all access to:

- AWS accounts (IAM Users, Roles, Policies)
- Kubernetes clusters (RBAC, Service Accounts)
- IntelGraph API (User roles and permissions)
- Any third-party services integrated with CompanyOS

## 3. Frequency

Access reviews will be conducted quarterly (every three months).

## 4. Roles and Responsibilities

- **Review Owner (RO):** Typically a Security Officer or Compliance Lead, responsible for initiating and overseeing the review process.
- **System Owners (SO):** Responsible for reviewing access to their respective systems (e.g., Engineering Lead for Kubernetes, Product Owner for IntelGraph API).
- **HR/Management:** Provides input on employee status and role changes.

## 5. Procedure

### 5.1. Preparation (RO)

1.  **Generate Access Reports:**
    - **AWS IAM:** Use AWS IAM Access Analyzer or custom scripts to list all IAM users, roles, and their attached policies. Focus on last login times and unused credentials.
    - **Kubernetes RBAC:** Use `kubectl get clusterroles,clusterrolebindings,roles,rolebindings --all-namespaces -o yaml` and custom scripts to analyze effective permissions for users and service accounts.
    - **IntelGraph API:** Query the `role`, `permission`, and `user_roles` tables in PostgreSQL to list all defined roles, permissions, and user-role assignments.
    - **Third-Party Services:** Generate access reports from respective service consoles.
2.  **Gather Context:** Obtain a list of current employees, their roles, and any recent changes from HR/Management.

### 5.2. Review (SO)

1.  **Distribute Reports:** The RO distributes relevant access reports to the respective System Owners.
2.  **Review Access:** System Owners review the access reports for their systems, focusing on:
    - **Necessity:** Is the access still required for the user/service account's current role?
    - **Least Privilege:** Does the access adhere to the principle of least privilege?
    - **Timeliness:** Are there any dormant accounts or unused permissions?
    - **Role Changes:** Have any role changes occurred that require access adjustments?
3.  **Document Findings:** System Owners document any discrepancies, unnecessary access, or required changes.

### 5.3. Remediation (SO & RO)

1.  **Implement Changes:** System Owners implement necessary access changes (e.g., revoke permissions, delete dormant accounts, adjust role assignments).
    - **All changes MUST be auditable (e.g., via Git for IaC, or audit logs for direct changes).**
2.  **Verify Changes:** The RO verifies that all documented changes have been implemented.

### 5.4. Documentation and Approval (RO)

1.  **Summarize Review:** The RO compiles a summary report of the access review, including:
    - Date of review.
    - Systems reviewed.
    - Findings and discrepancies.
    - Remediation actions taken.
    - Confirmation of adherence to least privilege.
2.  **Obtain Approval:** The summary report is reviewed and approved by relevant stakeholders (e.g., CISO, management).
3.  **Store Evidence:** All reports, findings, and approval documents are stored securely for audit purposes.

## 6. Tools and Resources

- **AWS IAM Access Analyzer:** For identifying unused access and overly permissive policies.
- **`kubectl` commands:** For Kubernetes RBAC analysis.
- **PostgreSQL client/queries:** For IntelGraph API RBAC analysis.
- **Grafana Dashboards:** For visualizing audit logs and access patterns.
- **Version Control (Git):** For tracking changes to IAM policies, Kubernetes manifests, and IntelGraph API schema.

## 7. Related Documents

- `docs/runbooks/compliance/break_glass_flow.md`
- `docs/compliance/evidence_collection.md`
