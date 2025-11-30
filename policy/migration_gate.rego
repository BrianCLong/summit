package summit.gates.migration

default allow = false

allow {
  input.change.contains_schema_change
  input.flags.migration_gate == true
  input.tests.backward_compat == true
  input.tests.forward_compat == true
}
