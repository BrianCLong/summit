# Customer Security Package - CI Integration

## Automated Workflow

The generation and distribution of the Customer Security Package is handled automatically by the **Customer Security Package** GitHub Action (`.github/workflows/release-customer-security.yml`).

### Triggers
*   **Event**: `release` (published)
*   **Action**:
    1.  Downloads the `evidence-bundle` from the release assets (if available).
    2.  Generates the Questionnaire Pack.
    3.  Runs the `export_customer_security_package.ts` script to compile the package.
    4.  Verifies integrity.
    5.  Uploads `customer-security-package-<tag>.zip` back to the release.

### Manual / Local Execution

To run the generation locally:

1.  Ensure you have `js-yaml` installed:
    ```bash
    pnpm install
    ```

2.  Run the export script:
    ```bash
    npx tsx scripts/customer-security/export_customer_security_package.ts
    ```

3.  (Optional) Provide evidence location:
    ```bash
    EVIDENCE_DIR=./path/to/evidence npx tsx scripts/customer-security/export_customer_security_package.ts
    ```
