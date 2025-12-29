# Summit Support Error Codes (MVP-4-GA)

Stable error codes for the primary GA surfaces. Each code maps to the exact message emitted today so that customer support, SRE, and engineering can triage consistently.

| Code                           | HTTP Status | Message                                              | Remediation                                                                                                                                     |
| ------------------------------ | ----------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| RCPT_SIGNING_SECRET_MISSING    | 500         | EVIDENCE_SIGNING_SECRET is required to sign receipts | Provide `EVIDENCE_SIGNING_SECRET` (and optional `EVIDENCE_SIGNER_KID`) in the runtime environment and redeploy the service that emits receipts. |
| PLUGIN_EXPORT_JSON_MISSING     | 400         | missing export_json()                                | Ensure the WASM plugin exports `export_json(input_json_string)` and returns a pointer to a NUL-terminated JSON payload.                         |
| PLUGIN_WASM_TIMEOUT            | 504         | wasm timeout                                         | Increase `WASM_MAX_CPU_MS` for long-running plugins or reduce plugin workload; verify plugin honors deadlines.                                  |
| PLUGIN_WASM_OOM                | 503         | wasm OOM                                             | Lower plugin input size or raise `WASM_MAX_MEM_MB`; confirm the WASM module frees memory after use.                                             |
| COMPLIANCE_CONTROL_MAP_MISSING | 500         | CRITICAL: Control map not found at <path>            | Restore `compliance/control-map.yaml` from source control and re-run the drift check.                                                           |
| COMPLIANCE_ARTIFACT_MISSING    | 422         | [DRIFT] Mapped artifact not found: <artifact>        | Update `compliance/control-map.yaml` to point at an existing artifact or recreate the missing evidence.                                         |
| AUTHZ_AUTHENTICATION_REQUIRED  | 401         | Authentication required                              | Provide a valid session/token in the GraphQL request context before retrying.                                                                   |
| AUTHZ_POLICY_DENIED            | 403         | Access denied to <field>: <reason>                   | Review the OPA decision for the field, adjust policy inputs (tenant, mission tags, compartment), or seek an exception.                          |
| AUTHZ_ENGINE_UNAVAILABLE       | 503         | Policy engine unavailable                            | Restore network access to OPA, confirm `OPA_ENABLED` and URL settings, and retry once the policy service is healthy.                            |
| AUTHZ_POLICY_EVALUATION_FAILED | 403         | Authorization check failed                           | Inspect server logs for upstream errors, then rerun after underlying faults (schema mismatch, OPA response format) are resolved.                |

## Scope notes

- Codes cover receipts, plugin execution, compliance drift checks, and authorization/policy decisions.
- Messages match the currently emitted error text; include the `<path>` and `<artifact>` placeholders exactly as logged at runtime.
- Additive changes only: new codes may be appended after support signs off; existing codes stay stable for GA.
