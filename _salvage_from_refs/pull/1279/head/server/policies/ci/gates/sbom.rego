package ci.gates.sbom

default allow = false

# inputs: { "new_vulns": {"high": 0, "critical": 0} }
allow {
  input.new_vulns.high == 0
  input.new_vulns.critical == 0
}

