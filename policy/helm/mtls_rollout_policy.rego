package helmchecks

# Input is a list of rendered Kubernetes resources (via `helm template`).

mtls_present {
  some i
  input[i].kind == "PeerAuthentication"
  input[i].spec.mtls.mode == "STRICT"
}

dr_present {
  some i
  input[i].kind == "DestinationRule"
  input[i].spec.trafficPolicy.tls.mode == "ISTIO_MUTUAL"
}

rollout_present {
  some i
  input[i].apiVersion == "argoproj.io/v1alpha1"
  input[i].kind == "Rollout"
}

deny[msg] {
  not mtls_present
  msg := "PeerAuthentication with STRICT mTLS is required"
}

deny[msg] {
  not dr_present
  msg := "DestinationRule with ISTIO_MUTUAL is required"
}

deny[msg] {
  not rollout_present
  msg := "Argo Rollout resource is required when rollouts are enabled"
}

# Ensure Deployment/Pod template has signed annotation
signed_annotation_present {
  some i
  input[i].kind == "Deployment"
  input[i].spec.template.metadata.annotations["intelgraph.dev/signed"] == "true"
}

deny[msg] {
  not signed_annotation_present
  msg := "Pod template must carry intelgraph.dev/signed: 'true' annotation"
}
