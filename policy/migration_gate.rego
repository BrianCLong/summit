package summit.gates.migration
import future.keywords.if
import future.keywords.contains

default allow := false

# Approve migrations only when the PR is explicitly gated and compatibility tests pass.
allow if {
  input.change.contains_schema_change
  input.flags.migration_gate == true
  input.tests.backward_compat == true
  input.tests.forward_compat == true
}
