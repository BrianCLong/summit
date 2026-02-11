import future.keywords.in
import future.keywords.if
package pilot.gate

import data.pilot.gate

# Happy path: no violations, allow is true.
test_allows_clean_change if {
  test_input := {
    "iam": {"policies": []},
    "kubernetes": {"workloads": []},
    "storage": {"buckets": []},
    "network": {"ingress": []},
    "metadata": [
      {"name": "svc-a", "tags": {"env": "stage", "team": "platform", "service": "intelgraph"}}
    ]
  }
  gate.allow with input as test_input
}

# Blocks wildcard IAM when not allowlisted.
test_blocks_wildcard_iam if {
  not gate.allow with input as {
    "iam": {
      "policies": [
        {
          "id": "wild",
          "effect": "Allow",
          "statements": [
            {"actions": ["*"], "resources": ["arn:aws:s3:::sensitive"]}
          ]
        }
      ]
    },
    "kubernetes": {"workloads": []},
    "storage": {"buckets": []},
    "network": {"ingress": []},
    "metadata": []
  }
}

# Blocks privileged pods.
test_blocks_privileged_pod if {
  not gate.allow with input as {
    "iam": {"policies": []},
    "kubernetes": {
      "workloads": [
        {
          "kind": "Deployment",
          "name": "danger",
          "securityContext": {"privileged": true},
          "volumes": []
        }
      ]
    },
    "storage": {"buckets": []},
    "network": {"ingress": []},
    "metadata": []
  }
}

# Warn-only allowlist still requires valid owner/ticket/expiry.
test_allowlist_requires_metadata if {
  not gate.allowlisted("missing-meta")
}

test_allowlist_accepts_valid_entry if {
  gate.allowlisted("iam-wildcard")
}

# Blocks public ingress without auth when no active allowlist.
test_blocks_public_ingress_when_expired if {
  test_input := {
    "iam": {"policies": []},
    "kubernetes": {"workloads": []},
    "storage": {"buckets": []},
    "network": {
      "ingress": [
        {"name": "ingress-main", "public": true, "auth_enabled": false}
      ]
    },
    "metadata": []
  }
  not gate.allow with input as test_input
}

# Blocks missing tags on resources.
test_blocks_missing_tags if {
  test_input := {
    "iam": {"policies": []},
    "kubernetes": {"workloads": []},
    "storage": {"buckets": []},
    "network": {"ingress": []},
    "metadata": [
      {"name": "svc-b", "tags": {"team": "platform"}}
    ]
  }
  not gate.allow with input as test_input
}
