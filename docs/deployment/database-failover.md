# Summit Database Failover Automation

This guide describes how to deploy automated failover for PostgreSQL and Neo4j on Kubernetes using the Zalando Postgres Operator and the Neo4j Causal Cluster operator. It also covers the Helm chart knobs that enable these components, the provided Prometheus monitoring, and the validation scripts included in `scripts/failover`.

## Prerequisites

- Kubernetes cluster with cluster-admin access.
- `kubectl`, `helm`, and (optionally) `kustomize` installed locally.
- Prometheus Operator (or another implementation that supports `ServiceMonitor` and `PrometheusRule`).
- Secrets for database credentials:
  - PostgreSQL users are created automatically by the operator. Retrieve generated credentials from the secret named `<cluster>.<username>.credentials`.
  - Neo4j credentials must exist in the same namespace as the cluster (default `summit-neo4j-auth`).

## Deploying the Operators Manually

The repository ships with baseline manifests for both operators under `ops/deployment/kubernetes`:

```bash
kubectl apply -f ops/deployment/kubernetes/postgres/zalando-operator.yaml
kubectl apply -f ops/deployment/kubernetes/postgres/summit-postgres-cluster.yaml

kubectl apply -f ops/deployment/kubernetes/neo4j/neo4j-operator.yaml
kubectl apply -f ops/deployment/kubernetes/neo4j/summit-neo4j-cluster.yaml
```

The manifests deploy dedicated namespaces (`database-operators` and `graph-operators`), RBAC, controller deployments, metric services, and Summit-sized clusters (three PostgreSQL instances and a 3+2 Neo4j causal cluster). Adjust the CRs before applying in production environments (storage class, resource requests, users, etc.).

## Helm Chart Configuration

The Summit umbrella chart (`summit_helm_argocd_multiacct_pack/helm/summit`) now renders the operator stack and database clusters when `databaseFailover.enabled` is `true` (enabled by default). Key values include:

- `databaseFailover.postgres.operator.*`: Namespace, container image, scrape port, and operator config map.
- `databaseFailover.postgres.cluster.*`: Cluster name, team ID, topology, sizing, PostgreSQL/Patroni tuning, and exporter settings (including the credentials user consumed by the failover test script).
- `databaseFailover.neo4j.operator.*`: Operator namespace and image.
- `databaseFailover.neo4j.cluster.*`: Causal cluster sizing, storage, resources, metrics sidecar image/port, and authentication secret.
- `databaseFailover.monitoring.*`: Toggle creation of `ServiceMonitor`/`PrometheusRule` resources and supply shared labels, scrape interval, alert severity, or additional rules.

Environment-specific overrides live in the `values-*.yaml` files. For example, development reduces node counts and storage, while production scales to five PostgreSQL instances and a 5+3 Neo4j topology.

After updating any values, deploy via Helm/Argo CD as usual:

```bash
helm upgrade --install summit summit_helm_argocd_multiacct_pack/helm/summit -n summit-system -f summit_helm_argocd_multiacct_pack/helm/summit/values.yaml
```

## Monitoring Failover Events

Two `ServiceMonitor` objects target the operator metric services so Prometheus can scrape failover counters and leadership metrics. The packaged `PrometheusRule` defines alerts:

- **SummitPostgresFailoverTriggered** – fires when `postgresql_operator_cluster_events_total{event="failover"}` increments within a five-minute window.
- **SummitNeo4jLeadershipChange** – fires when `neo4j_causal_cluster_member_role{role="LEADER"}` changes within five minutes.

Use `databaseFailover.monitoring.prometheusRule.additionalRules` to append custom alerting logic without editing templates.

## Validating Automated Failover

Two scripts in `scripts/failover` automate disruptive tests:

- `test-postgres-failover.sh [namespace] [cluster]` deletes the current PostgreSQL primary (detected via `spilo-role=master`) and waits for a new ready primary.
- `test-neo4j-failover.sh [namespace] [cluster] [secret]` reads the Neo4j credentials secret, deletes the current leader after verifying it with `cypher-shell`, and waits for a new leader pod to report readiness.

Run them from a workstation with cluster access. Both scripts respect a `TIMEOUT_SECONDS` environment variable and provide timestamped logging. Capture Prometheus alerts during the drill to validate observability.

## Operational Tips

- Populate storage classes using cluster defaults via `spec.volume.volumeSource` or environment-specific overlays.
- When adjusting PostgreSQL users, ensure `databaseFailover.postgres.cluster.metrics.credentialsUser` stays aligned with an existing user for the exporter.
- Neo4j licensing: the enterprise image requires acceptance of the license agreement (already handled by the Helm template). Provide a valid license file via Kubernetes secret if needed.
- Integrate the manifests with Argo CD or Flux by pointing the app of apps to this chart and enabling the failover section in the relevant values file.

For disaster-recovery game days, combine the scripts with Prometheus alert acknowledgment workflows to rehearse operational runbooks.
