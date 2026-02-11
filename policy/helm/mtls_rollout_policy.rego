import future.keywords.in
import future.keywords.if
package helmchecks

# Input is a list of rendered Kubernetes resources (via `helm template`).

mtls_present if {
  some i
  input[i].kind == "PeerAuthentication"
  input[i].spec.mtls.mode == "STRICT"
}

dr_present if {
  some i
  input[i].kind == "DestinationRule"
  input[i].spec.trafficPolicy.tls.mode == "ISTIO_MUTUAL"
}

rollout_present if {
  some i
  input[i].apiVersion == "argoproj.io/v1alpha1"
  input[i].kind == "Rollout"
}

deny contains msg if {
  not mtls_present
  msg := "PeerAuthentication with STRICT mTLS is required"
}

deny contains msg if {
  not dr_present
  msg := "DestinationRule with ISTIO_MUTUAL is required"
}

deny contains msg if {
  not rollout_present
  msg := "Argo Rollout resource is required when rollouts are enabled"
}

# Ensure Deployment/Pod template has signed annotation
signed_annotation_present if {
  some i
  input[i].kind == "Deployment"
  input[i].spec.template.metadata.annotations["intelgraph.dev/signed"] == "true"
}

deny contains msg if {
  not signed_annotation_present
  msg := "Pod template must carry intelgraph.dev/signed: 'true' annotation"
}

# No plaintext NodePort Services when zero trust is enabled (heuristic)
no_nodeport_services_violation contains svc if {
  some i
  svc := input[i]
  svc.kind == "Service"
  svc.spec.type == "NodePort"
}

deny contains msg if {
  count(no_nodeport_services_violation) > 0
  msg := sprintf("NodePort Services not allowed when zero-trust is enabled (%v found)", [count(no_nodeport_services_violation)])
}
