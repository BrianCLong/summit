package cicd

default allow = false

allow {
  input.artifacts[_] == "signed"
  input.sboms[_].format == "SPDX"
  input.vulnerabilities.critical == 0
  input.vulnerabilities.high <= 5
  input.provenance.slsaLevel >= 3
}
