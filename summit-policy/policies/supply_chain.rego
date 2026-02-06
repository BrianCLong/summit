package summit.supply_chain

import rego.v1

default pass := false

sbom_present if {
	input.artifacts.sbom.path != ""
}

signed_image if {
	input.artifacts.image.signatures.cosign == true
}

provenance_ok if {
	input.artifacts.provenance.slsa_level >= 1
}

pass if {
	sbom_present
	signed_image
	provenance_ok
}

reasons_out contains r if {
	sbom_present
	r := "SBOM present"
}

reasons_out contains r if {
	not sbom_present
	r := "SBOM missing"
}

reasons_out contains r if {
	signed_image
	r := "cosign signature OK"
}

reasons_out contains r if {
	not signed_image
	r := "cosign signature missing"
}

reasons_out contains r if {
	provenance_ok
	r := "SLSA provenance OK"
}

reasons_out contains r if {
	not provenance_ok
	r := "SLSA provenance level insufficient"
}

verdict := {
	"verdict": verdict_str,
	"reasons": reasons_out,
	"policy_version": "2026.02.0",
}

verdict_str := "PASS" if {
	pass
}

else := "FAIL"
