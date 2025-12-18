# Service Authorization Policy Tests
# Unit tests for zero-trust service-to-service authorization

package zerotrust.service_authz_test

import rego.v1
import data.zerotrust.service_authz

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
        "request_id": "test-019"
    }
    audit.event_type == "service_authz"
    audit.source.service == "ga-gateway"
    audit.destination.service == "intelgraph-api"
    audit.decision.allowed == true
}
