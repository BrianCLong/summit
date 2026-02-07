import future.keywords
package maestro.integrations.n8n.trigger

default allow = false

# Deny list of prefixes (hard default)
denied_prefixes := {"deploy/", "db/"}

# Allowed prefixes (default namespace for safe flows)
allowed_prefixes := {"integration/"}

# Roles permitted to trigger n8n flows
permitted_roles := {"ADMIN", "OPERATOR"}

flow_key := input.resource

deny_prefix {
  some p
  p := denied_prefixes[_]
  startswith(flow_key, p)
}

role_ok {
  input.role != null
  input.role == r
  r := upper(input.role)
  permitted_roles[r]
}

prefix_ok {
  some p
  p := allowed_prefixes[_]
  startswith(flow_key, p)
}

# Optional explicit allow list from data (e.g., data.maestro.n8n.allowed_flows)
explicit_ok {
  data.maestro.n8n.allowed_flows[flow_key]
}

allow {
  not deny_prefix
  role_ok
  (prefix_ok or explicit_ok)
}

reason := msg {
  deny_prefix
  msg := "denied by prefix policy"
} else := msg {
  not role_ok
  msg := "insufficient role"
} else := msg {
  not (prefix_ok or explicit_ok)
  msg := "flow not allowed"
} else := msg {
  allow
  msg := "allowed"
}

result := {"allow": allow, "reason": reason}

