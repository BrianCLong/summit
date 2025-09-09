package entitlements

# input: { plan, feature }
allow {
  input.feature == "batch_import"
  input.plan == "enterprise"
} else = allow {
  input.feature == "advanced_export" 
  input.plan != "starter"
} else = allow {
  input.feature == "api_access"
  true  # Available to all plans
} else = allow {
  input.feature == "basic_search"
  true  # Available to all plans  
} else = allow {
  input.feature == "collaboration"
  input.plan != "starter"
} else = allow {
  input.feature == "sso"
  input.plan == "enterprise"
} else = allow {
  input.feature == "audit_logs"
  input.plan == "enterprise"
} else = allow {
  input.feature == "custom_integrations"
  input.plan == "enterprise"
}

# Default deny
default allow = false