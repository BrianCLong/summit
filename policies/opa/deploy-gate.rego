package opa.deploy_gate

import future.keywords

allow {
  input.user.role == "maintainer"
}

allow {
  input.user.role == "ci-bot"
}
