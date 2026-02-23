package maestro.deploy

import future.keywords.in

# Allow dev deploys only from maintainers and CI bots
allow {
  input.env == "dev"
  input.actor.role in ["maintainer", "ci-bot"]
}

deny[msg] {
  not allow
  msg := sprintf("deploy denied: env=%v actor=%v", [input.env, input.actor.user])
}
