# Access Review Workflow

This document outlines the workflow for conducting access reviews within the CompanyOS. The goal is to ensure that users and services only have the access they need, and that this access is regularly reviewed and justified.

## 1. Core Principles

- **Least Privilege**: Users should only have the minimum level of access required to perform their duties.
- **Regular Reviews**: Access should be reviewed on a regular basis to ensure it is still required.
- **Clear Justification**: All granted access should have a clear and documented justification.
- **Auditability**: All access review decisions should be logged for auditing and compliance purposes.

## 2. Triggering Reviews

Access reviews can be triggered in two ways:

### 2.1. Periodic Reviews

- **Cadence**: Access reviews will be conducted on a regular schedule. The default cadence will be quarterly, but this can be configured based on the sensitivity of the resources.
- **Scope**: Periodic reviews will cover all active user and service account entitlements.

### 2.2. Event-Based Reviews

Certain events will trigger an immediate access review for the affected users or resources. These events include:

- **Role Change**: When a user changes their job title, department, or team.
- **Anomalous Activity**: When suspicious or unusual activity is detected for a user or service account.
- **New High-Risk Resource**: When a new resource with a high-security classification is created.

## 3. Reviewer Assignment

The responsibility for reviewing access will be assigned based on the following roles:

- **Manager**: A user's direct manager is responsible for reviewing their access.
- **Resource Owner**: The designated owner of a resource is responsible for reviewing who has access to it.
- **Tenant Admin**: The administrator of a tenant is responsible for reviewing all access within that tenant.
- **Compliance Team**: The compliance team will have oversight and the ability to conduct ad-hoc reviews.

## 4. The Review Process

### 4.1. Notification

Reviewers will be notified via email and in-app notifications when an access review is assigned to them. The notification will include a link to the review, the deadline for completion, and a summary of the access to be reviewed.

### 4.2. The Review Interface

The access review interface will be designed to be intuitive and efficient. Key features will include:

- **Bulk Review**: The ability to approve or revoke multiple entitlements at once.
- **Detailed Information**: Each entitlement will have detailed information, including the user, the resource, the level of access, and the date it was granted.
- **Justification Capture**: Reviewers will be required to provide a justification for any access that is approved.
- **Revocation Decisions**: For each entitlement, the reviewer can choose to either "Approve" or "Revoke" the access.

### 4.3. Escalation

If a reviewer does not complete a review by the deadline, the review will be escalated to their manager or the compliance team.

## 5. Revocation Workflow

When access is revoked, the following steps will be taken:

### 5.1. Automated Revocation

- The system will automatically attempt to revoke the access by making an API call to the relevant system (e.g., the CompanyOS's user management API, a third-party identity provider).

### 5.2. Manual Revocation

- If automated revocation fails, a ticket will be created in the IT helpdesk system for manual revocation. The ticket will include all the necessary information for the IT team to take action.

### 5.3. Confirmation

- Once the access has been revoked, the system will confirm the revocation and update the audit trail.

## 6. Example Workflow: Manager Review

1.  **Trigger**: A quarterly access review is triggered.
2.  **Assignment**: A manager is assigned to review the access of their direct reports.
3.  **Notification**: The manager receives an email with a link to the review.
4.  **Review**: The manager logs in and sees a list of their direct reports and their current access.
    - For each employee, the manager reviews their entitlements.
    - They approve the access that is still needed, providing a justification for each approval.
    - They revoke the access that is no longer needed.
5.  **Revocation**: The system automatically revokes the unnecessary access.
6.  **Completion**: The manager submits the completed review.
7.  **Logging**: All of the manager's decisions are logged in the audit trail.
