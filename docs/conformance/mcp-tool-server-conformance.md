# MCP Tool Server Conformance Specification

## Purpose

Enable tool authors to self-certify MCP servers before listing them in the IntelGraph marketplace and switchboard catalog. Conformance verifies interoperability, security, and performance guarantees that exceed Metorial's baseline.

## Test Categories

1. **Protocol Compliance**
   - Validate MCP message sequencing (prompts, tools, resources, sampling).
   - Ensure schema adherence using JSON Schema fixtures.
2. **Authentication & Authorization**
   - Enforce scoped capability tokens; reject out-of-scope operations.
   - Support token rotation mid-session without disruption.
3. **Performance**
   - Meet latency envelopes: p95 tool response ≤ 400 ms (excluding network RTT), cold start ≤ 500 ms.
   - Provide warm start telemetry for marketplace badges.
4. **Security & Isolation**
   - Produce SBOM and signature manifest; pass vulnerability scan (Critical = 0).
   - Enforce outbound egress policies; demonstrate syscall filter compliance.
5. **Observability Hooks**
   - Emit OpenTelemetry traces with `tool.name`, `tenant.id`, `capability.scope` attributes.
   - Provide deterministic replay hooks (seed capture, side-effect stubs).
6. **Compliance**
   - Support retention tier metadata; respond to RTBF simulation.
   - Attach provenance hash to each response.

## Running the Suite

```bash
npm install
npm run conformance -- \
  --target https://my-mcp-server.example \
  --token $CAPABILITY_TOKEN \
  --out ./conformance-results
```

## Outputs

- `summary.json`: Pass/fail per category with latency percentiles.
- `evidence/`: Replay fixture pack, SBOM verification logs, policy simulation report.
- `badge-request.yaml`: Metadata for marketplace badge issuance.

## Submission Checklist

- Attach `summary.json` signed with developer key.
- Provide contact for security follow-ups (24h SLA).
- Include runtime footprint (CPU, memory) for bin-packing hints.

## Resources

- Fixture generator: `cli/intelgraph fixtures generate`.
- Emulator docs: `clients/README.md` (local mode instructions).
- Support: `support@intelgraph.example` (DX Guild triage).
