package intelgraph.policy.export
import future.keywords.if

test_deny_on_restricted_license if {
  obj := {
    "action": "export",
    "dataset": {
      "sources": [
        {"license": "DISALLOW_EXPORT", "owner": "acme"}
      ]
    }
  }

  not allow with input as obj
  dr := data.intelgraph.policy.export.deny with input as obj
  count(dr) > 0
}

test_allow_when_no_denies if {
  obj := {
    "action": "export",
    "dataset": {
      "sources": [
        {"license": "ALLOW", "owner": "acme"},
        {"license": "PERMISSIVE", "owner": "contoso"}
      ]
    }
  }

  allow with input as obj
  dr := data.intelgraph.policy.export.deny with input as obj
  count(dr) == 0
}
