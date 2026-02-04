# FactAPI Pro Data Handling

## Classification

| Data Type | Classification | Notes |
| :--- | :--- | :--- |
| API Keys | **Secret** | Must be hashed at rest. Never logged. |
| Customer Claims | **Sensitive** | User provided content. |
| Verification Results | **Sensitive** | Derived insights. |
| Webhook Secrets | **Secret** | Used for HMAC signing. |

## Retention

*   **Raw Claims**: 0 days (Processed in-flight, not persisted by default in MWS).
*   **Metering Counters**: 13 months (Aggregated usage data).
*   **Logs**: 30 days (Access logs).

## Never-Log List

The following must **NEVER** appear in logs:
1.  `Authorization` header values.
2.  `X-API-Key` header values.
3.  Raw `claim` payload content (unless debug enabled in non-prod).
4.  `X-Hub-Signature` values.
5.  Customer identifiers beyond hashed Tenant ID.
