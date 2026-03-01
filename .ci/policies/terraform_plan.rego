package terraform.policy

import future.keywords

deny[msg] {
  some rc in input.resource_changes
  rc.change.after.tags.Environment == "prod"
  not input.metadata.change_control.approved
  msg := "Prod change without approval"
}
