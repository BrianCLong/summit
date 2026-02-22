# Service Authorization Policy Tests
# Unit tests for zero-trust service-to-service authorization

package zerotrust.service_authz_test
import future.keywords.if
import future.keywords.contains


import data.zerotrust.service_authz

good_governance := {
    "enforcement_mode": "enforce",
    "controls": [
        {
            "name": "opa-service-authz",
            "status": "pass",
            "enforced": true
        }
    ]
}

#############################################
# TEST: GATEWAY TO API SERVER
#############################################

test_gateway_to_api_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": good_governance,
        "request_id": "test-001"
    }
}

test_gateway_to_api_health_check_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "GET",
            "path": "/health/live"
        },
        "governance": good_governance,
        "request_id": "test-002"
    }
}

#############################################
# TEST: GATEWAY TO ADMINSEC
#############################################

test_gateway_to_adminsec_auth_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-adminsec"
        },
        "request": {
            "method": "POST",
            "path": "/auth/login"
        },
        "governance": good_governance,
        "request_id": "test-003"
    }
}

#############################################
# TEST: INTELLIGENCE VERTICALS
#############################################

test_osint_to_graphai_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-osint"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-graphai"
        },
        "request": {
            "method": "POST",
            "path": "/feature/extract"
        },
        "governance": good_governance,
        "request_id": "test-004"
    }
}

test_intel_cross_communication_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-osint"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-fintel"
        },
        "request": {
            "method": "POST",
            "path": "/correlate/entities"
        },
        "governance": good_governance,
        "request_id": "test-005"
    }
}

#############################################
# TEST: DATABASE ACCESS
#############################################

test_api_to_postgresql_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-data/sa/postgresql"
        },
        "request": {
            "method": "POST",
            "path": "/query"
        },
        "governance": good_governance,
        "request_id": "test-006"
    }
}

test_api_to_neo4j_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-data/sa/neo4j"
        },
        "request": {
            "method": "POST",
            "path": "/cypher"
        },
        "governance": good_governance,
        "request_id": "test-007"
    }
}

#############################################
# TEST: WORKER ACCESS
#############################################

test_worker_to_api_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-worker"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/internal/task-complete"
        },
        "governance": good_governance,
        "request_id": "test-008"
    }
}

test_worker_to_kafka_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-worker"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-data/sa/kafka"
        },
        "request": {
            "method": "POST",
            "path": "/produce"
        },
        "governance": good_governance,
        "request_id": "test-009"
    }
}

#############################################
# TEST: AI SERVICES
#############################################

test_copilot_to_graphai_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ai/sa/copilot"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-graphai"
        },
        "request": {
            "method": "POST",
            "path": "/embed/text"
        },
        "governance": good_governance,
        "request_id": "test-010"
    }
}

test_nlp_to_model_serving_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ai/sa/nlp-service"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ai/sa/model-serving"
        },
        "request": {
            "method": "POST",
            "path": "/v1/models/ner/infer"
        },
        "governance": good_governance,
        "request_id": "test-011"
    }
}

#############################################
# TEST: OBSERVABILITY
#############################################

test_prometheus_scraping_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/monitoring/sa/prometheus"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "GET",
            "path": "/metrics"
        },
        "governance": good_governance,
        "request_id": "test-012"
    }
}

test_service_to_otel_allowed if {
    service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/observability/sa/otel-collector"
        },
        "request": {
            "method": "POST",
            "path": "/v1/traces"
        },
        "governance": good_governance,
        "request_id": "test-013"
    }
}

#############################################
# TEST: DENY CASES
#############################################

test_invalid_spiffe_id_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://malicious.domain/ns/attack/sa/hacker"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": good_governance,
        "request_id": "test-014"
    }
}

test_unauthorized_communication_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-osint"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-system/sa/audit-svc"
        },
        "request": {
            "method": "POST",
            "path": "/admin/delete-all"
        },
        "governance": good_governance,
        "request_id": "test-015"
    }
}

test_wrong_method_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/monitoring/sa/prometheus"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "DELETE",
            "path": "/metrics"
        },
        "governance": good_governance,
        "request_id": "test-016"
    }
}

test_wrong_path_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-adminsec"
        },
        "request": {
            "method": "POST",
            "path": "/internal/dangerous-operation"
        },
        "governance": good_governance,
        "request_id": "test-017"
    }
}

#############################################
# TEST: DECISION METADATA
#############################################

test_decision_contains_required_fields if {
    decision := service_authz.decision with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": good_governance,
        "request_id": "test-018"
    }
    decision.allowed == true
    decision.source_service.service_account == "ga-gateway"
    decision.destination_service.service_account == "intelgraph-api"
}

test_audit_event_generated if {
    audit := service_authz.audit_event with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway",
            "ip": "10.0.1.5"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": good_governance,
        "request_id": "test-019"
    }
    audit.event_type == "service_authz"
    audit.source.service == "ga-gateway"
    audit.destination.service == "intelgraph-api"
    audit.decision.allowed == true
}

#############################################
# TEST: GOVERNANCE ENFORCEMENT
#############################################

test_governance_bypass_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": merge(good_governance, {"bypass": true}),
        "request_id": "test-020"
    }
}

test_governance_disabled_denied if {
    not service_authz.allow with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": merge(good_governance, {"enforcement_mode": "disabled"}),
        "request_id": "test-021"
    }
}

test_governance_verdict_exposes_control_chain if {
    decision := service_authz.decision with input as {
        "source": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/ga-gateway"
        },
        "destination": {
            "spiffe_id": "spiffe://intelgraph.local/ns/intelgraph-ga/sa/intelgraph-api"
        },
        "request": {
            "method": "POST",
            "path": "/graphql"
        },
        "governance": good_governance,
        "request_id": "test-022"
    }
    decision.governance.enforcement_mode == "enforce"
    decision.governance.controls[_].name == "opa-service-authz"
    decision.governance.status == "permit"
}
