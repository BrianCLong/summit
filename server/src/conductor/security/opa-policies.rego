package conductor.security
import future.keywords.if
import future.keywords.in
import future.keywords.contains



# Default deny all unless explicitly allowed
default allow := false

# RBAC: Role-based access control
allow if {
    # User has required role for conductor operations
    has_role(input.user.roles, required_role_for_action(input.action))
}

# PII Detection and Protection
contains_pii if {
    # Check for common PII patterns in task input
    pii_patterns := [
        # SSN patterns
        `\d{3}-\d{2}-\d{4}`,
        `\d{9}`,
        
        # Email patterns  
        `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`,
        
        # Credit card patterns
        `\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}`,
        
        # Phone number patterns
        `\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}`,
        
        # Bank account patterns
        `\b\d{8,17}\b`
    ]
    
    some pattern in pii_patterns
    regex.match(pattern, input.task)
}

# Expert access control by user role
required_role_for_action(action) := role if {
    action_roles := {
        "conduct": "analyst",
        "preview_routing": "viewer", 
        "audit_access": "auditor",
        "admin_operations": "admin"
    }
    role := action_roles[action]
}

# Check if user has required role
has_role(user_roles, required_role) if {
    required_role in user_roles
}

# Expert-specific access controls
expert_access_allowed if {
    # Graph operations require special clearance
    input.expert == "GRAPH_TOOL"
    "graph_access" in input.user.permissions
}

expert_access_allowed if {
    # OSINT operations require OSINT clearance
    input.expert == "OSINT_TOOL"
    "osint_access" in input.user.permissions
}

expert_access_allowed if {
    # Files operations require file access
    input.expert == "FILES_TOOL"
    "file_access" in input.user.permissions
}

expert_access_allowed if {
    # LLM operations are generally allowed
    input.expert in ["LLM_LIGHT", "LLM_HEAVY", "RAG_TOOL", "EXPORT_TOOL"]
}

# Cost and rate limiting
within_cost_limits if {
    estimated_cost := estimate_task_cost(input.task, input.expert)
    user_budget := input.user.budget_remaining
    estimated_cost <= user_budget
}

within_rate_limits if {
    current_rate := input.user.requests_last_hour
    rate_limit := input.user.rate_limit
    current_rate < rate_limit
}

# Time-based restrictions
within_business_hours if {
    # Allow 24/7 for emergency users
    "emergency_access" in input.user.permissions
}

within_business_hours if {
    # Business hours: 6 AM to 10 PM UTC
    hour := time.now_ns() / 1000000000 / 3600 % 24
    hour >= 6
    hour <= 22
}

# Sensitive data handling
allow_sensitive_data if {
    # Only auditors and admins can access sensitive data
    input.user.clearance_level >= 3
    input.action in ["conduct", "audit_access"]
}

# Geographic restrictions
geographic_access_allowed if {
    # Check if user location is in allowed regions
    allowed_regions := {"US", "CA", "EU", "UK", "AU"}
    input.user.location in allowed_regions
}

# Final authorization decision
allow if {
    # Basic RBAC check
    has_role(input.user.roles, required_role_for_action(input.action))
    
    # Expert-specific access
    expert_access_allowed
    
    # Cost and rate limits
    within_cost_limits
    within_rate_limits
    
    # Time restrictions
    within_business_hours
    
    # Geographic restrictions
    geographic_access_allowed
    
    # PII protection - deny if PII detected and user lacks clearance
    not (contains_pii; not allow_sensitive_data)
}

# Cost estimation helper
estimate_task_cost(task, expert) := cost if {
    base_costs := {
        "LLM_LIGHT": 0.01,
        "LLM_HEAVY": 0.10,
        "GRAPH_TOOL": 0.05,
        "RAG_TOOL": 0.03,
        "FILES_TOOL": 0.01,
        "OSINT_TOOL": 0.08,
        "EXPORT_TOOL": 0.02
    }
    
    base_cost := base_costs[expert]
    
    # Adjust cost based on task complexity
    complexity_multiplier := task_complexity_multiplier(task)
    cost := base_cost * complexity_multiplier
}

task_complexity_multiplier(task) := multiplier if {
    word_count := count(split(task, " "))
    
    # Simple heuristic for complexity
    multiplier := 1.0 if word_count <= 10
    multiplier := 1.5 if word_count > 10; word_count <= 50
    multiplier := 2.0 if word_count > 50; word_count <= 100
    multiplier := 3.0 if word_count > 100
}

# Audit logging requirements
audit_required if {
    # Always audit admin operations
    input.action == "admin_operations"
}

audit_required if {
    # Audit high-cost operations
    estimated_cost := estimate_task_cost(input.task, input.expert)
    estimated_cost > 1.0
}

audit_required if {
    # Audit sensitive expert usage
    input.expert in ["GRAPH_TOOL", "OSINT_TOOL"]
}

audit_required if {
    # Audit when PII is detected
    contains_pii
}

# Warnings and recommendations
warnings[msg] {
    contains_pii
    msg := "PII detected in task input - ensure proper data handling"
}

warnings[msg] {
    estimated_cost := estimate_task_cost(input.task, input.expert)
    estimated_cost > 0.5
    msg := sprintf("High estimated cost: $%.2f", [estimated_cost])
}

warnings[msg] {
    input.user.requests_last_hour > (input.user.rate_limit * 0.8)
    msg := "Approaching rate limit"
}

# Emergency override
allow if {
    "emergency_override" in input.user.permissions
    input.emergency_justification
}
