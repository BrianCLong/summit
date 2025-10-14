package policy.release

# Input shape example:
# {
#   "sbom_present": true,
#   "provenance_present": true,
#   "critical_checks": ["sbom", "provenance"]
# }

default allow = false

missing_sbom {
  not input.sbom_present
}

missing_provenance {
  not input.provenance_present
}

deny[msg] {
  missing_sbom
  msg := "Release blocked: SBOM missing"
}

deny[msg] {
  missing_provenance
  msg := "Release blocked: SLSA provenance missing"
}

allow {
  input.sbom_present
  input.provenance_present
}
