package summit

import rego.v1

deny contains msg if {
  prov := input.provenance
  prov == null
  msg := "missing provenance attestation"
}

deny contains msg if {
  prov := input.provenance
  not prov.builder.id
  msg := "provenance missing builder.id"
}

deny contains msg if {
  prov := input.provenance
  not prov.metadata.runStartedOn
  msg := "provenance missing metadata.runStartedOn"
}

deny contains msg if {
  prov := input.provenance
  count(prov.materials) == 0
  msg := "provenance missing materials"
}
