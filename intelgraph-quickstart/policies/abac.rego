package abac
import future.keywords.if

default allow = false

allow {
  input.subject.tenantId == input.resource.tenantId
}

# Example: deny search if purpose missing (extend as needed)
allow {
  input.action == "search"
  input.subject.purpose == "demo"
}
