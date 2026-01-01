### Runbook: DSAR Export Validation

**Objective:** To securely validate the contents of a DSAR export package and provide the auditable proof of completion to the requesting party.

**Trigger:** A DSAR request reaches the `completed` state.

**Steps:**

1.  **Retrieve Export Path:**
    - Query the `dsar_requests` table for the `export_path` using the request ID.
    - Example: `s3://conductor-dsar-exports/tnt-abc/12345.ndjson`

2.  **Download Securely:**
    - Using privileged credentials, download the export package from S3 to a secure, local environment.

3.  **Verify Data Masking:**
    - Manually inspect the contents of the export file (e.g., `12345.ndjson`).
    - **Crucially**, confirm that data fields are correctly masked according to the `dsar` purpose defined in the OPA policies. For example, fields tagged as PII should be redacted or pseudonymized.
    - Escalate to the Security/Compliance team if any data is unmasked.

4.  **Generate Evidence Hash:**
    - Compute a SHA-256 hash of the final, validated export package.
    - `sha256sum 12345.ndjson`

5.  **Attach Evidence to Ticket:**
    - In the corresponding support ticket (e.g., Jira, Zendesk), attach the evidence hash.
    - This provides a verifiable link between the request and the exact data package that was delivered.

6.  **Deliver to Requester:**
    - Provide the secure download link and the SHA-256 hash to the data subject.

7.  **Close Request:**
    - Mark the support ticket and the internal DSAR request as closed.
