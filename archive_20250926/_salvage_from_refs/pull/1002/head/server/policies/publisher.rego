package intelgraph.publisher

default allow_list = false

allow_list {
  input.template.dp == true
  input.template.kMin >= 25
  input.template.compositeSig != null
  input.template.provenance.reproducible == true
  input.verification.staticOk == true
  input.verification.dynamicOk == true
}

deny_reason[msg] {
  not allow_list
  msg := "publisher_policy_denied"
}
