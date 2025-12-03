package summit.deploy

import data.summit.deploy

test_prod_allows {
  deploy.allow with input as {
    "env": "prod",
    "pr": {"approvals": 2},
    "artifact": {"sbom": {"signed": true}},
    "security": {"failures": []}
  }
}

test_prod_denies_on_security_failure {
  not deploy.allow with input as {
    "env": "prod",
    "pr": {"approvals": 2},
    "artifact": {"sbom": {"signed": true}},
    "security": {"failures": ["crit"]}
  }
}
