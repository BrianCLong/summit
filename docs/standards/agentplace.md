# AgentPlace Interop & Standards Mapping

## Supported Standards

| Standard | Support Level | Implementation Notes |
| --- | --- | --- |
| OpenAPI | Import Only | Agent manifests can reference OpenAPI specs for tool definitions. |
| OAuth 2.0 | Validated | API scopes are modeled after OAuth scopes and validated against the risk model. |
| JSON Schema | Required | All manifests must validate against the AgentPlace JSON Schema. |

## Non-Goals
- Hosting agents
- Monetization flows
- Marketplace UI
- Model Context Protocol (Deferred)

## Vision
Summit acts as the governance substrate for agent ecosystems, providing deterministic autonomy scoring and machine-verifiable policy gates.
