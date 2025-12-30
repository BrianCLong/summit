package summit.datapaths

import future.keywords.if
import future.keywords.in

allowed_systems := {"maestro", "intelgraph", "companyos"}

required_prefix[system] := sprintf("/v1/data/%s/", [system])

violations[msg] {
  dp := input.dataPaths[_]
  not dp.tags
  msg := sprintf("%s is missing required tags", [dp.id])
}

violations[msg] {
  dp := input.dataPaths[_]
  count(dp.tags) < 2
  msg := sprintf("%s must declare at least two tags", [dp.id])
}

violations[msg] {
  dp := input.dataPaths[_]
  not allowed_systems[dp.system]
  msg := sprintf("%s has unsupported system %s", [dp.id, dp.system])
}

violations[msg] {
  dp := input.dataPaths[_]
  allowed_systems[dp.system]
  not startswith(dp.path, required_prefix[dp.system])
  msg := sprintf("%s path %s must start with %s", [dp.id, dp.path, required_prefix[dp.system]])
}

violations[msg] {
  dp := input.dataPaths[_]
  allowed_systems[dp.system]
  not some { tag |
    dp.tags[_] == tag
    lower(tag) == lower(dp.system)
  }
  msg := sprintf("%s must include the system tag %s", [dp.id, dp.system])
}

violations[msg] {
  dup := {dp.id |
    some i
    some j
    i != j
    dp := input.dataPaths[i]
    input.dataPaths[j].id == dp.id
  }
  count(dup) > 0
  msg := sprintf("Duplicate data path ids found: %v", [dup])
}

valid if {
  count(violations) == 0
}
