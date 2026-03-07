package narrative_ci.determinism

default allow = false

deny_keys := {"ts", "timestamp", "created_at", "updated_at", "time", "datetime"}

allow {
  not has_bad_key(input.payload)
}

has_bad_key(x) {
  is_object(x)
  some k
  x[k]
  deny_keys[k]
}

has_bad_key(x) {
  is_object(x)
  some k
  has_bad_key(x[k])
}

has_bad_key(x) {
  is_array(x)
  some i
  has_bad_key(x[i])
}

is_object(x) { type_name(x) == "object" }
is_array(x) { type_name(x) == "array" }
