# OPA Rego Policies for Image Admission
# Enforces security requirements at admission time

package registry.admission

import future.keywords.in
import future.keywords.if
import future.keywords.contains

# Default deny
default allow := false

# Main admission decision
allow if {
    image_is_from_trusted_registry
    image_has_valid_signature
    image_meets_slsa_requirements
    image_passes_vulnerability_check
}

# ============================================================================
# Registry Trust
# ============================================================================

trusted_registries := {
    "registry.intelgraph.local",
    "gcr.io/distroless",
    "ghcr.io/sigstore",
    "ghcr.io/aquasecurity",
}

image_is_from_trusted_registry if {
    some registry in trusted_registries
    startswith(input.image, registry)
}

image_is_from_trusted_registry if {
    # Allow internal registry
    startswith(input.image, "registry.intelgraph.local")
}

# ============================================================================
# Signature Verification
# ============================================================================

image_has_valid_signature if {
    input.verification.signatureVerified == true
}

# Allow unsigned images only in development
image_has_valid_signature if {
    input.namespace == "development"
    input.verification.signatureVerified == false
}

# ============================================================================
# SLSA Requirements
# ============================================================================

min_slsa_level := 3

image_meets_slsa_requirements if {
    input.verification.slsaLevel >= min_slsa_level
}

# Allow lower SLSA for base images from trusted sources
image_meets_slsa_requirements if {
    input.verification.slsaLevel >= 1
    image_is_trusted_base_image
}

trusted_base_patterns := [
    "gcr.io/distroless/",
    "docker.io/library/",
    "registry.k8s.io/",
]

image_is_trusted_base_image if {
    some pattern in trusted_base_patterns
    startswith(input.image, pattern)
}

# ============================================================================
# Vulnerability Check
# ============================================================================

image_passes_vulnerability_check if {
    input.vulnerabilities.critical == 0
    input.vulnerabilities.high == 0
}

# Allow with exceptions in non-production
image_passes_vulnerability_check if {
    input.namespace != "production"
    input.vulnerabilities.critical == 0
    input.vulnerabilities.high <= 5
}

# Check for approved exceptions
image_passes_vulnerability_check if {
    exception_approved
}

exception_approved if {
    some exception in data.approved_exceptions
    exception.image == input.image
    exception.expiresAt > time.now_ns()
}

# ============================================================================
# Violation Messages
# ============================================================================

violation contains msg if {
    not image_is_from_trusted_registry
    msg := sprintf("Image '%s' is not from a trusted registry", [input.image])
}

violation contains msg if {
    not image_has_valid_signature
    msg := sprintf("Image '%s' does not have a valid signature", [input.image])
}

violation contains msg if {
    not image_meets_slsa_requirements
    msg := sprintf("Image '%s' has SLSA level %d, minimum required is %d", [input.image, input.verification.slsaLevel, min_slsa_level])
}

violation contains msg if {
    input.vulnerabilities.critical > 0
    msg := sprintf("Image '%s' has %d critical vulnerabilities", [input.image, input.vulnerabilities.critical])
}

violation contains msg if {
    input.vulnerabilities.high > 0
    input.namespace == "production"
    msg := sprintf("Image '%s' has %d high vulnerabilities (blocked in production)", [input.image, input.vulnerabilities.high])
}

# ============================================================================
# Audit Information
# ============================================================================

audit := {
    "image": input.image,
    "namespace": input.namespace,
    "allowed": allow,
    "violations": violation,
    "timestamp": time.now_ns(),
    "verification": {
        "signature": input.verification.signatureVerified,
        "slsaLevel": input.verification.slsaLevel,
    },
    "vulnerabilities": input.vulnerabilities,
}
