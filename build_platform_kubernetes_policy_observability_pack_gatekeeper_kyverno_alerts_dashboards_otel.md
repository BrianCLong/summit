# Kubernetes Policy + Observability Pack

#

# Files are separated by `=== FILE: <path> ===`.

# This pack enforces digest-only images, non-root, read-only FS, minimal caps;

# adds default-deny network policies; and provides Prometheus alerts + Grafana

# dashboards + OTel collector.

=== FILE: k8s/policy/gatekeeper/constrainttemplate-k8srequiredimagedigest.yaml ===
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
name: k8srequiredimagedigest
spec:
crd:
spec:
names:
kind: K8sRequiredImageDigest
validation:
openAPIV3Schema:
type: object
properties:
repos:
description: List of allowed image repositories (prefix match)
type: array
items: { type: string }
targets: - target: admission.k8s.gatekeeper.sh
rego: |
package k8srequiredimagedigest

        repo_allowed(repo, allowed) {
          some i
          startswith(repo, allowed[i])
        }

        violation[{
          "msg": msg,
          "details": {"container": c.name, "image": c.image}
        }] {
          input.review.kind.kind == "Pod"
          allowed := input.parameters.repos
          c := input.review.object.spec.containers[_]
          not contains(c.image, "@sha256:")
          repo := split(c.image, "@")[0]
          repo_allowed(repo, allowed)
          msg := sprintf("image must be pinned by digest: %v", [c.image])
        }

=== FILE: k8s/policy/gatekeeper/constraint-k8srequiredimagedigest.yaml ===
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredImageDigest
metadata:
name: require-digest
spec:
match:
kinds: - apiGroups: [""]
kinds: ["Pod"]
parameters:
repos: - "ghcr.io/your-org/" - "your-private-registry.io/"

=== FILE: k8s/policy/gatekeeper/constrainttemplate-k8snonroot.yaml ===
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
name: k8snonroot
spec:
crd:
spec:
names:
kind: K8sNonRoot
targets: - target: admission.k8s.gatekeeper.sh
rego: |
package k8snonroot
violation[{
"msg": msg,
"details": {"container": c.name}
}] {
input.review.kind.kind == "Pod"
c := input.review.object.spec.containers[_]
not c.securityContext.runAsNonRoot
msg := sprintf("container must runAsNonRoot: %v", [c.name])
}

=== FILE: k8s/policy/gatekeeper/constraint-k8snonroot.yaml ===
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sNonRoot
metadata:
name: require-run-as-nonroot
spec:
match:
kinds: - apiGroups: [""]
kinds: ["Pod"]

=== FILE: k8s/policy/gatekeeper/constrainttemplate-k8sreadonlyfs.yaml ===
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
name: k8sreadonlyfs
spec:
crd:
spec:
names:
kind: K8sReadOnlyFS
targets: - target: admission.k8s.gatekeeper.sh
rego: |
package k8sreadonlyfs
violation[{
"msg": msg,
"details": {"container": c.name}
}] {
input.review.kind.kind == "Pod"
c := input.review.object.spec.containers[_]
not c.securityContext.readOnlyRootFilesystem
msg := sprintf("container must use readOnlyRootFilesystem: %v", [c.name])
}

=== FILE: k8s/policy/gatekeeper/constraint-k8sreadonlyfs.yaml ===
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sReadOnlyFS
metadata:
name: require-readonly-rootfs
spec:
match:
kinds: - apiGroups: [""]
kinds: ["Pod"]

=== FILE: k8s/policy/gatekeeper/constrainttemplate-k8smincaps.yaml ===
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
name: k8smincaps
spec:
crd:
spec:
names:
kind: K8sMinimalCapabilities
targets: - target: admission.k8s.gatekeeper.sh
rego: |
package k8smincaps
default allowed = ["CHOWN","DAC_OVERRIDE","SETGID","SETUID","NET_BIND_SERVICE"]
violation[{
"msg": msg,
"details": {"container": c.name, "cap": cap}
}] {
input.review.kind.kind == "Pod"
c := input.review.object.spec.containers[_]
caps := c.securityContext.capabilities.add
cap := caps[_]
not cap == allowed[_]
msg := sprintf("capability not allowed: %v", [cap])
}

=== FILE: k8s/policy/gatekeeper/constraint-k8smincaps.yaml ===
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sMinimalCapabilities
metadata:
name: require-minimal-capabilities
spec:
match:
kinds: - apiGroups: [""]
kinds: ["Pod"]

=== FILE: k8s/policy/kyverno/digest-only.yaml ===
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
name: require-image-digest
spec:
validationFailureAction: Enforce
background: true
rules: - name: enforce-digest
match:
resources:
kinds: [Pod]
validate:
message: "Images must be pinned by sha256 digest"
pattern:
spec:
containers: - image: "_@sha256:_"

=== FILE: k8s/policy/namespaces/default-deny-egress.yaml ===
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
name: default-deny-egress
namespace: your-namespace
spec:
podSelector: {}
policyTypes: [Egress]
egress: - to: - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: kube-system } }
ports: - protocol: UDP
port: 53 - protocol: TCP
port: 53

=== FILE: k8s/policy/namespaces/default-deny-ingress.yaml ===
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
name: default-deny-ingress
namespace: your-namespace
spec:
podSelector: {}
policyTypes: [Ingress]

=== FILE: k8s/policy/pdb/example-pdb.yaml ===
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
name: svc-pdb
namespace: your-namespace
spec:
minAvailable: 1
selector:
matchLabels:
app.kubernetes.io/name: your-svc

=== FILE: observability/prometheus/alerts.yml ===
groups:

- name: build-platform.rules
  rules:
  - alert: HighErrorRate
    expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
    for: 5m
    labels: { severity: page }
    annotations:
    summary: High 5xx error rate
    description: Error rate >1% for 5m.

  - alert: LatencyP95Regression
    expr: histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) > 0.7
    for: 10m
    labels: { severity: warn }
    annotations:
    summary: p95 > 700ms

  - alert: GatekeeperViolations
    expr: gatekeeper_violations{enforcement_action="deny"} > 0
    for: 2m
    labels: { severity: page }
    annotations:
    summary: Gatekeeper policy violations detected

  - alert: UnsignedImageDetected
    expr: kube_pod_labels{label_cosign_verified!="true"} == 1
    for: 2m
    labels: { severity: page }
    annotations:
    summary: Pod running image without cosign verification label

=== FILE: observability/grafana/dashboards/build-platform.json ===
{
"title": "IntelGraph — Build Platform SLOs",
"panels": [
{ "type": "timeseries", "title": "API p95 (ms)", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket[5m])) by (le)) _ 1000" }] },
{ "type": "timeseries", "title": "Error rate %", "targets": [{ "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) _ 100" }] },
{ "type": "timeseries", "title": "Queue Lag", "targets": [{ "expr": "kafka_consumergroup_lag" }] },
{ "type": "stat", "title": "Gatekeeper Violations", "targets": [{ "expr": "sum(gatekeeper_violations)" }] },
{ "type": "timeseries", "title": "Node CPU", "targets": [{ "expr": "avg(node_cpu_seconds_total{mode=\"idle\"})" }] }
]
}

=== FILE: observability/otel/collector-config.yaml ===
receivers:
otlp:
protocols:
http:
grpc:
exporters:
otlp:
endpoint: "otel-collector:4317"
tls:
insecure: true
logging: {}
processors:
batch: {}
service:
pipelines:
traces:
receivers: [otlp]
processors: [batch]
exporters: [otlp, logging]

=== FILE: Taskfile.yml (append) ===

# Add to existing Taskfile under tasks: (merge keys accordingly)

policy:apply:
desc: "Apply Gatekeeper/Kyverno policies"
cmds: - kubectl apply -f k8s/policy/gatekeeper/ - kubectl apply -f k8s/policy/kyverno/
observability:apply:
desc: "Apply Prometheus alerts and Grafana dashboards"
cmds: - kubectl create configmap prom-alerts --from-file=observability/prometheus/alerts.yml -n monitoring --dry-run=client -o yaml | kubectl apply -f - - kubectl create configmap grafana-build-platform --from-file=observability/grafana/dashboards/build-platform.json -n monitoring --dry-run=client -o yaml | kubectl apply -f -
otel:apply:
desc: "Deploy or update OTel Collector config"
cmds: - kubectl create configmap otel-collector-config --from-file=observability/otel/collector-config.yaml -n observability --dry-run=client -o yaml | kubectl apply -f -

=== FILE: docs/policy-operational-guide.md ===

# Policy Operational Guide

## Installing Gatekeeper vs Kyverno

- Choose one. If Gatekeeper installed, apply `k8s/policy/gatekeeper/*`.
- If Kyverno, apply `k8s/policy/kyverno/*` and remove Gatekeeper templates.

## Rollout Strategy

1. Start with `dry-run` (audit) by setting `enforcement_action: dryrun` (Gatekeeper) or `validationFailureAction: Audit` (Kyverno).
2. Monitor `gatekeeper_violations` (or Kyverno metrics) for 48h.
3. Switch to `enforce` and add Prometheus alert `GatekeeperViolations`.

## Exceptions

- Use `docs/policy-exceptions.md` with expiry ≤7 days.
- Label exception namespaces/pods; update alert rules to page on presence of exceptions > 0.
