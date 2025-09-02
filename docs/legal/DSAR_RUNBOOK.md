# Data Subject Access Request (DSAR) Runbook

This runbook outlines the process for handling Data Subject Access Requests (DSARs) received by [Company Name]. All steps must be completed within 30 days of receiving a valid request.

## 1. Intake and Logging

- **Receive Request**: A DSAR can be received via [Specify channels, e.g., email to privacy@company.com, dedicated web form].
- **Log Request**: Record the request details in the DSAR tracking system (e.g., Jira, dedicated privacy management software). Assign a unique case ID.
- **Initial Acknowledgment**: Send an automated or manual acknowledgment to the data subject within [Specify timeframe, e.g., 3 business days] confirming receipt of their request.

## 2. Verify Identity

- **Purpose**: Ensure the requester is indeed the data subject or has legal authority to act on their behalf.
- **Methods**: [Specify methods, e.g., email verification, requesting additional identifying information (e.g., recent invoice number, partial account details), video call verification for sensitive requests].
- **Documentation**: Record all identity verification steps and outcomes in the DSAR tracking system.

## 3. Locate Data

- **Scope**: Identify all systems and data stores that may contain the data subject's Personal Data.
- **Data Identification**: Use the provided `subject_id` (e.g., user ID, email address) to search across all relevant tenants and systems.
- **Tools**: Utilize internal data mapping tools, database queries, and log analysis systems.
- **Collaboration**: Engage relevant teams (e.g., Engineering, Support, Sales) to assist in data location.
- **Documentation**: Document all data sources identified and the types of data found.

## 4. Export Data (for Access/Portability Requests)

- **Format**: Export the located Personal Data in a structured, commonly used, and machine-readable format (e.g., JSON, CSV).
- **CLI Tool**: Use the `maestro dsar export` CLI tool:

  ```bash
  maestro dsar export --subject <subject_id> --out s3://maestro-dsar/requests/<case_id>/
  ```

  - `<subject_id>`: Unique identifier for the data subject.
  - `<case_id>`: Unique case ID from the DSAR tracking system.
  - The tool will export data associated with the `subject_id` to the specified S3 location.

- **Review**: Review the exported data for accuracy and completeness before providing it to the data subject.
- **Secure Transfer**: Transfer the data to the data subject using a secure method (e.g., encrypted portal, secure file transfer).

## 5. Delete/Anonymize Data (for Erasure Requests)

- **Scope**: Identify all instances of the data subject's Personal Data that need to be deleted or anonymized.
- **CLI Tool**: Use the `maestro dsar delete` CLI tool:

  ```bash
  maestro dsar delete --subject <subject_id> --preview
  ```

  - Run with `--preview` first to see what data will be affected without making actual changes.

  ```bash
  maestro dsar delete --subject <subject_id>
  ```

  - Execute without `--preview` to perform the deletion/anonymization.

- **Verification**: Verify that the data has been successfully deleted or anonymized across all systems.
- **Backup Considerations**: Ensure data is also removed from backups in accordance with retention policies.

## 6. Confirm Completion

- **Notification**: Inform the data subject that their request has been fulfilled.
- **Details**: Provide details on the actions taken (e.g., data provided, data deleted/anonymized).
- **Documentation**: Update the DSAR tracking system with the completion status and date.

## 7. Audit Events

All DSAR actions (intake, verification, export, delete, anonymize, confirmation) must emit append-only audit events to the central audit log for compliance and accountability.
