import future.keywords.in
import future.keywords.if
package pilot.gate

default allow := false

# Allow only when no unexcepted violations remain.
allow if {
  not pending_violations
}

# Aggregate all violations for evaluation.
all_violations contains v if {
  v := iam_wildcard_violation[_]
}

all_violations contains v if {
  v := privileged_workload_violation[_]
}

all_violations contains v if {
  v := public_exposure_violation[_]
}

all_violations contains v if {
  v := missing_tags_violation[_]
}

# Expose violations that are not safely allowlisted.
active_violations contains v if {
  v := all_violations[_]
  not allowlisted(v.id)
}

# Flag any remaining violations.
pending_violations if {
  count(active_violations) > 0
}

# IAM: Wildcard actions or resources are blocked.
iam_wildcard_violation contains v if {
  some policy in input.iam.policies
  id := policy.id
  effect := policy.effect
  lower(effect) == "allow"
  some stmt in policy.statements
  stmt.actions[_] == "*"
  v := {
    "id": "iam-wildcard",
    "resource": id,
    "message": sprintf("IAM policy %q uses wildcard actions", [id])
  }
}

iam_wildcard_violation contains v if {
  some policy in input.iam.policies
  id := policy.id
  effect := policy.effect
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
privileged_workload_violation contains v if {
  some workload in input.kubernetes.workloads
  kind := workload.kind
  name := workload.name
  workload.securityContext.privileged
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s requests privileged=true", [kind, name])
  }
}

privileged_workload_violation contains v if {
  some workload in input.kubernetes.workloads
  kind := workload.kind
  name := workload.name
  workload.securityContext.hostNetwork
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s uses hostNetwork", [kind, name])
  }
}

privileged_workload_violation contains v if {
  some workload in input.kubernetes.workloads
  kind := workload.kind
  name := workload.name
  workload.volumes[_].hostPath
  v := {
    "id": "k8s-privileged",
    "resource": sprintf("%s/%s", [kind, name]),
    "message": sprintf("Workload %s/%s mounts hostPath", [kind, name])
  }
}

# Public exposure without auth is blocked.
public_exposure_violation contains v if {
  some bucket in input.storage.buckets
  bucket.public == true
  v := {
    "id": "public-storage",
    "resource": bucket.name,
    "message": sprintf("Bucket %q is public without auth", [bucket.name])
  }
}

public_exposure_violation contains v if {
  some ingress in input.network.ingress
  ingress.public == true
  not ingress.auth_enabled
  v := {
    "id": "public-ingress",
    "resource": ingress.name,
    "message": sprintf("Ingress %q is public without auth", [ingress.name])
  }
}

# Required ownership metadata must exist.
missing_tags_violation contains v if {
  some resource in input.metadata
  required_tags := {"env", "team", "service"}
  missing := required_tags - {k | resource.tags[k]}
  count(missing) > 0
  v := {
    "id": "missing-tags",
    "resource": resource.name,
    "message": sprintf("Resource %q is missing tags: %v", [resource.name, sort(missing)])
  }
}

# Allowlist with owner + expiry + ticket enforcement.
allowlisted(id) if {
  some item in data.allowlist.exceptions
  item.id == id
  item.owner != ""
  item.ticket != ""
  not expired(item.expires)
}

expired(ts) if {
  parsed := time.parse_rfc3339_ns(ts)
  now := time.now_ns()
  parsed <= now
}
