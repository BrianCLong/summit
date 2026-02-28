package maestro.integrations.n8n.trigger

import future.keywords

default allow = false

# Deny list of prefixes (hard default)
denied_prefixes := {"deploy/", "db/"}

# Allowed prefixes (default namespace for safe flows)
allowed_prefixes := {"integration/"}

# Roles permitted to trigger n8n flows
permitted_roles := {"ADMIN", "OPERATOR"}

flow_key := input.resource

deny_prefix {
  some p in denied_prefixes
  startswith(flow_key, p)
}

role_ok {
  input.role != null
  permitted_roles[upper(input.role)]
}

prefix_ok {
  some p in allowed_prefixes
  startswith(flow_key, p)
}

# Optional explicit allow list from data (e.g., data.maestro.n8n.allowed_flows)
explicit_ok {
  data.maestro.n8n.allowed_flows[flow_key]
}

allow {
  not deny_prefix
  role_ok
  prefix_ok
}

allow {
  not deny_prefix
  role_ok
  explicit_ok
}

reason := msg {
  deny_prefix
  msg := "denied by prefix policy"
} else := msg {
  not role_ok
  msg := "insufficient role"
} else := msg {
  not prefix_ok
  not explicit_ok
  msg := "flow not allowed"
} else := msg {
  allow
  msg := "allowed"
}

result := {"allow": allow, "reason": reason}

