package summit

deny[msg] {
  prov := input.provenance
  prov == null
  msg := "missing provenance attestation"
}

deny[msg] {
  prov := input.provenance
  not prov.builder.id
  msg := "provenance missing builder.id"
}

deny[msg] {
  prov := input.provenance
  not prov.metadata.runStartedOn
  msg := "provenance missing metadata.runStartedOn"
}

deny[msg] {
  prov := input.provenance
  count(prov.materials) == 0
  msg := "provenance missing materials"
}
