# Air-Gapped Runtime Security Policy for IntelGraph
# Specialized policies for disconnected/isolated deployment environments
package intelgraph.zerotrust.airgap

import rego.v1

# ============================================================================
# AIR-GAPPED DEPLOYMENT DEFAULTS
# ============================================================================
default allow := false
default network_egress_allowed := false
default external_service_call_allowed := false

# ============================================================================
# NETWORK ISOLATION ENFORCEMENT
# ============================================================================

# Strict network egress control for air-gapped environments
network_egress_allowed if {
    # Only allow egress to approved internal destinations
    input.network.destination in data.airgap.approved_destinations
    input.network.protocol in ["tcp", "udp"]
    input.network.port in data.airgap.approved_ports
}

# DNS resolution restrictions
dns_resolution_allowed if {
    # Only internal DNS servers
    input.dns.server in data.airgap.internal_dns_servers
}

dns_resolution_allowed if {
    # Allow resolution of internal domains only
    endswith(input.dns.query, ".intelgraph.local")
}

dns_resolution_allowed if {
    endswith(input.dns.query, ".intelgraph.airgap")
}

dns_resolution_allowed if {
    endswith(input.dns.query, ".svc.cluster.local")
}

# Block all external service calls
external_service_call_allowed if {
    false  # Never allow in air-gapped mode
}

# ============================================================================
# LOCAL CERTIFICATE AUTHORITY ENFORCEMENT
# ============================================================================

# All certificates must be from internal CA
certificate_valid if {
    input.certificate.issuer in data.airgap.trusted_cas
    input.certificate.not_after > time.now_ns()
    input.certificate.not_before < time.now_ns()
    not certificate_revoked(input.certificate.serial)
}

certificate_revoked(serial) if {
    data.airgap.revoked_certificates[_] == serial
}

# mTLS enforcement
mtls_required if {
    input.service.type in ["api", "database", "cache", "queue"]
}

mtls_valid if {
    mtls_required
    input.connection.mtls_enabled == true
    certificate_valid
}

mtls_valid if {
    not mtls_required
}

# ============================================================================
# OFFLINE LICENSE VERIFICATION
# ============================================================================

# Verify license without external call
license_valid if {
    input.license.signature_valid == true
    input.license.expiry_timestamp > time.now_ns()
    input.license.deployment_type == "airgap"
    license_features_valid
}

license_features_valid if {
    required_features := data.airgap.required_license_features
    every feature in required_features {
        feature in input.license.features
    }
}

# ============================================================================
# LOCAL PACKAGE VERIFICATION
# ============================================================================

# All packages must be pre-approved and signed
package_installation_allowed if {
    input.package.name in data.airgap.approved_packages
    input.package.version in data.airgap.approved_packages[input.package.name].versions
    package_signature_valid
}

package_signature_valid if {
    input.package.signature.key_id in data.airgap.trusted_signing_keys
    input.package.signature.verified == true
}

# Container image verification
container_image_allowed if {
    # Must be from internal registry
    startswith(input.image.registry, "registry.intelgraph.local")
    image_digest_approved
    image_signature_valid
}

container_image_allowed if {
    startswith(input.image.registry, "registry.intelgraph.airgap")
    image_digest_approved
    image_signature_valid
}

image_digest_approved if {
    input.image.digest in data.airgap.approved_image_digests
}

image_signature_valid if {
    input.image.signature.cosign_verified == true
    input.image.signature.key_id in data.airgap.trusted_image_signing_keys
}

# ============================================================================
# WORKLOAD IDENTITY FOR AIR-GAPPED
# ============================================================================

# SPIFFE/SPIRE identity for air-gapped trust domain
workload_identity_valid if {
    startswith(input.workload.spiffe_id, "spiffe://intelgraph.airgap/")
    input.workload.svid_valid == true
    workload_attestation_valid
}

workload_attestation_valid if {
    # Kubernetes attestation for air-gapped cluster
    input.workload.attestation.type == "k8s_psat"
    input.workload.attestation.namespace in data.airgap.trusted_namespaces
    input.workload.attestation.service_account in data.airgap.trusted_service_accounts[input.workload.attestation.namespace]
}

# ============================================================================
# DATA TRANSFER CONTROLS
# ============================================================================

# Strict data transfer policies for air-gapped environments
data_transfer_allowed if {
    input.transfer.type == "internal"
    input.transfer.source_classification <= input.transfer.destination_clearance
}

# Cross-boundary data transfer (e.g., to/from removable media)
cross_boundary_transfer_allowed if {
    input.transfer.type == "cross_boundary"
    input.transfer.approved == true
    input.transfer.approval_id in data.airgap.approved_transfers
    transfer_audit_complete
}

transfer_audit_complete if {
    input.transfer.audit_logged == true
    input.transfer.reviewer_id != ""
    input.transfer.review_timestamp > 0
}

# Data classification enforcement
data_access_allowed if {
    input.user.clearance_level >= data.classification_levels[input.data.classification]
    compartment_access_allowed
}

compartment_access_allowed if {
    every compartment in input.data.compartments {
        compartment in input.user.compartments
    }
}

# ============================================================================
# AUDIT LOGGING FOR AIR-GAPPED
# ============================================================================

# Enhanced audit requirements for disconnected environments
audit_required := true  # Always audit in air-gapped mode

audit_entry := {
    "timestamp": time.now_ns(),
    "event_type": input.event_type,
    "workload_id": input.workload.spiffe_id,
    "user_id": input.user.id,
    "action": input.action,
    "resource": input.resource,
    "decision": allow,
    "network_isolated": true,
    "deployment_mode": "airgap",
    "local_sequence": input.audit.local_sequence,
    "checksum": audit_checksum
}

audit_checksum := crypto.sha256(sprintf("%s:%s:%s:%d", [
    input.workload.spiffe_id,
    input.action,
    input.resource.id,
    time.now_ns()
]))

# ============================================================================
# EMERGENCY ACCESS FOR AIR-GAPPED
# ============================================================================

# Break-glass emergency access
emergency_access_allowed if {
    input.emergency.code_valid == true
    input.emergency.code in data.airgap.emergency_codes
    emergency_code_not_expired
    emergency_code_not_used
}

emergency_code_not_expired if {
    code_data := data.airgap.emergency_code_data[input.emergency.code]
    code_data.expiry > time.now_ns()
}

emergency_code_not_used if {
    not input.emergency.code in data.airgap.used_emergency_codes
}

# ============================================================================
# SERVICE MESH POLICIES FOR AIR-GAPPED
# ============================================================================

# Inter-service communication within air-gapped mesh
service_to_service_allowed if {
    workload_identity_valid
    mtls_valid
    service_policy_allows
}

service_policy_allows if {
    source_service := extract_service_from_spiffe(input.source.spiffe_id)
    dest_service := extract_service_from_spiffe(input.destination.spiffe_id)

    allowed_destinations := data.airgap.service_policies[source_service].allowed_destinations
    dest_service in allowed_destinations
}

extract_service_from_spiffe(spiffe_id) := service if {
    parts := split(spiffe_id, "/")
    service := parts[count(parts) - 1]
}

# ============================================================================
# MAIN AUTHORIZATION DECISION
# ============================================================================

allow if {
    workload_identity_valid
    mtls_valid
    license_valid
    network_policy_compliant
    not security_violation_detected
}

network_policy_compliant if {
    input.network.type == "internal"
}

network_policy_compliant if {
    input.network.type == "egress"
    network_egress_allowed
}

security_violation_detected if {
    input.security.anomaly_score > 0.8
}

security_violation_detected if {
    input.security.threat_indicators[_] in data.airgap.critical_threat_indicators
}

# ============================================================================
# RESPONSE
# ============================================================================

response := {
    "allow": allow,
    "audit_entry": audit_entry,
    "mtls_required": mtls_required,
    "network_egress_allowed": network_egress_allowed,
    "emergency_access_active": emergency_access_allowed,
    "violations": violations
}

violations := v if {
    v := [msg |
        violation_check := [
            {"condition": not workload_identity_valid, "msg": "Invalid workload identity"},
            {"condition": mtls_required; not mtls_valid, "msg": "mTLS validation failed"},
            {"condition": not license_valid, "msg": "License validation failed"},
            {"condition": not network_policy_compliant, "msg": "Network policy violation"},
            {"condition": security_violation_detected, "msg": "Security violation detected"}
        ][_]
        violation_check.condition
        msg := violation_check.msg
    ]
}
