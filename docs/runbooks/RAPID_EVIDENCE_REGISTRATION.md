# Runbook: Rapid Evidence Registration

**Goal:** Manually register high-value evidence when automated ingest is stalled.

## Prerequisites

- Access to the internal network (VPN).
- `curl` installed.
- Valid JWT token (`$TOKEN`) with `ingest:write` permission.

## Steps

1.  **Prepare Data**
    Ensure your evidence file (JSON, PDF, etc.) is ready.

    ```bash
    export EVIDENCE_FILE="path/to/evidence.pdf"
    ```

2.  **Hash Generation**
    Generate the SHA-256 hash of the file.

    ```bash
    export EVIDENCE_HASH=$(sha256sum $EVIDENCE_FILE | cut -d' ' -f1)
    echo "Hash: $EVIDENCE_HASH"
    ```

3.  **API Call**
    Submit the evidence to the Prov-Ledger API.

    ```bash
    curl -X POST https://api.intelgraph.internal/v1/evidence \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "hash": "'"$EVIDENCE_HASH"'",
        "type": "document",
        "metadata": {
          "source": "manual_runbook",
          "operator": "user_id"
        }
      }'
    ```

4.  **Verification**
    The API should return an ID. Verify it was anchored.
    ```bash
    # Replace {id} with the ID from the previous step
    curl -X GET https://api.intelgraph.internal/v1/evidence/{id} \
      -H "Authorization: Bearer $TOKEN"
    ```
    Expected output should contain `"proof_status": "anchored"`.

## Troubleshooting

- **401 Unauthorized:** Check your token expiry.
- **500 Internal Error:** Check Prov-Ledger logs in Kibana.
