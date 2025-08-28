package intelgraph.entitlements

default allow = false

# Rule to load plan data from the data store (e.g., a config map or database)
# In a real system, this would be dynamically loaded.
# For this example, we assume `data.plans` contains the entitlement matrix.

# Deny if the requested feature is not explicitly granted by the tenant's plan
violation[msg] {
  input.action == "use" # Action is 'use' a feature
  plan := input.tenant.plan_id # Get the tenant's assigned plan ID
  feature := input.feature # The feature being requested (e.g., "ai.assistant")

  # Check if the plan exists in our data store
  not data.plans[plan]
  msg := sprintf("deny: plan %s not found", [plan])
}

violation[msg] {
  input.action == "use"
  plan := input.tenant.plan_id
  feature := input.feature

  # Get the entitlements for the tenant's plan
  plan_entitlements := data.plans[plan].entitlements

  # Check if the specific feature is not present or explicitly disabled in the plan
  not plan_entitlements[feature]
  msg := sprintf("deny: feature %s not entitled for plan %s", [feature, plan])
}

# Deny if monthly budget exhausted
violation[msg] {
  input.action == "use"
  plan := input.tenant.plan_id
  feature := input.feature
  
  # Get the monthly limit for the feature from the plan entitlements
  monthly_limit := data.plans[plan].entitlements[feature].limits.monthly_quota
  
  # Get the current month-to-date usage for the feature from the input
  month_to_date_usage := input.usage.month_to_date[feature]

  # Check if a monthly limit exists and if current usage exceeds it
  monthly_limit > 0 # Ensure there is a defined limit
  month_to_date_usage >= monthly_limit
  msg := sprintf("deny: monthly budget exhausted for %s (plan %s)", [feature, plan])
}

# Deny if daily budget exhausted
violation[msg] {
  input.action == "use"
  plan := input.tenant.plan_id
  feature := input.feature
  
  daily_limit := data.plans[plan].entitlements[feature].limits.daily_quota
  daily_usage := input.usage.daily[feature]

  daily_limit > 0
  daily_usage >= daily_limit
  msg := sprintf("deny: daily budget exhausted for %s (plan %s)", [feature, plan])
}

# Allow if no violations are found
allow { count(violation) == 0 }
