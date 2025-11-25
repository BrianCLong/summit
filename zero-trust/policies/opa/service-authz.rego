# Service-to-Service Authorization Policy
# Zero-Trust enforcement for inter-service communication
#
# This policy evaluates whether a service is allowed to communicate with another
# service based on SPIFFE identity, communication matrix, and contextual attributes.

package zerotrust.service_authz

import rego.v1

# Default deny - all service communication denied unless explicitly allowed
default allow := false

# Policy metadata
policy_info := {
    "version": "1.0.0",
    "description": "Zero-Trust service-to-service authorization policy",
    "owner": "platform-security-team",
    "last_updated": "2025-11-25T00:00:00Z"
}

# Trust domain
trust_domain := "intelgraph.local"

#############################################
# MAIN AUTHORIZATION DECISION
#############################################

# Allow if all conditions are met
allow if {
    valid_spiffe_identity
    communication_allowed
    not deny_rules_triggered
    rate_limit_ok
}

# Detailed decision with explanation
decision := {
    "allowed": allow,
    "reason": reason,
    "source_service": source_service,
    "destination_service": destination_service,
    "source_spiffe_id": input.source.spiffe_id,
    "destination_spiffe_id": input.destination.spiffe_id,
    "timestamp": time.now_ns(),
    "request_id": input.request_id
}

reason := "allowed: all conditions met" if {
    allow
}

reason := concat(": ", ["denied", denial_reason]) if {
    not allow
}

#############################################
# SPIFFE IDENTITY VALIDATION
#############################################

# Validate SPIFFE ID format and trust domain
valid_spiffe_identity if {
    valid_source_spiffe_id
    valid_destination_spiffe_id
}

valid_source_spiffe_id if {
    startswith(input.source.spiffe_id, concat("", ["spiffe://", trust_domain, "/"]))
}

valid_destination_spiffe_id if {
    startswith(input.destination.spiffe_id, concat("", ["spiffe://", trust_domain, "/"]))
}

# Extract service information from SPIFFE ID
# Format: spiffe://trust-domain/ns/<namespace>/sa/<service-account>
source_service := service if {
    parts := split(input.source.spiffe_id, "/")
    count(parts) >= 6
    service := {
        "namespace": parts[4],
        "service_account": parts[6]
    }
}

destination_service := service if {
    parts := split(input.destination.spiffe_id, "/")
    count(parts) >= 6
    service := {
        "namespace": parts[4],
        "service_account": parts[6]
    }
}

#############################################
# COMMUNICATION MATRIX RULES
#############################################

# Check if communication is allowed based on the matrix
communication_allowed if {
    some rule in communication_rules
    rule_matches(rule)
}

# Rule matching logic
rule_matches(rule) if {
    source_matches(rule.source)
    destination_matches(rule.destination)
    method_allowed(rule)
    path_allowed(rule)
}

source_matches(source_spec) if {
    source_spec.service == source_service.service_account
    source_spec.namespace == source_service.namespace
}

source_matches(source_spec) if {
    source_spec.services[_] == source_service.service_account
    source_spec.namespace == source_service.namespace
}

source_matches(source_spec) if {
    source_spec.type == "all-services"
    source_service.namespace in source_spec.namespaces
}

destination_matches(dest_spec) if {
    dest_spec.service == destination_service.service_account
    dest_spec.namespace == destination_service.namespace
}

destination_matches(dest_spec) if {
    dest_spec.services[_] == destination_service.service_account
    dest_spec.namespace == destination_service.namespace
}

destination_matches(dest_spec) if {
    dest_spec.type == "all-services"
    destination_service.namespace in dest_spec.namespaces
}

method_allowed(rule) if {
    not rule.allow.methods
}

method_allowed(rule) if {
    input.request.method in rule.allow.methods
}

path_allowed(rule) if {
    not rule.allow.paths
}

path_allowed(rule) if {
    some path_pattern in rule.allow.paths
    glob.match(path_pattern, ["/"], input.request.path)
}

#############################################
# COMMUNICATION RULES DEFINITION
#############################################

# Core communication rules (compiled from communication-matrix.yaml)
communication_rules := [
    # Gateway to API Server
    {
        "name": "gateway-to-api",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST", "PUT", "DELETE", "PATCH"], "paths": ["/api/*", "/graphql", "/health/*"]}
    },
    # Gateway to AdminSec
    {
        "name": "gateway-to-adminsec",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-adminsec", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST", "PUT", "DELETE"], "paths": ["/auth/*", "/users/*", "/policies/*", "/sessions/*"]}
    },
    # Gateway to GraphAI
    {
        "name": "gateway-to-graphai",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-graphai", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/feature/*", "/embed/*", "/er/*", "/lp/*", "/community/*"]}
    },
    # Gateway to Forensics
    {
        "name": "gateway-to-forensics",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-forensics", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/evidence/*", "/custody/*", "/integrity/*"]}
    },
    # Gateway to Intelligence Verticals
    {
        "name": "gateway-to-osint",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-osint", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/intel/*", "/analysis/*", "/synthesis/*"]}
    },
    {
        "name": "gateway-to-fintel",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-fintel", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/intel/*", "/analysis/*", "/synthesis/*"]}
    },
    {
        "name": "gateway-to-cyber",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-cyber", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/intel/*", "/analysis/*", "/synthesis/*"]}
    },
    {
        "name": "gateway-to-tradecraft",
        "source": {"service": "ga-gateway", "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-tradecraft", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/intel/*", "/analysis/*", "/synthesis/*"]}
    },
    # API Server to Authorization Gateway
    {
        "name": "api-to-authz",
        "source": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "destination": {"service": "authz-gateway", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["POST"], "paths": ["/v1/data/*", "/v1/query"]}
    },
    # API Server to Databases
    {
        "name": "api-to-postgresql",
        "source": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "destination": {"service": "postgresql", "namespace": "intelgraph-data"},
        "allow": {}
    },
    {
        "name": "api-to-neo4j",
        "source": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "destination": {"service": "neo4j", "namespace": "intelgraph-data"},
        "allow": {}
    },
    {
        "name": "api-to-redis",
        "source": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "destination": {"service": "redis", "namespace": "intelgraph-data"},
        "allow": {}
    },
    # API Server to Audit
    {
        "name": "api-to-audit",
        "source": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "destination": {"service": "audit-svc", "namespace": "intelgraph-system"},
        "allow": {"methods": ["POST"], "paths": ["/audit/*", "/events/*"]}
    },
    # Intelligence Verticals Cross-Communication
    {
        "name": "intel-verticals-cross",
        "source": {"services": ["ga-osint", "ga-fintel", "ga-cyber", "ga-tradecraft"], "namespace": "intelgraph-ga"},
        "destination": {"services": ["ga-osint", "ga-fintel", "ga-cyber", "ga-tradecraft"], "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/intel/*", "/analysis/*", "/synthesis/*", "/correlate/*"]}
    },
    # Intelligence to GraphAI
    {
        "name": "intel-to-graphai",
        "source": {"services": ["ga-osint", "ga-fintel", "ga-cyber", "ga-tradecraft"], "namespace": "intelgraph-ga"},
        "destination": {"service": "ga-graphai", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/feature/*", "/embed/*", "/er/*"]}
    },
    # Intelligence to NLP
    {
        "name": "intel-to-nlp",
        "source": {"services": ["ga-osint", "ga-fintel", "ga-cyber", "ga-tradecraft"], "namespace": "intelgraph-ga"},
        "destination": {"service": "nlp-service", "namespace": "intelgraph-ai"},
        "allow": {"methods": ["POST"], "paths": ["/analyze/*", "/extract/*", "/summarize/*"]}
    },
    # Intelligence to Databases
    {
        "name": "intel-to-neo4j",
        "source": {"services": ["ga-osint", "ga-fintel", "ga-cyber", "ga-tradecraft"], "namespace": "intelgraph-ga"},
        "destination": {"service": "neo4j", "namespace": "intelgraph-data"},
        "allow": {}
    },
    # Worker to API
    {
        "name": "worker-to-api",
        "source": {"service": "ga-worker", "namespace": "intelgraph-ga"},
        "destination": {"service": "intelgraph-api", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST", "PUT"], "paths": ["/api/*", "/internal/*"]}
    },
    # Worker to Databases
    {
        "name": "worker-to-databases",
        "source": {"service": "ga-worker", "namespace": "intelgraph-ga"},
        "destination": {"services": ["postgresql", "neo4j", "redis", "kafka"], "namespace": "intelgraph-data"},
        "allow": {}
    },
    # AI Services Cross-Communication
    {
        "name": "ai-services-to-model-serving",
        "source": {"services": ["ai-service-platform", "prediction-service", "nlp-service", "copilot"], "namespace": "intelgraph-ai"},
        "destination": {"service": "model-serving", "namespace": "intelgraph-ai"},
        "allow": {"methods": ["POST"], "paths": ["/v1/models/*", "/v2/models/*"]}
    },
    # Copilot to GraphAI
    {
        "name": "copilot-to-graphai",
        "source": {"service": "copilot", "namespace": "intelgraph-ai"},
        "destination": {"service": "ga-graphai", "namespace": "intelgraph-ga"},
        "allow": {"methods": ["GET", "POST"], "paths": ["/*"]}
    },
    # Prometheus Scraping
    {
        "name": "prometheus-scraping",
        "source": {"service": "prometheus", "namespace": "monitoring"},
        "destination": {"type": "all-services", "namespaces": ["intelgraph-ga", "intelgraph-data", "intelgraph-analytics", "intelgraph-ai", "intelgraph-system"]},
        "allow": {"methods": ["GET"], "paths": ["/metrics", "/health", "/ready", "/live"]}
    },
    # OpenTelemetry Collection
    {
        "name": "otel-collection",
        "source": {"type": "all-services", "namespaces": ["intelgraph-ga", "intelgraph-data", "intelgraph-analytics", "intelgraph-ai", "intelgraph-system"]},
        "destination": {"service": "otel-collector", "namespace": "observability"},
        "allow": {}
    }
]

#############################################
# DENY RULES
#############################################

# Explicit deny rules that override allows
deny_rules_triggered if {
    some deny_rule in deny_rules
    deny_rule_matches(deny_rule)
}

deny_rules := [
    # Never allow direct database access from external
    {
        "name": "block-external-db-access",
        "source_namespace": "ingress-nginx",
        "destination_services": ["postgresql", "neo4j", "redis", "kafka"]
    },
    # Never allow cross-namespace admin operations
    {
        "name": "block-cross-namespace-admin",
        "paths": ["/admin/*", "/system/*", "/internal/admin/*"],
        "same_namespace_required": true
    }
]

deny_rule_matches(rule) if {
    rule.source_namespace == source_service.namespace
    destination_service.service_account in rule.destination_services
}

deny_rule_matches(rule) if {
    rule.same_namespace_required
    source_service.namespace != destination_service.namespace
    glob.match(rule.paths[_], ["/"], input.request.path)
}

#############################################
# RATE LIMITING
#############################################

# Check rate limits
rate_limit_ok if {
    not rate_limit_exceeded
}

rate_limit_exceeded if {
    # Get rate limit for this service pair
    limit := get_rate_limit(source_service.service_account, destination_service.service_account)

    # Check current rate (would integrate with rate limit service)
    input.request.rate > limit
}

get_rate_limit(source, dest) := limit if {
    limit := rate_limits[source][dest]
}

get_rate_limit(source, dest) := default_rate_limit if {
    not rate_limits[source][dest]
}

default_rate_limit := 1000

rate_limits := {
    "ga-gateway": {
        "intelgraph-api": 10000,
        "ga-adminsec": 5000,
        "ga-graphai": 2000
    },
    "ga-worker": {
        "postgresql": 500,
        "neo4j": 300,
        "kafka": 1000
    }
}

#############################################
# DENIAL REASON
#############################################

denial_reason := "invalid source SPIFFE ID" if {
    not valid_source_spiffe_id
}

denial_reason := "invalid destination SPIFFE ID" if {
    valid_source_spiffe_id
    not valid_destination_spiffe_id
}

denial_reason := "communication not allowed by policy" if {
    valid_spiffe_identity
    not communication_allowed
}

denial_reason := "blocked by explicit deny rule" if {
    valid_spiffe_identity
    communication_allowed
    deny_rules_triggered
}

denial_reason := "rate limit exceeded" if {
    valid_spiffe_identity
    communication_allowed
    not deny_rules_triggered
    not rate_limit_ok
}

#############################################
# AUDIT LOGGING
#############################################

# Generate audit event for every decision
audit_event := {
    "event_type": "service_authz",
    "timestamp": time.now_ns(),
    "request_id": input.request_id,
    "source": {
        "spiffe_id": input.source.spiffe_id,
        "service": source_service.service_account,
        "namespace": source_service.namespace,
        "ip": input.source.ip
    },
    "destination": {
        "spiffe_id": input.destination.spiffe_id,
        "service": destination_service.service_account,
        "namespace": destination_service.namespace
    },
    "request": {
        "method": input.request.method,
        "path": input.request.path
    },
    "decision": {
        "allowed": allow,
        "reason": reason
    },
    "policy_version": policy_info.version
}
