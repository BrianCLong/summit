#!/bin/bash
# SPIRE Service Registration for IntelGraph Components

set -euo pipefail

TRUST_DOMAIN="${SPIRE_TRUST_DOMAIN:-intelgraph.local}"
NAMESPACE="${NAMESPACE:-intelgraph}"
SPIRE_SERVER_SOCKET="${SPIRE_SERVER_SOCKET:-/tmp/spire-server/private/api.sock}"

echo "🔐 Registering IntelGraph services with SPIRE..."
echo "Trust Domain: ${TRUST_DOMAIN}"
echo "Namespace: ${NAMESPACE}"

# Function to register a service
register_service() {
    local service_name="$1"
    local service_account="$2"
    local additional_selectors="$3"
    
    echo "📋 Registering ${service_name}..."
    
    spire-server entry create \
        -socketPath "${SPIRE_SERVER_SOCKET}" \
        -spiffeID "spiffe://${TRUST_DOMAIN}/ns/${NAMESPACE}/sa/${service_account}" \
        -parentID "spiffe://${TRUST_DOMAIN}/ns/spire/sa/spire-agent" \
        -selector "k8s:ns:${NAMESPACE}" \
        -selector "k8s:sa:${service_account}" \
        ${additional_selectors} \
        -ttl 3600
    
    echo "✅ ${service_name} registered successfully"
}

# Register core IntelGraph services
register_service "Conductor" "conductor" "-selector k8s:pod-label:app:conductor"
register_service "Gateway" "gateway" "-selector k8s:pod-label:app:gateway"
register_service "Worker" "worker" "-selector k8s:pod-label:app:worker"
register_service "Postgres" "postgres" "-selector k8s:pod-label:app:postgres"
register_service "Redis" "redis" "-selector k8s:pod-label:app:redis"

# Register marketplace and safety services
register_service "Marketplace" "marketplace" "-selector k8s:pod-label:component:marketplace"
register_service "Safety Service" "safety" "-selector k8s:pod-label:component:safety"
register_service "Trust Center" "trust-center" "-selector k8s:pod-label:component:trust-center"

# Register federated orchestration services
register_service "Federation Broker" "federation-broker" "-selector k8s:pod-label:component:federation"
register_service "Policy Broker" "policy-broker" "-selector k8s:pod-label:component:policy"

# Register monitoring services
register_service "Prometheus" "prometheus" "-selector k8s:pod-label:app:prometheus"
register_service "Grafana" "grafana" "-selector k8s:pod-label:app:grafana"

# Create parent entry for nodes
echo "📋 Registering node attestor..."
spire-server entry create \
    -socketPath "${SPIRE_SERVER_SOCKET}" \
    -spiffeID "spiffe://${TRUST_DOMAIN}/ns/spire/sa/spire-agent" \
    -selector "k8s_psat:cluster:${CLUSTER_NAME:-intelgraph-cluster}" \
    -selector "k8s_psat:agent_ns:spire" \
    -selector "k8s_psat:agent_sa:spire-agent" \
    -node \
    -ttl 43200

echo "🎉 All services registered with SPIRE successfully!"
echo ""
echo "🔍 Verify registrations:"
echo "kubectl exec -n spire spire-server-0 -- spire-server entry show -socketPath /tmp/spire-server/private/api.sock"
echo ""
echo "📊 Check SPIRE metrics:"
echo "kubectl port-forward -n spire svc/spire-server 9988:9988"
echo "curl http://localhost:9988/metrics"