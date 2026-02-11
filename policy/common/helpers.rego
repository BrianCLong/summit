package policy.common.helpers

import future.keywords.in

import future.keywords.if

classification_rank := {"public": 0, "internal": 1, "restricted": 2}

default fallback_reason := "unspecified"

non_empty(val) if {
  val != null
  val != ""
}

has_clearance(clearance, classification) if {
  classification_rank[to_lower(clearance)] >= classification_rank[to_lower(classification)]
}

to_lower(s) := lower_s if {
  lower_s := lower(s)
}

set_from_array(arr) := {x | some i; x := arr[i]}

contains_all(haystack, needles) if {
  every n in needles {
    n in haystack
  }
}

allows_action(permission, action) if {
  permission == action
}

allows_action(permission, action) if {
  permission == "admin:*"
  startswith(action, "admin:")
}

time_in_window(ts, window) if {
  not window
}

time_in_window(ts, window) if {
  not non_empty(window.start)
}

time_in_window(ts, window) if {
  parsed := time.parse_rfc3339_ns(ts)
  clock := time.clock(parsed)
  hour := clock[0]
  minute := clock[1]
  start_parts := split(window.start, ":")
  end_parts := split(window.end, ":")
  start_minutes := to_number(start_parts[0]) * 60 + to_number(start_parts[1])
  end_minutes := to_number(end_parts[0]) * 60 + to_number(end_parts[1])
  now_minutes := hour * 60 + minute
  now_minutes >= start_minutes
  now_minutes <= end_minutes
}

subject_tenant := tenant if {
  tenant := input.subject.tenant
} else := tenant if {
  tenant := input.subject.tenant_id
} else := tenant if {
  tenant := input.context.tenant
}

audit_hash(id) := hash if {
  hash := sprintf("hash_%s", [crypto.sha256(sprintf("%v", [id]))])
}
