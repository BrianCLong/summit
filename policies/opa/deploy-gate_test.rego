package maestro.deploy

import data.maestro.deploy.allow
import data.maestro.deploy.deny
test_allow_dev_maintainer if {
  allow with input as {"env": "dev", "actor": {"role": "maintainer", "user": "alice"}}
}
test_allow_dev_ci_bot if {
  allow with input as {"env": "dev", "actor": {"role": "ci-bot", "user": "github-actions"}}
}
test_deny_prod_maintainer if {
  deny with input as {"env": "prod", "actor": {"role": "maintainer", "user": "bob"}}
  # Expected message: "deploy denied: env=prod actor=bob"
}
test_deny_dev_developer if {
  deny with input as {"env": "dev", "actor": {"role": "developer", "user": "charlie"}}
  # Expected message: "deploy denied: env=dev actor=charlie"
}