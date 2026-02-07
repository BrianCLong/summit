import future.keywords
package terraform.policy

deny[msg] {
  some rc
  rc := input.resource_changes[_]
  rc.change.after.tags.Environment == "prod"
  not input.metadata.change_control.approved
  msg := "Prod change without approval"
}