import future.keywords.in
import future.keywords.if
package supply_chain

import rego.v1

# Supply chain security policies
# SLSA compliance and software bill of materials validation

# Mandatory Signatures & Provenance

deny contains msg if {
	not input.sboms_signed
	msg := "Signed SBOM required"
}

deny contains msg if {
	not input.provenance_signed
	msg := "Signed provenance required"
}

# SLSA Provenance Validation

# Require SPDX SBOM
deny contains msg if {
	not input.artifact.sbom_spdx
	msg := "Artifact must include SPDX SBOM"
}

# Require CycloneDX SBOM
deny contains msg if {
	not input.artifact.sbom_cyclonedx
	msg := "Artifact must include CycloneDX SBOM"
}

# Require Build Provenance Attestation
deny contains msg if {
	not input.artifact.provenance_attestation
	msg := "Artifact must include Build Provenance Attestation"
}

# Require SLSA provenance for all artifacts
deny contains msg if {
	not input.slsa_provenance
	msg := "Artifact must include SLSA provenance attestation"
}

# Validate SLSA level
deny contains msg if {
	provenance := input.slsa_provenance
	provenance.predicate.buildType != "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1"
	msg := "SLSA provenance must use GitHub Actions build type"
}

# Require minimum SLSA level 3
deny contains msg if {
	provenance := input.slsa_provenance
	level := provenance.predicate.metadata.buildInvocationId
	not level
	msg := "SLSA Level 3 requires build invocation ID"
}

# Validate builder identity
deny contains msg if {
	provenance := input.slsa_provenance
	builder := provenance.predicate.builder.id
	not startswith(builder, "https://github.com/actions/runner")
	msg := sprintf("Untrusted builder: %s", [builder])
}

# SBOM Validation

# Require SBOM for all container images
deny contains msg if {
	input.type == "container_image"
	not input.sbom
	msg := "Container images must include Software Bill of Materials (SBOM)"
}

# Validate SBOM format
deny contains msg if {
	sbom := input.sbom
	sbom.spdxVersion != "SPDX-2.3"
	msg := "SBOM must use SPDX-2.3 format"
}

# Check for minimum package information
warn contains msg if {
	sbom := input.sbom
	count(sbom.packages) < 10
	msg := "SBOM contains unusually few packages, verify completeness"
}

# Validate package integrity
deny contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	pkg.downloadLocation != "NOASSERTION"
	not pkg.checksums
	msg := sprintf("Package %s missing integrity checksums", [pkg.name])
}

# License Compliance

# Require license information
warn contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	not pkg.licenseConcluded
	not pkg.licenseDeclared
	msg := sprintf("Package %s missing license information", [pkg.name])
}

# Deny prohibited licenses
deny contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	prohibited_license(pkg.licenseConcluded)
	msg := sprintf("Package %s uses prohibited license: %s", [pkg.name, pkg.licenseConcluded])
}

deny contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	prohibited_license(pkg.licenseDeclared)
	msg := sprintf("Package %s uses prohibited license: %s", [pkg.name, pkg.licenseDeclared])
}

prohibited_license(license) if {
	prohibited := [
		"GPL-3.0",
		"AGPL-3.0",
		"SSPL-1.0",
		"BCL",
		"BUSL-1.1"
	]
	license in prohibited
}

# Vulnerability Scanning

# Require vulnerability scan results
deny contains msg if {
	not input.vulnerability_scan
	msg := "Artifact must include vulnerability scan results"
}

# Deny critical vulnerabilities
deny contains msg if {
	scan := input.vulnerability_scan
	vuln := scan.vulnerabilities[_]
	vuln.severity == "CRITICAL"
	msg := sprintf("Critical vulnerability found: %s", [vuln.id])
}

# Warn about high severity vulnerabilities
warn contains msg if {
	scan := input.vulnerability_scan
	high_vulns := [vuln | vuln := scan.vulnerabilities[_]; vuln.severity == "HIGH"]
	count(high_vulns) > 5
	msg := sprintf("High number of HIGH severity vulnerabilities: %d", [count(high_vulns)])
}

# Container Image Signing

# Require container image signatures
deny contains msg if {
	input.type == "container_image"
	not input.signature
	msg := "Container images must be signed"
}

# Validate signature format
deny contains msg if {
	sig := input.signature
	sig.format != "cosign"
	msg := "Container signatures must use Cosign format"
}

# Require keyless signing with OIDC
deny contains msg if {
	sig := input.signature
	not sig.certificate
	msg := "Signatures must use keyless signing with OIDC certificate"
}

# Validate certificate issuer
deny contains msg if {
	cert := input.signature.certificate
	not cert.oidc_issuer
	msg := "Certificate must include OIDC issuer"
}

deny contains msg if {
	cert := input.signature.certificate
	cert.oidc_issuer != "https://token.actions.githubusercontent.com"
	msg := sprintf("Untrusted OIDC issuer: %s", [cert.oidc_issuer])
}

# Transparency Log Verification

# Require Rekor transparency log entry
deny contains msg if {
	not input.transparency_log
	msg := "Artifact must be recorded in Rekor transparency log"
}

# Validate log entry
deny contains msg if {
	log := input.transparency_log
	not log.uuid
	msg := "Transparency log entry must include UUID"
}

# Build Environment Security

# Validate build environment
deny contains msg if {
	provenance := input.slsa_provenance
	env := provenance.predicate.metadata.buildInvocationId
	not startswith(env, "https://github.com/")
	msg := "Build must originate from GitHub Actions"
}

# Require hermetic builds
warn contains msg if {
	provenance := input.slsa_provenance
	metadata := provenance.predicate.metadata
	not metadata.hermetic
	msg := "Consider using hermetic builds for better supply chain security"
}

# Dependency Validation

# Check for known malicious packages
deny contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	malicious_package(pkg.name)
	msg := sprintf("Malicious package detected: %s", [pkg.name])
}

malicious_package(name) if {
	# Example malicious packages - this would be populated from threat intelligence
	malicious := [
		"malicious-package",
		"typosquatting-lib"
	]
	name in malicious
}

# Validate package sources
warn contains msg if {
	sbom := input.sbom
	pkg := sbom.packages[_]
	pkg.downloadLocation != "NOASSERTION"
	not trusted_source(pkg.downloadLocation)
	msg := sprintf("Package %s from untrusted source: %s", [pkg.name, pkg.downloadLocation])
}

trusted_source(url) if {
	trusted_domains := [
		"registry.npmjs.org",
		"pypi.org",
		"repo1.maven.org",
		"crates.io",
		"pkg.go.dev"
	]
	some domain in trusted_domains
	contains(url, domain)
}

# Release Validation

# Require semantic versioning
warn contains msg if {
	version := input.version
	not regex.match(`^v?\d+\.\d+\.\d+`, version)
	msg := sprintf("Version should follow semantic versioning: %s", [version])
}

# Validate release artifacts
deny contains msg if {
	not input.artifacts
	msg := "Release must include artifacts manifest"
}

# Require artifact checksums
deny contains msg if {
	artifact := input.artifacts[_]
	not artifact.sha256
	msg := sprintf("Artifact %s missing SHA256 checksum", [artifact.name])
}

# Evidence Bundle Validation

# Require complete evidence bundle
deny contains msg if {
	not input.evidence_bundle
	msg := "Release must include complete evidence bundle"
}

# Validate evidence bundle components
required_evidence_components := [
	"slsa_provenance",
	"sbom",
	"vulnerability_scan",
	"signature",
	"transparency_log"
]

deny contains msg if {
	bundle := input.evidence_bundle
	missing := [component |
		component := required_evidence_components[_]
		not bundle[component]
	]
	count(missing) > 0
	msg := sprintf("Evidence bundle missing components: %v", [missing])
}

# General Artifact Signing

# Deny if SBOM is not signed
deny contains msg if {
	some i
	artifact := input.artifacts[i]
	not artifact.sbom_spdx
	msg := sprintf("Artifact %s missing SPDX SBOM", [artifact.name])
}

# Deny if provenance is not signed
deny contains msg if {
	some i
	artifact := input.artifacts[i]
	not artifact.sbom_cyclonedx
	msg := sprintf("Artifact %s missing CycloneDX SBOM", [artifact.name])
}

# Enforce Provenance Attestation presence
deny contains msg if {
	some i
	artifact := input.artifacts[i]
	not artifact.provenance_attestation
	msg := sprintf("Artifact %s missing provenance attestation", [artifact.name])
}

# Enforce Signature Verification
deny contains msg if {
	some i
	artifact := input.artifacts[i]
	not artifact.signature_verification_passed
	msg := sprintf("Artifact %s signature verification failed", [artifact.name])
}

# === Sovereign Enterprise Agentic AI Mandates ===

# Sovereign operations require multiple independent verifications
deny contains msg if {
	input.operation.isSovereign
	not independent_verification_complete
	msg := "Sovereign operation requires independent verification from at least 2 sources"
}

independent_verification_complete if {
	count(input.verification.independent_sources) >= 2
	verification_source_diversity
	all_verifications_signed
}

verification_source_diversity if {
	entities := {entity | some i; entity := input.verification.independent_sources[i].entity}
	count(entities) == count(input.verification.independent_sources)
}

all_verifications_signed if {
	every v in input.verification.independent_sources {
		v.signature_valid == true
	}
}

# Containment Readiness Verification
deny contains msg if {
	input.operation.isSovereign
	not containment_readiness_verified
	msg := "Sovereign operation requires verified containment readiness (Emergency Stop + Rollback)"
}

containment_readiness_verified if {
	input.containment.emergency_stop.available == true
	input.containment.rollback.prepared == true
	input.containment.human_override.enabled == true
}

# Lawful Interoperability & Jurisdictional Compliance
deny contains msg if {
	input.operation.isSovereign
	not jurisdictional_compliance_verified
	msg := "Sovereign operation fails jurisdictional compliance checks"
}

jurisdictional_compliance_verified if {
	every j in input.operation.affected_jurisdictions {
		input.compliance.jurisdictions[j].status == "COMPLIANT"
	}
}

# Reversible Autonomy Safeguards
deny contains msg if {
	input.operation.isSovereign
	not reversible_autonomy_safeguards
	msg := "Sovereign operation requires reversible autonomy safeguards"
}

reversible_autonomy_safeguards if {
	input.autonomy.reversibility.guaranteed == true
	input.autonomy.human_control.intervention_available == true
}