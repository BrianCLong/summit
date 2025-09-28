#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts

kubectl get svc -A | egrep -i 'prometheus|grafana' | tee artifacts/k8s.monitoring.services.txt || true

# Common kube-prometheus-stack service names
kubectl -n monitoring get svc grafana prometheus-k8s -o wide 2>/dev/null \
  | tee artifacts/k8s.kps.common.txt || true

# Attempt to extract external endpoints (best-effort)
echo "prom.endpoint: $(kubectl -n monitoring get svc prometheus-k8s -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}{":"}{.spec.ports[0].port}' 2>/dev/null)" \
  | sed 's/ prom.endpoint: :/prom.endpoint: /' | tee artifacts/prom.endpoint.txt
echo "grafana.endpoint: $(kubectl -n monitoring get svc grafana -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}{":"}{.spec.ports[0].port}' 2>/dev/null)" \
  | sed 's/ grafana.endpoint: :/grafana.endpoint: /' | tee artifacts/grafana.endpoint.txt

