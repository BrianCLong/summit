package summit.ai.governance

# Default deny
default allow = false

# Hard-coded red lines that must never be allowed
red_lines = {
  "autonomous_lethal_action",
  "mass_surveillance",
  "unauthorized_biometric_identification",
  "social_scoring",
  "critical_infrastructure_disruption",
  "CBRN_material_generation"
}

# Define allowed use cases based on inference profiles
allowed_uses = {
  "civilian_safe": {"general_inquiry", "content_creation", "data_analysis", "software_development"},
  "defense_restricted": {"intelligence_analysis", "logistics_planning", "cyber_defense_simulation", "scenario_modeling"},
  "research_unrestricted": {"experimental_models", "unverified_data_processing", "synthetic_data_generation"}
}

# Rule: Deny if intent is in red lines
deny[msg] {
  red_lines[input.intent]
  msg = "Request violates hard-coded red line policy."
}

# Rule: Deny if the intent classifier flagged it as a redline
deny[msg] {
  input.is_redline == true
  msg = "Request classified as a red line violation."
}

# Rule: Allow if intent is permitted by the profile and NOT denied by red lines
allow {
  not deny
  allowed_uses[input.profile][input.intent]
}

# Rule: Always allow general inquiry as a fallback, unless denied by red lines
allow {
  not deny
  input.intent == "general_inquiry"
}
