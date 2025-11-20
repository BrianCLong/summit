# Deployment Security Policy
# Validates that all deployed artifacts meet security requirements

package deployment

import future.keywords.if
import future.keywords.in

# Default deny - must explicitly pass all checks
default allow := false

# Allow deployment only if all security checks pass
allow if {
    count(deny) == 0
}

# Deny if image is not signed
deny contains msg if {
    input.image
    not image_signed(input.image)
    msg := sprintf("Image '%s' must be cryptographically signed before deployment", [input.image])
}

# Deny if SBOM attestation is missing
deny contains msg if {
    input.image
    not sbom_attested(input.image)
    msg := sprintf("Image '%s' must have SBOM attestation before deployment", [input.image])
}

# Deny if image has HIGH or CRITICAL vulnerabilities
deny contains msg if {
    input.image
    has_critical_vulnerabilities(input.image)
    msg := sprintf("Image '%s' contains HIGH or CRITICAL vulnerabilities and cannot be deployed", [input.image])
}

# Deny if image is from untrusted registry
deny contains msg if {
    input.image
    not trusted_registry(input.image)
    msg := sprintf("Image '%s' is not from a trusted registry (allowed: ghcr.io, cgr.dev)", [input.image])
}

# Deny if base image is not pinned to digest
deny contains msg if {
    input.dockerfile_content
    unpinned_base := unpinned_base_images(input.dockerfile_content)
    count(unpinned_base) > 0
    msg := sprintf("Dockerfile contains unpinned base images: %v. All images must use SHA256 digests.", [unpinned_base])
}

# Deny if secrets are present in image
deny contains msg if {
    input.image
    has_embedded_secrets(input.image)
    msg := sprintf("Image '%s' contains embedded secrets and cannot be deployed", [input.image])
}

# Deny if running as root user
deny contains msg if {
    input.container_config.user == "root"
    msg := "Container cannot run as root user. Specify non-root user (e.g., USER 1000)"
}

deny contains msg if {
    not input.container_config.user
    not input.container_config.read_only_root_filesystem
    msg := "Container must either specify non-root user or use read-only root filesystem"
}

# Deny if privileged mode is requested
deny contains msg if {
    input.container_config.privileged == true
    msg := "Containers cannot run in privileged mode"
}

# Deny if host network mode is used
deny contains msg if {
    input.container_config.network_mode == "host"
    msg := "Host network mode is not allowed for security reasons"
}

# Helper function: Check if image is signed (mocked - would call cosign)
image_signed(image) if {
    # In real implementation, this would execute:
    # cosign verify --certificate-identity-regexp="..." --certificate-oidc-issuer="..." <image>
    # For now, we'll check if it's marked as signed in metadata
    input.image_metadata.signed == true
}

# Helper function: Check if SBOM is attested
sbom_attested(image) if {
    input.image_metadata.sbom_attested == true
}

# Helper function: Check for critical vulnerabilities
has_critical_vulnerabilities(image) if {
    count(input.vulnerabilities) > 0
    some vuln in input.vulnerabilities
    vuln.severity in ["HIGH", "CRITICAL"]
}

# Helper function: Check if registry is trusted
trusted_registry(image) if {
    trusted_registries := ["ghcr.io", "cgr.dev", "docker.io/library"]
    some registry in trusted_registries
    startswith(image, registry)
}

# Helper function: Find unpinned base images in Dockerfile
unpinned_base_images(dockerfile) := unpinned if {
    lines := split(dockerfile, "\n")
    from_lines := [line | line := lines[_]; startswith(trim_space(line), "FROM")]
    unpinned := [line |
        line := from_lines[_]
        not contains(line, "@sha256:")
    ]
}

# Helper function: Check for embedded secrets
has_embedded_secrets(image) if {
    # In real implementation, would run trivy or similar
    count(input.image_secrets) > 0
}

# Helper function: Trim whitespace
trim_space(s) := trimmed if {
    trimmed := trim(s, " \t")
}

# Audit logging - Record all policy decisions
audit_log contains entry if {
    entry := {
        "timestamp": time.now_ns(),
        "image": input.image,
        "allowed": allow,
        "denials": deny,
        "requester": input.requester,
        "environment": input.environment
    }
}
