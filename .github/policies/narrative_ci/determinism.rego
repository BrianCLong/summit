package narrative_ci.determinism

import future.keywords.in

default deny = []

forbidden_keys := {"ts", "timestamp", "created_at", "updated_at"}

deny[msg] {
  payload := input.payloads[_]
  walk(payload, [path, value])
  is_object(value)
  some key
  key := object.keys(value)[_]
  key in forbidden_keys
  msg := sprintf("forbidden timestamp field %s at %v", [key, path])
}

test_determinism_pass {
  input := data.fixtures.determinism_pass
  count(deny with input as input) == 0
}

test_determinism_fail {
  input := data.fixtures.determinism_fail
  count(deny with input as input) > 0
}
