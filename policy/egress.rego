package kubernetes.network
violation[{
  "msg": msg,
}] {
  input.kind.kind == "NetworkPolicy"
  count(input.spec.egress) == 0
  msg := "Egress must be explicitly allowed to known endpoints"
}
