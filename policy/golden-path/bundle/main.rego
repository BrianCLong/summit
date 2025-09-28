package goldenpath

import data.goldenpath.license
import data.goldenpath.cve
import data.goldenpath.secrets

allow if {
  license.allow
  cve.allow
  secrets.allow
}

deny[msg] := msg if {
  not license.allow
  msg := "license allowlist violation"
}

deny[msg] := msg if {
  not cve.allow
  msg := "cve budget exceeded"
}

deny[msg] := msg if {
  not secrets.allow
  msg := "secret scan findings present"
}
