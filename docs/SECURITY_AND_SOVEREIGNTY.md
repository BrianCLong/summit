# Security and Sovereignty

Summit Enterprise is designed for zero-trust environments and mission-critical workloads.

## Security Controls

- **Authentication**: JWT/OIDC authentication on all API endpoints.
- **RBAC**: Fine-grained access control at the entity and action level.
- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit.
- **Secrets Management**: Integration with Vault/AWS Secrets Manager.

## Data Sovereignty

- **Data Residency**: All data stays within your deployment boundary (on-prem or VPC).
- **Model Isolation**: LLM inference can be run locally (Llama 3, Mistral) or via private API endpoints.
- **Audit Logs**: Comprehensive logging of every agent decision and data access.

## Compliance

- **SOC2 Type II**: Ready (controls mapped in `soc-controls` tests).
- **GDPR**: Built-in data minimization and deletion workflows.
- **EU AI Act**: Human oversight features for high-risk AI systems.
