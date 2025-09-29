package securiteyes.gates

import data.securiteyes.modes

default pass := false

pass if {
  base_conditions
  not modes.require_provenance
}

pass if {
  base_conditions
  input.pr.provenance.verified
}

base_conditions if {
  input.pr.sbom.clean
  input.pr.secrets.leaks == 0
  input.pr.tests.unit >= modes.unit_min
  input.pr.tests.critical_e2e_pass == true
  not pr_has_label("risk/exception")
}

pr_has_label(label) if {
  labels := input.pr.labels
  labels != null
  some idx
  labels[idx] == label
}

messages[msg] if {
  not input.pr.sbom.clean
  msg := "SBOM advisories present"
}

messages[msg] if {
  input.pr.secrets.leaks > 0
  msg := sprintf("secrets leaked: %d", [input.pr.secrets.leaks])
}

messages[msg] if {
  modes.require_provenance
  not input.pr.provenance.verified
  msg := "cosign provenance not verified"
}

messages[msg] if {
  input.pr.tests.unit < modes.unit_min
  msg := sprintf("unit coverage <min (%d)", [modes.unit_min])
}

messages[msg] if {
  not input.pr.tests.critical_e2e_pass
  msg := "critical e2e failing"
}

messages[msg] if {
  poly := input.pr.polygraph
  poly.score >= 60
  msg := sprintf("polygraph advisory: deception score %d (%s)", [poly.score, poly.confidence])
}
