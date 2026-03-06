package export

default allow = false

allow {
  input.license == "permitted"
  not blocked[input.caseId]
}

allow {
  input.license == "owner-consent"
  not blocked[input.caseId]
}

blocked[case] {
  input.sanctions_list[case]
}
