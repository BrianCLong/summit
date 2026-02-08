package supplychain.sigstore

import rego.v1

default allow := false

cosign_ok if {
  startswith(input.cosign.version, "3.")
  not re_match("^3\\.0\\.[0-3]$", input.cosign.version)
}

cosign_ok if {
  startswith(input.cosign.version, "2.")
  not re_match("^2\\.[0-5]\\.", input.cosign.version)
  not re_match("^2\\.6\\.[0-1]$", input.cosign.version)
}

allow if {
  input.evidence.result == "pass"
  cosign_ok
  input.trust.pinned == true
}
