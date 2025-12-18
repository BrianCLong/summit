# Air-Gapped Runtime Policy Tests
package intelgraph.zerotrust.airgap_test

import rego.v1
import data.intelgraph.zerotrust.airgap

# ============================================================================
# TEST DATA
# ============================================================================

test_workload_input := {
  "workload": {
    "spiffe_id": "spiffe://intelgraph.airgap/ns/production/sa/api-service",
    "svid_valid": true,
    "attestation": {
      "type": "k8s_psat",
      "namespace": "intelgraph-production",
      "service_account": "api-service"
    }
  },
  "network": {
    "type": "internal",
    "destination": "postgresql.database.svc.cluster.local",
    "protocol": "tcp",
    "port": 5432
  },
  "certificate": {
    "issuer": "intelgraph-ca",
    "serial": "12345",
    "not_after": time.now_ns() + 86400000000000,
    "not_before": time.now_ns() - 86400000000000
  },
  "connection": {
    "mtls_enabled": true
  },
  "service": {
    "type": "api"
  },
  "license": {
    "signature_valid": true,
    "expiry_timestamp": time.now_ns() + 86400000000000,
    "deployment_type": "airgap",
    "features": ["core", "analytics", "copilot"]
  },
  "security": {
    "anomaly_score": 0.2,
    "threat_indicators": []
  }
}

test_external_network_input := {
  "network": {
    "type": "egress",
    "destination": "api.external.com",
    "protocol": "tcp",
    "port": 443
  }
}

# ============================================================================
# NETWORK ISOLATION TESTS
# ============================================================================

test_network_egress_allowed_internal if {
  input_data := {
    "network": {
      "destination": "postgresql.database.svc.cluster.local",
      "protocol": "tcp",
      "port": 5432
    }
  }
  airgap.network_egress_allowed with input as input_data
    with data.airgap.approved_destinations as ["postgresql.database.svc.cluster.local"]
    with data.airgap.approved_ports as [5432, 6379, 7687]
}

test_network_egress_denied_external if {
  input_data := {
    "network": {
      "destination": "api.external.com",
      "protocol": "tcp",
      "port": 443
    }
  }
  not airgap.network_egress_allowed with input as input_data
    with data.airgap.approved_destinations as ["postgresql.database.svc.cluster.local"]
    with data.airgap.approved_ports as [5432, 6379, 7687]
}

# ============================================================================
# DNS RESOLUTION TESTS
# ============================================================================

test_dns_allowed_internal_domain if {
  input_data := {
    "dns": {
      "server": "10.96.0.10",
      "query": "api.intelgraph.local"
    }
  }
  airgap.dns_resolution_allowed with input as input_data
    with data.airgap.internal_dns_servers as ["10.96.0.10"]
}

test_dns_allowed_cluster_local if {
  input_data := {
    "dns": {
      "server": "10.96.0.10",
      "query": "postgresql.database.svc.cluster.local"
    }
  }
  airgap.dns_resolution_allowed with input as input_data
    with data.airgap.internal_dns_servers as ["10.96.0.10"]
}

test_dns_allowed_airgap_domain if {
  input_data := {
    "dns": {
      "server": "10.96.0.10",
      "query": "service.intelgraph.airgap"
    }
  }
  airgap.dns_resolution_allowed with input as input_data
    with data.airgap.internal_dns_servers as ["10.96.0.10"]
}

# ============================================================================
# CERTIFICATE VALIDATION TESTS
# ============================================================================

test_certificate_valid_from_trusted_ca if {
  input_data := {
    "certificate": {
      "issuer": "intelgraph-ca",
      "serial": "12345",
      "not_after": time.now_ns() + 86400000000000,
      "not_before": time.now_ns() - 86400000000000
    }
  }
  airgap.certificate_valid with input as input_data
    with data.airgap.trusted_cas as ["intelgraph-ca", "intermediate-ca"]
    with data.airgap.revoked_certificates as []
}

test_certificate_invalid_untrusted_ca if {
  input_data := {
    "certificate": {
      "issuer": "external-ca",
      "serial": "12345",
      "not_after": time.now_ns() + 86400000000000,
      "not_before": time.now_ns() - 86400000000000
    }
  }
  not airgap.certificate_valid with input as input_data
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as []
}

test_certificate_invalid_revoked if {
  input_data := {
    "certificate": {
      "issuer": "intelgraph-ca",
      "serial": "revoked-12345",
      "not_after": time.now_ns() + 86400000000000,
      "not_before": time.now_ns() - 86400000000000
    }
  }
  not airgap.certificate_valid with input as input_data
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as ["revoked-12345"]
}

test_certificate_invalid_expired if {
  input_data := {
    "certificate": {
      "issuer": "intelgraph-ca",
      "serial": "12345",
      "not_after": time.now_ns() - 86400000000000,
      "not_before": time.now_ns() - 172800000000000
    }
  }
  not airgap.certificate_valid with input as input_data
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as []
}

# ============================================================================
# MTLS TESTS
# ============================================================================

test_mtls_required_for_api_service if {
  input_data := {
    "service": {
      "type": "api"
    }
  }
  airgap.mtls_required with input as input_data
}

test_mtls_required_for_database_service if {
  input_data := {
    "service": {
      "type": "database"
    }
  }
  airgap.mtls_required with input as input_data
}

test_mtls_valid_when_enabled_and_cert_valid if {
  input_data := {
    "service": {
      "type": "api"
    },
    "connection": {
      "mtls_enabled": true
    },
    "certificate": {
      "issuer": "intelgraph-ca",
      "serial": "12345",
      "not_after": time.now_ns() + 86400000000000,
      "not_before": time.now_ns() - 86400000000000
    }
  }
  airgap.mtls_valid with input as input_data
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as []
}

# ============================================================================
# LICENSE VALIDATION TESTS
# ============================================================================

test_license_valid_airgap if {
  input_data := {
    "license": {
      "signature_valid": true,
      "expiry_timestamp": time.now_ns() + 86400000000000,
      "deployment_type": "airgap",
      "features": ["core", "analytics"]
    }
  }
  airgap.license_valid with input as input_data
    with data.airgap.required_license_features as ["core"]
}

test_license_invalid_expired if {
  input_data := {
    "license": {
      "signature_valid": true,
      "expiry_timestamp": time.now_ns() - 86400000000000,
      "deployment_type": "airgap",
      "features": ["core"]
    }
  }
  not airgap.license_valid with input as input_data
    with data.airgap.required_license_features as ["core"]
}

test_license_invalid_wrong_deployment_type if {
  input_data := {
    "license": {
      "signature_valid": true,
      "expiry_timestamp": time.now_ns() + 86400000000000,
      "deployment_type": "cloud",
      "features": ["core"]
    }
  }
  not airgap.license_valid with input as input_data
    with data.airgap.required_license_features as ["core"]
}

test_license_invalid_missing_features if {
  input_data := {
    "license": {
      "signature_valid": true,
      "expiry_timestamp": time.now_ns() + 86400000000000,
      "deployment_type": "airgap",
      "features": ["basic"]
    }
  }
  not airgap.license_valid with input as input_data
    with data.airgap.required_license_features as ["core", "analytics"]
}

# ============================================================================
# WORKLOAD IDENTITY TESTS
# ============================================================================

test_workload_identity_valid if {
  input_data := {
    "workload": {
      "spiffe_id": "spiffe://intelgraph.airgap/ns/production/sa/api-service",
      "svid_valid": true,
      "attestation": {
        "type": "k8s_psat",
        "namespace": "intelgraph-production",
        "service_account": "api-service"
      }
    }
  }
  airgap.workload_identity_valid with input as input_data
    with data.airgap.trusted_namespaces as ["intelgraph-production", "intelgraph-staging"]
    with data.airgap.trusted_service_accounts as {"intelgraph-production": ["api-service", "worker-service"]}
}

test_workload_identity_invalid_untrusted_namespace if {
  input_data := {
    "workload": {
      "spiffe_id": "spiffe://intelgraph.airgap/ns/default/sa/malicious",
      "svid_valid": true,
      "attestation": {
        "type": "k8s_psat",
        "namespace": "default",
        "service_account": "malicious"
      }
    }
  }
  not airgap.workload_identity_valid with input as input_data
    with data.airgap.trusted_namespaces as ["intelgraph-production"]
    with data.airgap.trusted_service_accounts as {"intelgraph-production": ["api-service"]}
}

# ============================================================================
# CONTAINER IMAGE TESTS
# ============================================================================

test_container_image_allowed_local_registry if {
  input_data := {
    "image": {
      "registry": "registry.intelgraph.local/intelgraph/api",
      "digest": "sha256:abc123",
      "signature": {
        "cosign_verified": true,
        "key_id": "signing-key-001"
      }
    }
  }
  airgap.container_image_allowed with input as input_data
    with data.airgap.approved_image_digests as ["sha256:abc123"]
    with data.airgap.trusted_image_signing_keys as ["signing-key-001"]
}

test_container_image_denied_external_registry if {
  input_data := {
    "image": {
      "registry": "docker.io/library/nginx",
      "digest": "sha256:def456",
      "signature": {
        "cosign_verified": true,
        "key_id": "signing-key-001"
      }
    }
  }
  not airgap.container_image_allowed with input as input_data
    with data.airgap.approved_image_digests as ["sha256:def456"]
    with data.airgap.trusted_image_signing_keys as ["signing-key-001"]
}

test_container_image_denied_unapproved_digest if {
  input_data := {
    "image": {
      "registry": "registry.intelgraph.local/intelgraph/api",
      "digest": "sha256:unknown",
      "signature": {
        "cosign_verified": true,
        "key_id": "signing-key-001"
      }
    }
  }
  not airgap.container_image_allowed with input as input_data
    with data.airgap.approved_image_digests as ["sha256:abc123"]
    with data.airgap.trusted_image_signing_keys as ["signing-key-001"]
}

# ============================================================================
# DATA TRANSFER TESTS
# ============================================================================

test_internal_data_transfer_allowed if {
  input_data := {
    "transfer": {
      "type": "internal",
      "source_classification": 2,
      "destination_clearance": 3
    }
  }
  airgap.data_transfer_allowed with input as input_data
}

test_internal_data_transfer_denied_clearance_mismatch if {
  input_data := {
    "transfer": {
      "type": "internal",
      "source_classification": 4,
      "destination_clearance": 2
    }
  }
  not airgap.data_transfer_allowed with input as input_data
}

test_cross_boundary_transfer_allowed_with_approval if {
  input_data := {
    "transfer": {
      "type": "cross_boundary",
      "approved": true,
      "approval_id": "transfer-001",
      "audit_logged": true,
      "reviewer_id": "reviewer-001",
      "review_timestamp": time.now_ns()
    }
  }
  airgap.cross_boundary_transfer_allowed with input as input_data
    with data.airgap.approved_transfers as ["transfer-001"]
}

test_cross_boundary_transfer_denied_without_approval if {
  input_data := {
    "transfer": {
      "type": "cross_boundary",
      "approved": false
    }
  }
  not airgap.cross_boundary_transfer_allowed with input as input_data
    with data.airgap.approved_transfers as []
}

# ============================================================================
# SECURITY VIOLATION TESTS
# ============================================================================

test_security_violation_high_anomaly_score if {
  input_data := {
    "security": {
      "anomaly_score": 0.9,
      "threat_indicators": []
    }
  }
  airgap.security_violation_detected with input as input_data
    with data.airgap.critical_threat_indicators as []
}

test_security_violation_critical_indicator if {
  input_data := {
    "security": {
      "anomaly_score": 0.3,
      "threat_indicators": ["cryptominer_detected"]
    }
  }
  airgap.security_violation_detected with input as input_data
    with data.airgap.critical_threat_indicators as ["cryptominer_detected", "rootkit_detected"]
}

test_no_security_violation_clean if {
  input_data := {
    "security": {
      "anomaly_score": 0.2,
      "threat_indicators": []
    }
  }
  not airgap.security_violation_detected with input as input_data
    with data.airgap.critical_threat_indicators as ["cryptominer_detected"]
}

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

test_full_airgap_authorization_allowed if {
  airgap.allow with input as test_workload_input
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as []
    with data.airgap.trusted_namespaces as ["intelgraph-production"]
    with data.airgap.trusted_service_accounts as {"intelgraph-production": ["api-service"]}
    with data.airgap.required_license_features as ["core"]
    with data.airgap.critical_threat_indicators as []
}

test_full_airgap_authorization_denied_external_network if {
  modified_input := object.union(test_workload_input, {"network": {"type": "egress", "destination": "external.com"}})
  not airgap.allow with input as modified_input
    with data.airgap.trusted_cas as ["intelgraph-ca"]
    with data.airgap.revoked_certificates as []
    with data.airgap.trusted_namespaces as ["intelgraph-production"]
    with data.airgap.trusted_service_accounts as {"intelgraph-production": ["api-service"]}
    with data.airgap.required_license_features as ["core"]
    with data.airgap.approved_destinations as []
    with data.airgap.critical_threat_indicators as []
}
