package summit.deploy

default allow = false

required = {
  "sbom.cdx.json",
  "sbom.cdx.sigstore.json",
  "provenance.slsa.json",
  "provenance.slsa.sigstore.json",
  "trivy.sbom.vuln.json",
  "deploy-gate-input.json",
  "opa-deploy-gate-decision.json"
}

allow {
  # Convert input array to set for comparison
  {x | x := input.artifacts_present[_]} == required
  input.signatures.sbom_valid
  input.signatures.provenance_valid
  input.vulnerabilities.critical == 0
}

deny[msg] {
  missing := required - {x | x := input.artifacts_present[_]}
  count(missing) > 0
  msg := sprintf("Missing required artifacts: %v", [missing])
}

deny[msg] {
  not input.signatures.sbom_valid
  msg := "SBOM signature invalid"
}

deny[msg] {
  not input.signatures.provenance_valid
  msg := "Provenance signature invalid"
}

deny[msg] {
  input.vulnerabilities.critical > 0
  msg := "Critical vulnerabilities detected"
}
