package summit

# Input contract:
# {
#   "evidence": {
#     "present": ["relative/path", ...],
#     "sha256": { "relative/path": "hex", ... }
#   }
# }

deny[msg] {
  not has_path("sbom/sbom.spdx.json")
  msg := "Missing SPDX SBOM (sbom/sbom.spdx.json) in evidence bundle"
}

deny[msg] {
  not has_path("sbom/sbom.cdx.json")
  msg := "Missing CycloneDX SBOM (sbom/sbom.cdx.json) in evidence bundle"
}

deny[msg] {
  not has_path("manifest.json")
  msg := "Missing evidence manifest (manifest.json) in evidence bundle"
}

# Optional signing policy: if signatures are present, require that both exist together.
deny[msg] {
  has_path("signatures/sbom.spdx.sig")
  not has_path("signatures/sbom.cdx.sig")
  msg := "Partial signature set: sbom.spdx.sig present but sbom.cdx.sig missing"
}

deny[msg] {
  has_path("signatures/sbom.cdx.sig")
  not has_path("signatures/sbom.spdx.sig")
  msg := "Partial signature set: sbom.cdx.sig present but sbom.spdx.sig missing"
}

has_path(rel) {
  some p
  p := input.evidence.present[_]
  endswith(p, rel)
}
