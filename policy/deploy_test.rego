package summit.deploy

import data.summit.deploy
import future.keywords.if

test_prod_allows if {
  deploy.allow with input as {
    "env": "prod",
    "pr": {"approvals": 2},
    "artifact": {"sbom": {"signed": true}},
    "evidence": {"bundle_id": "ev-1", "status": "verified"},
    "security": {"failures": []}
  }
}

test_prod_denies_on_security_failure if {
  not deploy.allow with input as {
    "env": "prod",
    "pr": {"approvals": 2},
    "artifact": {"sbom": {"signed": true}},
    "evidence": {"bundle_id": "ev-1", "status": "verified"},
    "security": {"failures": ["crit"]}
  }
}
