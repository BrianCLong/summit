package devkit.authz

default allow = false

default reason = "request denied"

# Allow safe read-only requests by default
allow {
  input.method == "GET"
  input.path = ["health"]
  reason := "health read"
}

allow {
  input.method == "GET"
  startswith(join("/", input.path), "graphql")
  reason := "graphql introspection"
}

allow {
  input.user.role == "admin"
  reason := "admin override"
}

allow {
  input.user.role == "analyst"
  input.method == "POST"
  input.path = ["events"]
  reason := "analyst event publish"
}

# Provide decision metadata for logging
decision_metadata := {
  "allow": allow,
  "reason": reason,
  "input_path": input.path,
  "method": input.method
}
