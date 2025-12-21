package policy.export

default deny := []

iam_wildcard := input.iam.wildcard_actions { input.iam.wildcard_actions }
iam_wildcard := false { not input.iam.wildcard_actions }
iam_wildcard := false { not input.iam }

privileged_pod := input.k8s.privileged_pod { input.k8s.privileged_pod }
privileged_pod := false { not input.k8s.privileged_pod }
privileged_pod := false { not input.k8s }

# Deny use of wildcard IAM actions to avoid privilege escalation.
deny[msg] {
  iam_wildcard
  msg := "Deny wildcard IAM actions"
}

# Deny privileged Kubernetes pod execution.
deny[msg] {
  privileged_pod
  msg := "Deny privileged pods"
}
