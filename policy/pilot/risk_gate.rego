package pilot.gate

default allow = false

# Allow only when no unexcepted violations remain.
allow {
  not pending_violations
}

# Aggregate all violations for evaluation.
all_violations[v] {
  v := iam_wildcard_violation[_]
} else {
  v := privileged_workload_violation[_]
} else {
  v := public_exposure_violation[_]
} else {
  v := missing_tags_violation[_]
}

# Expose violations that are not safely allowlisted.
active_violations[v] {
  v := all_violations[_]
  not allowlisted(v.id)
}

# Flag any remaining violations.
pending_violations {
  count(active_violations) > 0
}

# IAM: Wildcard actions or resources are blocked.
iam_wildcard_violation[v] {
  some policy
  policy := input.iam.policies[_]
  policy.id := id
  policy.effect := effect
  lower(effect) == "allow"
  some stmt in policy.statements
  stmt.actions[_] == "*"
  v := {
    "id": "iam-wildcard",
    "resource": id,
    "message": sprintf("IAM policy %q uses wildcard actions", [id])
  }
}
iam_wildcard_violation[v] {
  some policy
  policy := input.iam.policies[_]
  policy.id := id
  policy.effect := effect
  lower(effect) == "allow"
  some stmt in policy.statements
  stmt.resources[_] == "*"
  v := {
    "id": "iam-wildcard",
    "resource": id,
    "message": sprintf("IAM policy %q uses wildcard resources", [id])
  }
}

# Kubernetes: privileged or host-level access is blocked.
privileged_workload_violation[v] {
  some workload
  workload := input.kubernetes.workloads[_]
  workload.kind := kind
  workload.name := name
  workload.securityContext.privileged
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s requests privileged=true", [kind, name])
  }
}
privileged_workload_violation[v] {
  some workload
  workload := input.kubernetes.workloads[_]
  workload.kind := kind
  workload.name := name
  workload.securityContext.hostNetwork
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s uses hostNetwork", [kind, name])
  }
}
privileged_workload_violation[v] {
  some workload
  workload := input.kubernetes.workloads[_]
  workload.kind := kind
  workload.name := name
  workload.volumes[_].hostPath
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s mounts hostPath", [kind, name])
  }
}

# Public exposure without auth is blocked.
public_exposure_violation[v] {
  some bucket
  bucket := input.storage.buckets[_]
  bucket.public == true
  v := {
    "id": "public-storage",
    "resource": bucket.name,
    "message": sprintf("Bucket %q is public without auth", [bucket.name])
  }
}
public_exposure_violation[v] {
  some ingress
  ingress := input.network.ingress[_]
  ingress.public == true
  not ingress.auth_enabled
  v := {
    "id": "public-ingress",
    "resource": ingress.name,
    "message": sprintf("Ingress %q is public without auth", [ingress.name])
  }
}

# Required ownership metadata must exist.
missing_tags_violation[v] {
  some resource
  resource := input.metadata[_]
  required_tags := {"env", "team", "service"}
  missing := required_tags - {k | resource.tags[k]}
  count(missing) > 0
  v := {
    "id": "missing-tags",
    "resource": resource.name,
    "message": sprintf("Resource %q is missing tags: %v", [resource.name, array.sort(missing)])
  }
}

# Allowlist with owner + expiry + ticket enforcement.
allowlisted(id) {
  some item
  item := data.allowlist.exceptions[_]
  item.id == id
  item.owner != ""
  item.ticket != ""
  not expired(item.expires)
}

expired(ts) {
  parsed := time.parse_rfc3339(ts)
  now := time.now_ns()
  parsed <= now
}
