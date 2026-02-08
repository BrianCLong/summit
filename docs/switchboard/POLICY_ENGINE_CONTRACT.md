# Policy Engine Contract

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: Policy Authors

## 1. Overview

The Policy Engine is the **Gatekeeper**. It decides whether an action (capability request) is `ALLOWED` or `DENIED` based on context.

It operates on **Input** (from the agent/environment) and produces **Output** (a decision + obligations).

## 2. Inputs

The policy engine receives a JSON payload:

```json
{
  "tenant_id": "tenant-123",
  "actor": {
    "user_id": "alice",
    "role": "investigator",
    "tier": "pro"
  },
  "request": {
    "verb": "search",
    "resource": "internet",
    "tool_name": "brave-search",
    "arguments": {
      "q": "site:example.com sensitive data"
    }
  },
  "context": {
    "ip": "10.0.0.1",
    "time": "2023-10-27T10:00:00Z",
    "history": [
      {"tool": "dns_lookup", "status": "success"}
    ]
  },
  "health_status": "healthy"
}
```

## 3. Outputs

The policy engine returns a structured decision:

```json
{
  "allow": true,
  "reason": "investigator-authorized",
  "obligations": [
    {
      "type": "log_audit",
      "level": "info"
    },
    {
      "type": "redact_pii",
      "fields": ["email", "phone"]
    }
  ],
  "tool_overrides": {
    "timeout_ms": 5000
  }
}
```

### 3.1 Obligations

Obligations are **side effects** that Switchboard *must* execute if the action proceeds.

*   `log_audit`: Write to the audit trail.
*   `notify_admin`: Send an alert.
*   `require_approval`: Pause for human review (Async Flow).
*   `redact_pii`: Filter the output.
*   `enforce_timeout`: Set a hard deadline.

## 4. Scenarios

### 4.1 Scenario: Allow Standard Search
*   **Input**: Role `analyst`, Tool `search_web`.
*   **Decision**: `allow: true`.
*   **Reason**: "Standard role allows web search."

### 4.2 Scenario: Deny Sensitive Data Exfiltration
*   **Input**: Tool `upload_file`, Destination `external_s3`.
*   **Decision**: `allow: false`.
*   **Reason**: "Data exfiltration prevention."

### 4.3 Scenario: Rate Limit (Soft)
*   **Input**: 100th request in 1 minute.
*   **Decision**: `allow: false`.
*   **Reason**: "Rate limit exceeded (100/min)."

### 4.4 Scenario: PII Redaction Required
*   **Input**: Tool `fetch_customer_data`.
*   **Decision**: `allow: true`, `obligations: ["redact_pii"]`.
*   **Reason**: "Allowed with safeguards."

### 4.5 Scenario: Emergency Break-Glass
*   **Input**: Role `admin`, Context `emergency_mode=true`.
*   **Decision**: `allow: true`, `obligations: ["notify_security_team"]`.
*   **Reason**: "Break-glass protocol active."

## 5. Testing Strategy

Policy logic is critical and must be tested in isolation (no network).

*   **Unit Tests**: Use `opa test` with mocked inputs.
*   **Fixture-Based**: A folder of `test/policies/cases/` with `.json` inputs and expected outputs.
*   **CI Pipeline**: All policy changes must pass 100% of test cases before merge.
