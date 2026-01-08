# Runbook: Selective Disclosure Packager

**Goal:** Generate a secure, verifiable bundle for an external partner (e.g., Court or Press).

## Prerequisites

- `summit-cli` tool installed.
- Access to the target graph data.

## Steps

1.  **Identify Scope**
    Determine the Node IDs that need to be exported.

    ```bash
    export NODE_IDS="n1,n2,n3"
    ```

2.  **Select Audience**
    Choose the audience tag. This determines the redaction level.
    - `court`: Full detail, high sensitivity.
    - `press`: Redacted PII, public safe.

    ```bash
    export AUDIENCE="press"
    ```

3.  **Execute Export**
    Run the CLI command to generate the bundle.

    ```bash
    ./summit-cli export \
      --ids "$NODE_IDS" \
      --audience "$AUDIENCE" \
      --out "export_bundle.json"
    ```

4.  **Verify Bundle**
    Verify the generated bundle before distribution.

    ```bash
    ./summit-verify export_bundle.json
    ```

    Ensure it prints `VERIFICATION PASSED`.

5.  **Transmit**
    Send the `export_bundle.json` via the approved secure channel.

## Troubleshooting

- **"Blocked by LAC"**: The export was denied by policy. Check if the user has the required license and authority for the requested data classification.
