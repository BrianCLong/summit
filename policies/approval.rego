package approval

import future.keywords

deny[msg] {
  input.action == "approve"
  input.user.id == input.resource.owner_id
  msg := "Self-approval not allowed"
}
