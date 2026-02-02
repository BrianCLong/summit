# Conductor Omniversal - Production OPA Policies
# Comprehensive authorization and governance policies

package intelgraph.conductor

import rego.v1

# Core authorization decision
default allow := false

# Allow if user has required permissions and resource access
allow if {
    input.subject.roles
    input.action
    input.resource
    
    # Check basic authentication
    authenticated
    
    # Check tenant isolation
    tenant_access_allowed
    
    # Check resource permissions
    resource_permissions_granted
    
    # Check rate limits
    not rate_limited
    
    # Check compliance requirements
    compliance_check_passed
}

# Authentication verification
authenticated if {
    input.subject.sub
    input.subject.tenant
    count(input.subject.roles) > 0
}

# Tenant isolation enforcement
tenant_access_allowed if {
    input.subject.tenant == input.resource.tenant
}

tenant_access_allowed if {
    "super_admin" in input.subject.roles
    input.context.purpose == "cross_tenant_audit"
}

# Resource-based permissions
resource_permissions_granted if {
    required_role := resource_role_mapping[input.resource.type][input.action]
    required_role in input.subject.roles
}

# Role-based resource mapping
resource_role_mapping := {
    "entity": {
        "read": ["analyst", "user", "admin"],
        "write": ["analyst", "admin"], 
        "delete": ["admin"],
        "export": ["analyst", "admin"]
    },
    "graph": {
        "read": ["analyst", "user", "admin"],
        "write": ["analyst", "admin"],
        "schema_modify": ["admin"]
    },
    "policy": {
        "read": ["admin", "compliance_officer"],
        "write": ["admin"],
        "simulate": ["admin", "compliance_officer"]
    },
    "budget": {
        "read": ["admin", "finance"],
        "configure": ["admin", "finance"],
        "override": ["admin"]
    },
    "runbook": {
        "read": ["operator", "admin"],
        "execute": ["operator", "admin"],
        "sign": ["admin", "key_manager"]
    }
}

# Rate limiting check
rate_limited if {
    # Check user rate limits
    user_requests := data.conductor_metrics.user_requests[input.subject.sub]
    user_requests > user_rate_limits[input.subject.roles[0]]
}

rate_limited if {
    # Check tenant rate limits
    tenant_requests := data.conductor_metrics.tenant_requests[input.subject.tenant]
    tenant_requests > tenant_rate_limits["default"]
}

user_rate_limits := {
    "admin": 1000,
    "analyst": 500,
    "user": 100,
    "operator": 200
}

tenant_rate_limits := {
    "default": 10000,
    "enterprise": 50000,
    "pilot": 1000
}

# Compliance checks
compliance_check_passed if {
    # Data classification check
    data_classification_compliant
    
    # Export control check  
    export_control_compliant
    
    # Purpose limitation check
    purpose_limitation_compliant
}

data_classification_compliant if {
    not input.resource.tags.classification
}

data_classification_compliant if {
    classification := input.resource.tags.classification
    required_clearance := classification_clearance_map[classification]
    input.subject.clearance >= required_clearance
}

classification_clearance_map := {
    "public": 0,
    "internal": 1, 
    "confidential": 2,
    "restricted": 3,
    "secret": 4
}

export_control_compliant if {
    input.action != "export"
}

export_control_compliant if {
    input.action == "export"
    input.resource.tags.export_controlled != true
}

export_control_compliant if {
    input.action == "export"
    input.resource.tags.export_controlled == true
    "export_authorized" in input.subject.roles
    input.context.export_license
}

purpose_limitation_compliant if {
    allowed_purposes := resource_purpose_map[input.resource.type]
    input.context.purpose in allowed_purposes
}

resource_purpose_map := {
    "entity": ["intelligence_analysis", "threat_assessment", "compliance_audit"],
    "graph": ["relationship_analysis", "pattern_detection", "intelligence_analysis"],
    "policy": ["governance", "compliance_audit", "security_review"],
    "budget": ["cost_management", "resource_planning", "compliance_audit"]
}

# Advanced routing and orchestration policies
routing_decision := {
    "expert": selected_expert,
    "priority": calculated_priority,
    "quality_gates": required_gates,
    "budget_approval": budget_approved,
    "monitoring": monitoring_config
} if {
    input.routing_request
    selected_expert := select_expert
    calculated_priority := calculate_priority  
    required_gates := determine_quality_gates
    budget_approved := check_budget_approval
    monitoring_config := configure_monitoring
}

# Expert selection logic
select_expert := "graph_ops" if {
    input.routing_request.query_type == "cypher"
    input.routing_request.complexity < 0.7
}

select_expert := "rag_retrieval" if {
    input.routing_request.query_type == "semantic_search"
    input.routing_request.documents_count > 1000
}

select_expert := "osint_analysis" if {
    input.routing_request.query_type == "threat_intelligence"
    input.routing_request.external_sources_required
}

select_expert := "web_orchestrator" if {
    input.routing_request.requires_web_interaction
    input.routing_request.target_interfaces
}

# Priority calculation
calculate_priority := 1 if {
    input.routing_request.tenant_tier == "enterprise"
    input.routing_request.user_role == "admin"
}

calculate_priority := 3 if {
    input.routing_request.tenant_tier == "standard"
    input.routing_request.urgency == "high"
}

calculate_priority := 5 if {
    input.routing_request.tenant_tier == "pilot"
}

# Quality gate determination
determine_quality_gates := ["budget_check", "compliance_scan"] if {
    input.routing_request.estimated_cost > 10.0
}

determine_quality_gates := ["rate_limit_check", "content_filter"] if {
    input.routing_request.query_complexity > 0.8
}

determine_quality_gates := ["export_control", "classification_check"] if {
    input.routing_request.involves_classified_data
}

# Budget approval logic
check_budget_approval := true if {
    input.routing_request.estimated_cost < tenant_budget_thresholds[input.routing_request.tenant_tier]
}

check_budget_approval := false if {
    input.routing_request.estimated_cost >= tenant_budget_thresholds[input.routing_request.tenant_tier]
    not input.routing_request.budget_override_approved
}

tenant_budget_thresholds := {
    "enterprise": 100.0,
    "standard": 25.0, 
    "pilot": 5.0
}

# Monitoring configuration
configure_monitoring := {
    "trace_level": "detailed",
    "metrics_collection": true,
    "audit_logging": true,
    "alert_thresholds": enterprise_thresholds
} if {
    input.routing_request.tenant_tier == "enterprise"
}

configure_monitoring := {
    "trace_level": "standard", 
    "metrics_collection": true,
    "audit_logging": false,
    "alert_thresholds": standard_thresholds
} if {
    input.routing_request.tenant_tier != "enterprise"
}

enterprise_thresholds := {
    "error_rate": 0.01,
    "latency_p99": 2000,
    "budget_utilization": 0.85
}

standard_thresholds := {
    "error_rate": 0.05,
    "latency_p99": 5000, 
    "budget_utilization": 0.90
}

# Web interface orchestration policies  
web_orchestration_allowed if {
    "web_orchestrator" in input.subject.roles
    input.resource.type == "web_interface"
    web_interface_whitelisted
    scraping_compliance_check
}

web_interface_whitelisted if {
    input.resource.web_interface.domain in allowed_domains
}

web_interface_whitelisted if {
    input.resource.web_interface.domain in tenant_allowed_domains[input.subject.tenant]
}

allowed_domains := {
    "github.com",
    "stackoverflow.com", 
    "docs.python.org",
    "kubernetes.io",
    "prometheus.io",
    "grafana.com"
}

tenant_allowed_domains := {
    "enterprise_tenant": {
        "internal.company.com",
        "wiki.company.com",
        "confluence.company.com"
    }
}

scraping_compliance_check if {
    # Check robots.txt compliance
    not input.resource.web_interface.robots_txt_disallowed
    
    # Check rate limiting
    input.resource.web_interface.rate_limit_ms >= 1000
    
    # Check terms of service compliance
    input.resource.web_interface.tos_compliant == true
}

# Advanced CRDT conflict resolution policies
crdt_resolution_policy := {
    "strategy": resolution_strategy,
    "requires_approval": approval_required,
    "escalation_level": escalation_level
} if {
    input.crdt_conflict
    resolution_strategy := determine_resolution_strategy
    approval_required := requires_manual_approval
    escalation_level := determine_escalation_level
}

determine_resolution_strategy := "last_writer_wins" if {
    input.crdt_conflict.type == "concurrent_writes"
    input.crdt_conflict.field_criticality == "low"
}

determine_resolution_strategy := "merge_with_annotation" if {
    input.crdt_conflict.type == "concurrent_writes"  
    input.crdt_conflict.field_criticality == "medium"
}

determine_resolution_strategy := "manual_resolution_required" if {
    input.crdt_conflict.type == "semantic_conflict"
    input.crdt_conflict.field_criticality == "high"
}

requires_manual_approval if {
    input.crdt_conflict.field_criticality == "high"
}

requires_manual_approval if {
    input.crdt_conflict.involves_classified_data
}

determine_escalation_level := 1 if {
    input.crdt_conflict.field_criticality == "low"
}

determine_escalation_level := 2 if {
    input.crdt_conflict.field_criticality == "medium"
    input.crdt_conflict.resolution_attempts > 2
}

determine_escalation_level := 3 if {
    input.crdt_conflict.field_criticality == "high"
}

# Key rotation and signing policies
key_operation_allowed if {
    input.key_operation
    "key_manager" in input.subject.roles
    key_operation_compliant
}

key_operation_compliant if {
    input.key_operation.type == "rotation"
    input.key_operation.reason in allowed_rotation_reasons
}

key_operation_compliant if {
    input.key_operation.type == "signing"
    input.key_operation.runbook_criticality in allowed_signing_levels[input.subject.clearance]
}

allowed_rotation_reasons := {
    "scheduled_rotation",
    "security_incident", 
    "key_compromise",
    "compliance_requirement"
}

allowed_signing_levels := {
    0: ["public"],
    1: ["public", "internal"],
    2: ["public", "internal", "confidential"],
    3: ["public", "internal", "confidential", "restricted"],
    4: ["public", "internal", "confidential", "restricted", "secret"]
}

# Denial explanations for debugging
explanations := {
    "authentication_failed": "User authentication could not be verified",
    "tenant_isolation_violation": "Cross-tenant access not permitted",
    "insufficient_permissions": sprintf("Required role not found. Need: %v, Have: %v", [required_role, input.subject.roles]),
    "rate_limit_exceeded": "Request rate limit exceeded for user or tenant",
    "compliance_violation": "Request violates data classification, export control, or purpose limitation policies",
    "budget_exceeded": "Request cost exceeds approved budget limits",
    "web_interface_blocked": "Web interface not whitelisted or scraping non-compliant",
    "crdt_conflict_escalation": "CRDT conflict requires manual resolution due to criticality",
    "key_operation_denied": "Key operation not permitted for user clearance level"
} if {
    not allow
    # Safe lookup for required role, defaulting to "unknown" if not applicable
    required_role := object.get(resource_role_mapping[input.resource.type], input.action, "unknown")
}