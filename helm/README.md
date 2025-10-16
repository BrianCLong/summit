Helm charts for IntelGraph services.

Charts included:

- server
- client
- neo4j
- postgres
- redis
- ai-service
- nlp-service
- osint-service

Each chart supports:

- Ingress with cert-manager annotations
- HPA (optional)
- ServiceMonitor (optional) for Prometheus Operator
- PodDisruptionBudget (optional)
- Resource requests/limits via values
- Optional ExternalSecrets or plain Secret

See each chart's values.yaml for configuration.
