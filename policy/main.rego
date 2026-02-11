package main

import future.keywords.in

import future.keywords.if
import future.keywords.contains

default allow := false

# Import specific policies
import data.summit.data as data_policy

# --- Access Policy (Consolidated) ---
# Formerly in access.rego

allow if {
  input.actor.type == "user"
  some r
  input.actor.roles[r] == "governance-admin"
}

allow if {
  input.actor.type == "service"
  some r
  input.actor.roles[r] == "governance-bot"
}

# --- Data Policy Delegation ---

allow if {
  data_policy.allow
}

# --- Global Invariants ---

# Global invariant: deny if tenant is suspended
deny if {
  input.tenant.status == "suspended"
}
