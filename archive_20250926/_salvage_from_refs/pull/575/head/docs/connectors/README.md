# Connector SDK

The Connector SDK runs inside the Plugin Host and provides sandboxed access to external intel feeds.

## Concepts
- **Egress allowlists**: connectors may only reach destinations configured in `config/connectors/*.yaml`.
- **License prompts**: tenants must accept feed licenses before enabling a connector.
- **Secrets**: API keys are stored in KMS and injected at runtime.

