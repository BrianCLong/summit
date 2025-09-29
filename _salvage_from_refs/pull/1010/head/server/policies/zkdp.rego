package intelgraph.zkdp

default allow_run = false

allow_run {
  input.isExternalPublisher == true
  input.zkBundle.ok == true
  input.zkBundle.kMin >= 25
  input.zkBundle.epsCap_ok == true
  input.noRowExport == true
}

deny_reason[msg] {
  not allow_run
  msg := "zk_proof_required"
}
