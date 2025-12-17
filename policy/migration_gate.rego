package summit.gates.migration

default allow = false

<<<<<<< HEAD
=======
# Approve migrations only when the PR is explicitly gated and compatibility tests pass.
>>>>>>> main
allow {
  input.change.contains_schema_change
  input.flags.migration_gate == true
  input.tests.backward_compat == true
  input.tests.forward_compat == true
}
