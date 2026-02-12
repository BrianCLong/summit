package compliance.lib_time

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Calculate elapsed days between two ISO timestamps
elapsed_days(start_iso, end_iso) = days {
  start_ns := time.parse_rfc3339_ns(start_iso)
  end_ns := time.parse_rfc3339_ns(end_iso)
  days := (end_ns - start_ns) / (1000000000 * 60 * 60 * 24)
}
