package compliance

import rego.v1
import data.compliance.lib_time as t

pass["ccpa-DSR-001"] contains "DSR within 45 days and status OK" if {
  input.evidence.spec == "summit.evidence.dsr.v1"
  opened := input.evidence.ticket.opened_at
  status := input.evidence.ticket.status
  now := input.now
  t.elapsed_days(opened, now) <= 45
  status == "acknowledged"
}

pass["ccpa-DSR-001"] contains "DSR within 45 days and status OK" if {
  input.evidence.spec == "summit.evidence.dsr.v1"
  opened := input.evidence.ticket.opened_at
  status := input.evidence.ticket.status
  now := input.now
  t.elapsed_days(opened, now) <= 45
  status == "fulfilled"
}

fail["ccpa-DSR-001"] contains "DSR overdue or invalid status" if {
  input.evidence.spec == "summit.evidence.dsr.v1"
  opened := input.evidence.ticket.opened_at
  now := input.now
  t.elapsed_days(opened, now) > 45
}

fail["ccpa-DSR-001"] contains "DSR overdue or invalid status" if {
  input.evidence.spec == "summit.evidence.dsr.v1"
  s := input.evidence.ticket.status
  not s == "acknowledged"
  not s == "fulfilled"
  not s == "opened"
}
