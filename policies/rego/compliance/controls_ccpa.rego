package compliance

import data.compliance.lib_time as t

pass["ccpa-DSR-001"]["DSR within 45 days and status OK"] {
  input.evidence.spec == "summit.evidence.dsr.v1"
  opened := input.evidence.ticket.opened_at
  status := input.evidence.ticket.status
  now := input.now
  t.elapsed_days(opened, now) <= 45
  status == "acknowledged" or status == "fulfilled"
}

fail["ccpa-DSR-001"]["DSR overdue or invalid status"] {
  input.evidence.spec == "summit.evidence.dsr.v1"
  opened := input.evidence.ticket.opened_at
  now := input.now
  t.elapsed_days(opened, now) > 45
} else {
  input.evidence.spec == "summit.evidence.dsr.v1"
  s := input.evidence.ticket.status
  not (s == "acknowledged" or s == "fulfilled" or s == "opened")
}
