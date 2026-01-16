package summit.deploy

default allow = false

required_files = {
  "sbom.cdx.json",
  "sbom.cdx.sig",
  "provenance.json"
}

allow {
  artifacts_set := { x | x := input.artifacts_present[_] }
  artifacts_set == required_files
  input.sbom.signature_valid == true
  input.provenance.slsa_level >= 2
  input.vulnerabilities.critical == 0
}

deny[msg] {
  missing := required_files - input.artifacts_present
  count(missing) > 0
  msg := sprintf("Missing required supply-chain artifacts: %v", [missing])
}

deny[msg] {
  input.sbom.signature_valid == false
  msg := "SBOM signature validation failed"
}

deny[msg] {
  input.vulnerabilities.critical > 0
  msg := "Critical vulnerabilities detected"
}
