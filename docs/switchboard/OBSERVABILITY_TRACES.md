# Observability Traces

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: DevOps, Investigators

## 1. Overview

Observability in Switchboard is **deterministic** and designed for **replayability**. We don't just log what happened; we log *why* it happened, linking intent to evidence.

## 2. What to Log (The Chain of Custody)

Every action creates a **Trace** that spans:

1.  **Preflight**:
    *   `request_id`: The user/agent request.
    *   `policy_decision`: `ALLOW` / `DENY` + Reason.
    *   `tool_selection`: Why was `brave-search` picked over `google`?
2.  **Credential**:
    *   `credential_mint`: Token ID (redacted), Scope, Expiry.
3.  **Routing**:
    *   `upstream_call`: Latency, Status Code.
    *   `payload_hash`: SHA-256 of the arguments (for verification).
4.  **Tool Call**:
    *   `tool_execution`: Start/End timestamps.
    *   `result_hash`: SHA-256 of the output.
5.  **Receipt**:
    *   `receipt_generation`: Cryptographic signature of the entire chain.

## 3. Trace/Span Fields (OpenTelemetry)

We use OpenTelemetry (OTel) standard attributes + Summit extensions.

| Field | Description | Example |
| :--- | :--- | :--- |
| `trace.id` | W3C Trace ID. | `4bf92f3577b34da6a3ce929d0e0e4736` |
| `span.kind` | Server/Client/Internal. | `CLIENT` |
| `service.name` | Component name. | `switchboard-proxy` |
| `summit.tenant.id` | Tenant context. | `tenant-123` |
| `summit.tool.name` | Tool invoked. | `search_web` |
| `summit.policy.decision` | Policy result. | `ALLOW` |
| `summit.receipt.id` | Evidence link. | `rcpt-555` |

## 4. Privacy & Redaction

**Strict Rules**:
1.  **PII**: Never log email addresses, phone numbers, or credit cards in plain text.
    *   *Action*: Auto-redact or hash.
2.  **Secrets**: Never log API keys, passwords, or tokens.
    *   *Action*: Mask as `[REDACTED]`.
3.  **Content**: Avoid logging large request/response bodies unless explicitly enabled for debugging (and subject to retention policies).
    *   *Default*: Log only hashes or truncated snippets.

## 5. Metrics to Expose

Prometheus metrics for operational health:

*   `switchboard_tool_requests_total{tool="...", status="success|fail"}`
*   `switchboard_tool_latency_seconds_bucket{tool="..."}`
*   `switchboard_policy_denials_total{reason="..."}`
*   `switchboard_credential_mint_failures_total`
*   `switchboard_health_check_failures_total{service="..."}`
*   `switchboard_cache_hit_rate` (Idempotency check)

## 6. Minimal Debug Bundle

For support tickets or user debugging, users can export a **Debug Bundle**:

```json
{
  "trace_id": "...",
  "timestamp": "2023-10-27T10:00:00Z",
  "request": {
    "tool": "search_web",
    "args_hash": "a1b2..."
  },
  "policy_result": {
    "allowed": false,
    "reason": "rate_limit"
  },
  "logs": [
    "WARN: Rate limit exceeded for tenant-123."
  ]
}
```
