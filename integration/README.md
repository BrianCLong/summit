# Integration Repository Drop

This directory describes how the wedge specifications integrate with the
IntelGraph platform, Mission Control (MC) tools, and Summit UI surfaces.

## Layout

```
/integration
  intelgraph/
    api/            # OpenAPI stubs for wedge-specific endpoints
    services/       # Service responsibilities + policy integration notes
  mc/
    tools/          # Tooling contracts and operator guidance
    guardrails/     # Policy enforcement and budget validation
  summit/
    ui_specs/       # UI concepts for artifact inspection and audit
```

## Integration Contract Checklist

- Every API returns a **replay token** and **policy decision reference**.
- Every artifact is logged to the **transparency log** with commitments.
- Guardrails enforce **budgets, scope, and authorization**.
- MC tools verify attestation and evidence before acting.
- UI views surface **uncertainty, proofs, and policy status** by default.

## Change Management

Updates to any wedge spec should include:

1. A matching integration artifact update (API, service, MC tool, or UI).
2. An updated `docs/roadmap/STATUS.json` timestamp.
3. Regression checks for budgets and replay determinism.
