# Workload Identity Policy for IntelGraph Zero-Trust
# SPIFFE/SPIRE-based workload identity verification
package intelgraph.zerotrust.workload

import rego.v1

# ============================================================================
# DEFAULTS
# ============================================================================
default allow := false
default workload_authenticated := false

# ============================================================================
# SPIFFE ID VALIDATION
# ============================================================================

# Validate SPIFFE ID format and trust domain
spiffe_id_valid if {
    input.spiffe_id != ""
    valid_trust_domain
    valid_path_format
}

valid_trust_domain if {
    parts := split(input.spiffe_id, "/")
    parts[0] == "spiffe:"
    parts[1] == ""
    parts[2] in data.trusted_domains
}

valid_path_format if {
    # Format: spiffe://trust-domain/ns/namespace/sa/service-account
    parts := split(input.spiffe_id, "/")
    count(parts) >= 7
    parts[3] == "ns"
    parts[5] == "sa"
}

# Extract components from SPIFFE ID
spiffe_components := {
    "trust_domain": trust_domain,
    "namespace": namespace,
    "service_account": service_account,
    "workload_name": workload_name
} if {
    parts := split(input.spiffe_id, "/")
    trust_domain := parts[2]
    namespace := parts[4]
    service_account := parts[6]
    workload_name := parts[count(parts) - 1] if count(parts) > 7
    workload_name := service_account if count(parts) == 7
}

# ============================================================================
# SVID (SPIFFE Verifiable Identity Document) VALIDATION
# ============================================================================

svid_valid if {
    input.svid.x509 != ""
    svid_not_expired
    svid_chain_valid
    svid_spiffe_id_matches
}

svid_not_expired if {
    input.svid.not_after > time.now_ns()
    input.svid.not_before < time.now_ns()
}

svid_chain_valid if {
    # Certificate chain must be rooted in trusted CA
    input.svid.issuer in data.trusted_svid_issuers
}

svid_spiffe_id_matches if {
    input.svid.spiffe_id == input.spiffe_id
}

# ============================================================================
# WORKLOAD ATTESTATION
# ============================================================================

# Kubernetes workload attestation
k8s_attestation_valid if {
    input.attestation.type == "k8s"
    k8s_namespace_trusted
    k8s_service_account_valid
    k8s_pod_identity_verified
}

k8s_namespace_trusted if {
    input.attestation.namespace in data.trusted_namespaces
}

k8s_service_account_valid if {
    ns := input.attestation.namespace
    sa := input.attestation.service_account
    sa in data.trusted_service_accounts[ns]
}

k8s_pod_identity_verified if {
    # Pod must have valid labels
    input.attestation.pod_labels["app.kubernetes.io/managed-by"] == "intelgraph"
    input.attestation.pod_labels["security.intelgraph.ai/verified"] == "true"
}

# Node attestation
node_attestation_valid if {
    input.attestation.type == "node"
    input.attestation.node_id in data.trusted_nodes
    node_attestation_fresh
}

node_attestation_fresh if {
    attestation_age := time.now_ns() - input.attestation.timestamp
    attestation_age < 86400000000000  # 24 hours
}

# ============================================================================
# WORKLOAD AUTHENTICATION
# ============================================================================

workload_authenticated if {
    spiffe_id_valid
    svid_valid
    attestation_valid
}

attestation_valid if {
    k8s_attestation_valid
}

attestation_valid if {
    node_attestation_valid
}

# ============================================================================
# WORKLOAD AUTHORIZATION
# ============================================================================

# Service-to-service authorization based on SPIFFE ID
service_authorized if {
    workload_authenticated
    source_allowed_to_call_destination
}

source_allowed_to_call_destination if {
    source := spiffe_components.workload_name
    dest := input.destination.workload_name

    # Check explicit allow rules
    data.service_policies[source].allowed_services[_] == dest
}

source_allowed_to_call_destination if {
    # Same namespace communication allowed by default
    spiffe_components.namespace == input.destination.namespace
    data.namespace_policies[spiffe_components.namespace].allow_internal == true
}

# ============================================================================
# WORKLOAD PERMISSIONS
# ============================================================================

# Get effective permissions for workload
workload_permissions := perms if {
    base_perms := data.workload_base_permissions[spiffe_components.workload_name]
    namespace_perms := data.namespace_permissions[spiffe_components.namespace]
    role_perms := workload_role_permissions

    perms := base_perms | namespace_perms | role_perms
}

workload_role_permissions := perms if {
    roles := data.workload_roles[spiffe_components.workload_name]
    perms := {perm |
        role := roles[_]
        perm := data.role_permissions[role][_]
    }
}

workload_role_permissions := set() if {
    not data.workload_roles[spiffe_components.workload_name]
}

# Check if workload has specific permission
has_permission(permission) if {
    permission in workload_permissions
}

has_permission(permission) if {
    # Check wildcard permissions
    parts := split(permission, ":")
    wildcard := sprintf("%s:*", [parts[0]])
    wildcard in workload_permissions
}

# ============================================================================
# WORKLOAD RESOURCE ACCESS
# ============================================================================

resource_access_allowed if {
    workload_authenticated
    required_permission := sprintf("%s:%s", [input.resource.type, input.action])
    has_permission(required_permission)
    resource_namespace_allowed
}

resource_namespace_allowed if {
    input.resource.namespace == spiffe_components.namespace
}

resource_namespace_allowed if {
    input.resource.namespace in data.cross_namespace_access[spiffe_components.namespace]
}

# ============================================================================
# WORKLOAD NETWORK POLICIES
# ============================================================================

network_access_allowed if {
    workload_authenticated
    egress_policy_allows
}

egress_policy_allows if {
    workload := spiffe_components.workload_name
    policy := data.network_policies[workload]

    # Check if destination is in allowed list
    input.destination.host in policy.allowed_egress
}

egress_policy_allows if {
    workload := spiffe_components.workload_name
    policy := data.network_policies[workload]

    # Check CIDR ranges
    some cidr in policy.allowed_egress_cidrs
    net.cidr_contains(cidr, input.destination.ip)
}

# ============================================================================
# WORKLOAD SECRETS ACCESS
# ============================================================================

secret_access_allowed if {
    workload_authenticated
    secret_policy_allows
}

secret_policy_allows if {
    workload := spiffe_components.workload_name
    namespace := spiffe_components.namespace

    # Workload can access secrets in its namespace
    input.secret.namespace == namespace
    input.secret.name in data.workload_secrets[workload]
}

secret_policy_allows if {
    # Cross-namespace secret access with explicit permission
    has_permission("secrets:cross-namespace")
    input.secret.name in data.cross_namespace_secrets[spiffe_components.workload_name]
}

# ============================================================================
# WORKLOAD AUDIT
# ============================================================================

audit_workload_action := {
    "timestamp": time.now_ns(),
    "spiffe_id": input.spiffe_id,
    "workload_name": spiffe_components.workload_name,
    "namespace": spiffe_components.namespace,
    "action": input.action,
    "resource": input.resource,
    "destination": input.destination,
    "authenticated": workload_authenticated,
    "authorized": allow,
    "permissions": workload_permissions
}

# ============================================================================
# MAIN AUTHORIZATION
# ============================================================================

allow if {
    workload_authenticated
    action_allowed
}

action_allowed if {
    input.action == "service_call"
    service_authorized
}

action_allowed if {
    input.action in ["read", "write", "delete"]
    resource_access_allowed
}

action_allowed if {
    input.action == "network"
    network_access_allowed
}

action_allowed if {
    input.action == "secret"
    secret_access_allowed
}

# ============================================================================
# RESPONSE
# ============================================================================

response := {
    "allow": allow,
    "authenticated": workload_authenticated,
    "spiffe_id": input.spiffe_id,
    "components": spiffe_components,
    "permissions": workload_permissions,
    "audit": audit_workload_action,
    "violations": violations
}

violations := v if {
    v := [msg |
        check := [
            {"cond": not spiffe_id_valid, "msg": "Invalid SPIFFE ID format"},
            {"cond": spiffe_id_valid; not svid_valid, "msg": "SVID validation failed"},
            {"cond": spiffe_id_valid; svid_valid; not attestation_valid, "msg": "Workload attestation failed"},
            {"cond": workload_authenticated; not action_allowed, "msg": "Action not authorized for workload"}
        ][_]
        check.cond
        msg := check.msg
    ]
}
