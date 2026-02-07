import future.keywords
package conductor.security

import rego.v1

# Test data for policy validation
test_user_viewer := {
  "id": "user-123",
  "roles": ["viewer"],
  "permissions": ["read"],
  "clearance_level": 1,
  "budget_remaining": 50.0,
  "rate_limit": 100,
  "requests_last_hour": 10,
  "location": "US"
}

test_user_analyst := {
  "id": "analyst-456", 
  "roles": ["analyst"],
  "permissions": ["read", "graph_access", "file_access"],
  "clearance_level": 2,
  "budget_remaining": 500.0,
  "rate_limit": 500,
  "requests_last_hour": 50,
  "location": "US"
}

test_user_admin := {
  "id": "admin-789",
  "roles": ["admin"],
  "permissions": ["read", "write", "graph_access", "osint_access", "file_access", "emergency_access"],
  "clearance_level": 3,
  "budget_remaining": 5000.0,
  "rate_limit": 2000,
  "requests_last_hour": 100,
  "location": "US"
}

test_user_blocked_location := {
  "id": "blocked-user",
  "roles": ["analyst"],
  "permissions": ["read", "graph_access"],
  "clearance_level": 2,
  "budget_remaining": 500.0,
  "rate_limit": 500,
  "requests_last_hour": 10,
  "location": "BLOCKED"
}

# Test cases for RBAC

test_viewer_can_preview if {
  input := {
    "user": test_user_viewer,
    "action": "preview_routing",
    "task": "simple query without PII"
  }
  allow with input as input
}

test_viewer_cannot_conduct_osint if {
  input := {
    "user": test_user_viewer,
    "action": "conduct",
    "task": "OSINT query", 
    "expert": "OSINT_TOOL"
  }
  not allow with input as input
}

test_analyst_can_conduct_graph if {
  input := {
    "user": test_user_analyst,
    "action": "conduct",
    "task": "graph analysis query",
    "expert": "GRAPH_TOOL"
  }
  allow with input as input
}

test_admin_can_conduct_osint if {
  input := {
    "user": test_user_admin,
    "action": "conduct", 
    "task": "OSINT investigation",
    "expert": "OSINT_TOOL"
  }
  allow with input as input
}

# Test cases for PII detection

test_pii_ssn_detected if {
  input := {"task": "Find user with SSN 123-45-6789"}
  contains_pii with input as input
}

test_pii_email_detected if {
  input := {"task": "Contact john.doe@example.com for information"}
  contains_pii with input as input
}

test_pii_phone_detected if {
  input := {"task": "Call (555) 123-4567 for details"}
  contains_pii with input as input
}

test_pii_credit_card_detected if {
  input := {"task": "Process payment for 4111-1111-1111-1111"}
  contains_pii with input as input
}

test_no_pii_clean_text if {
  input := {"task": "Analyze general market trends"}
  not contains_pii with input as input
}

# Test cases for cost limits

test_cost_within_budget if {
  input := {
    "user": test_user_analyst,
    "action": "conduct",
    "task": "simple query",
    "expert": "LLM_LIGHT"
  }
  within_cost_limits with input as input
}

test_cost_exceeds_budget if {
  input := {
    "user": {
      "id": "poor-user",
      "roles": ["analyst"],
      "permissions": ["read"],
      "clearance_level": 2,
      "budget_remaining": 0.01,  # Very low budget
      "rate_limit": 100,
      "requests_last_hour": 10,
      "location": "US"
    },
    "action": "conduct", 
    "task": "expensive complex analysis requiring multiple steps and extensive processing",
    "expert": "LLM_HEAVY"
  }
  not within_cost_limits with input as input
}

# Test cases for rate limiting

test_rate_within_limits if {
  input := {
    "user": {
      "id": "normal-user",
      "roles": ["analyst"],
      "permissions": ["read"],
      "clearance_level": 2,
      "budget_remaining": 100.0,
      "rate_limit": 100,
      "requests_last_hour": 50,  # Within limit
      "location": "US"
    },
    "action": "conduct"
  }
  within_rate_limits with input as input
}

test_rate_exceeds_limits if {
  input := {
    "user": {
      "id": "heavy-user",
      "roles": ["analyst"],
      "permissions": ["read"],
      "clearance_level": 2,
      "budget_remaining": 100.0,
      "rate_limit": 100,
      "requests_last_hour": 150,  # Exceeds limit
      "location": "US"
    },
    "action": "conduct"
  }
  not within_rate_limits with input as input
}

# Test cases for geographic restrictions

test_geographic_access_allowed if {
  input := {
    "user": test_user_analyst,
    "action": "conduct",
    "task": "analysis query"
  }
  geographic_access_allowed with input as input
}

test_geographic_access_blocked if {
  input := {
    "user": test_user_blocked_location,
    "action": "conduct",
    "task": "analysis query"
  }
  not geographic_access_allowed with input as input
}

# Test cases for business hours

test_business_hours_emergency_user if {
  input := {
    "user": {
      "id": "emergency-user",
      "roles": ["emergency"],
      "permissions": ["emergency_access"],
      "clearance_level": 3,
      "budget_remaining": 1000.0,
      "rate_limit": 1000,
      "requests_last_hour": 10,
      "location": "US"
    },
    "action": "conduct"
  }
  within_business_hours with input as input
}

# Test cases for sensitive data access

test_sensitive_data_admin_allowed if {
  input := {
    "user": test_user_admin,
    "action": "conduct",
    "task": "PII analysis"
  }
  allow_sensitive_data with input as input
}

test_sensitive_data_viewer_denied if {
  input := {
    "user": test_user_viewer,
    "action": "conduct", 
    "task": "PII analysis"
  }
  not allow_sensitive_data with input as input
}

# Test cases for expert access

test_graph_access_with_permission if {
  input := {
    "user": test_user_analyst,
    "expert": "GRAPH_TOOL"
  }
  expert_access_allowed with input as input
}

test_osint_access_without_permission if {
  input := {
    "user": test_user_viewer,
    "expert": "OSINT_TOOL"
  }
  not expert_access_allowed with input as input
}

test_files_access_with_permission if {
  input := {
    "user": test_user_analyst,
    "expert": "FILES_TOOL"
  }
  expert_access_allowed with input as input
}

test_llm_access_allowed if {
  input := {
    "user": test_user_viewer,
    "expert": "LLM_LIGHT"
  }
  expert_access_allowed with input as input
}

# Test cases for cost estimation

test_cost_estimation_llm_light if {
  task := "simple query"
  expert := "LLM_LIGHT"
  cost := estimate_task_cost(task, expert)
  cost > 0
  cost < 1.0
}

test_cost_estimation_llm_heavy if {
  task := "complex analysis requiring detailed reasoning and multiple steps with extensive context"
  expert := "LLM_HEAVY"
  cost := estimate_task_cost(task, expert)
  cost > 0.1
}

# Test cases for complete authorization flow

test_complete_authorization_success if {
  input := {
    "user": test_user_analyst,
    "action": "conduct",
    "task": "analyze market trends",
    "expert": "LLM_LIGHT"
  }
  allow with input as input
}

test_complete_authorization_pii_blocked if {
  input := {
    "user": test_user_viewer,  # Low clearance
    "action": "conduct",
    "task": "find user with email john.doe@example.com",
    "expert": "RAG_TOOL"
  }
  not allow with input as input
}

test_complete_authorization_role_blocked if {
  input := {
    "user": test_user_viewer,
    "action": "admin_operations",
    "task": "system administration"
  }
  not allow with input as input
}

test_complete_authorization_geo_blocked if {
  input := {
    "user": test_user_blocked_location,
    "action": "conduct",
    "task": "simple query",
    "expert": "LLM_LIGHT"
  }
  not allow with input as input
}

# Test cases for emergency override

test_emergency_override_allowed if {
  input := {
    "user": {
      "id": "emergency-user",
      "roles": ["emergency"],
      "permissions": ["emergency_override"],
      "clearance_level": 3,
      "budget_remaining": 0.0,  # Even with no budget
      "rate_limit": 10,
      "requests_last_hour": 50,  # Even over rate limit
      "location": "BLOCKED"  # Even from blocked location
    },
    "action": "conduct",
    "task": "emergency response query",
    "expert": "OSINT_TOOL",
    "emergency_justification": "Critical incident response"
  }
  allow with input as input
}

# Test cases for audit requirements

test_audit_required_admin_ops if {
  input := {"action": "admin_operations"}
  audit_required with input as input
}

test_audit_required_pii if {
  input := {"task": "query with SSN 123-45-6789"}
  audit_required with input as input
}

test_audit_required_high_cost if {
  input := {
    "task": "extremely complex analysis requiring extensive processing and multiple expert consultations with detailed reporting",
    "expert": "LLM_HEAVY"
  }
  audit_required with input as input
}

test_audit_required_osint if {
  input := {"expert": "OSINT_TOOL"}
  audit_required with input as input
}

# Test cases for warnings

test_warnings_pii_detected if {
  input := {"task": "contact user at john.doe@example.com"}
  count(warnings) > 0 with input as input
}

test_warnings_high_cost if {
  input := {
    "task": "extremely detailed complex analysis requiring extensive processing",
    "expert": "LLM_HEAVY"
  }
  count(warnings) > 0 with input as input
}

# Integration tests combining multiple conditions

test_integration_analyst_graph_query if {
  input := {
    "user": test_user_analyst,
    "action": "conduct",
    "task": "find connections between entities A and B",
    "expert": "GRAPH_TOOL"
  }
  
  # Should be allowed
  allow with input as input
  
  # Should have appropriate access
  expert_access_allowed with input as input
  
  # Should be within limits
  within_cost_limits with input as input
  within_rate_limits with input as input
  geographic_access_allowed with input as input
}

test_integration_viewer_restricted_access if {
  input := {
    "user": test_user_viewer,
    "action": "conduct", 
    "task": "gather intelligence on target organization",
    "expert": "OSINT_TOOL"
  }
  
  # Should be denied due to insufficient permissions
  not allow with input as input
  not expert_access_allowed with input as input
}

test_integration_pii_high_clearance if {
  input := {
    "user": test_user_admin,  # High clearance
    "action": "conduct",
    "task": "investigate fraud case involving SSN 123-45-6789",
    "expert": "RAG_TOOL"
  }
  
  # Should be allowed despite PII
  allow with input as input
  allow_sensitive_data with input as input
  
  # Should require audit
  audit_required with input as input
}