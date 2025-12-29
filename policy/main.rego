package main

default allow = false

# Import specific policies
import data.summit.data as data_policy

# --- Access Policy (Consolidated) ---
# Formerly in access.rego

allow {
  input.actor.type == "user"
  some r
  input.actor.roles[r] == "governance-admin"
}

allow {
  input.actor.type == "service"
  some r
  input.actor.roles[r] == "governance-bot"
}

# --- Data Policy Delegation ---

allow {
  data_policy.allow
}

# --- Global Invariants ---

# Global invariant: deny if tenant is suspended
deny {
  input.tenant.status == "suspended"
}
