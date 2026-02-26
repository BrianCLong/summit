# AgentPlace Standards Mapping

## Interoperability
- **JSON Schema**: Used for agent manifest validation.
- **OpenAPI**: Agents interacting with external APIs must link to OpenAPI specs.
- **OAuth 2.0**: Required for authenticated agents. Scopes must be declared in the manifest.

## Non-Goals
- **Model Context Protocol**: Currently not supported, planned for future iterations.
- **Marketplace Hosting**: Summit acts as governance layer, not the hosting platform.

## Compliance
- **SOC 2**: Agent manifests and risk reports serve as evidence for change management controls.
