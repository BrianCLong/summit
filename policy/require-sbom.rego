package pipeline

# Check for SPDX SBOM
deny[msg] {
    not has_file("build/sbom/sbom.spdx.json")
    msg := "Required artifact missing: build/sbom/sbom.spdx.json"
}

# Check for CycloneDX SBOM
deny[msg] {
    not has_file("build/sbom/sbom.cdx.json")
    msg := "Required artifact missing: build/sbom/sbom.cdx.json"
}

# Check for Provenance
deny[msg] {
    not has_file(".slsa/provenance.link")
    msg := "Required artifact missing: .slsa/provenance.link"
}

has_file(path) {
    input.files[_] == path
}

# If conftest is run without --combine, input might be the file content itself.
# This policy assumes --combine or a custom input structure.
