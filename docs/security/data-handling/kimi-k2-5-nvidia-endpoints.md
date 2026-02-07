# Data Handling: Kimi K2.5 on NVIDIA Integrate Endpoints

## Classification
- Default classification: Customer Data.
- Inputs may contain sensitive content; treat as confidential by default.

## Never Log
- Authorization header and any API keys.
- Raw prompts and user inputs.
- Raw image or video bytes.
- Full model responses or tool outputs.

## Redaction and Minimization
- Redact authorization values and payload bodies in logs.
- Store only aggregate metrics (token counts, latency) unless explicit trace capture is enabled.
- If trace capture is enabled, redact prompts and tool arguments deterministically.

## Retention
- Aggregate metrics: retain per metrics policy.
- Debug traces (if enabled): short retention window with explicit opt-in.
- No persistent storage of raw prompts or binary media.

## Access Controls
- Secrets sourced from environment or secret manager.
- Role-based access to configuration and metrics.
- Strict audit trail for configuration changes.

## Data Flow Boundaries
- Summit constructs request payloads with minimal required fields.
- External egress is restricted to allowlisted hosts.
- Responses are processed in-memory and emitted as normalized events.

## Incident Response Triggers
- Suspected key leakage.
- Unauthorized egress attempts.
- Unexpected payload expansion or tool-call anomalies.

## Compliance Mapping
- Policy-as-code enforcement required for outbound egress and tool allowlists.
- CI log scans must detect any accidental header logging.
