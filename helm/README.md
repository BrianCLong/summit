Helm charts for IntelGraph services.

Charts included:

- Umbrella deployment under `helm/umbrella` to coordinate all Summit workloads with shared defaults
- Individual services: server, client, neo4j, postgres, redis, ai-service, nlp-service, osint-service

Umbrella capabilities:

- Namespace management with mesh labels plus `ResourceQuota` and `LimitRange` defaults
- Per-service Deployments, Services, Ingress, HPAs (CPU/memory plus optional custom metrics), Istio `PeerAuthentication`/`DestinationRule`, NetworkPolicies, ExternalSecrets, and health probes
- Blue/green deployment option with active/standby color services and a promotion hook job
- Service mesh defaults (sidecar injection annotations) and TLS ingress with cert-manager ClusterIssuer configuration

Per-service charts continue to support:

- Ingress with cert-manager annotations
- HPA (optional)
- ServiceMonitor (optional) for Prometheus Operator
- PodDisruptionBudget (optional)
- Resource requests/limits via values
- Optional ExternalSecrets or plain Secret

See each chart's `values.yaml` for configuration and `docs/deploy/k8s.md` for deployment guidance.
