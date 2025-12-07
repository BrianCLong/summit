package revops.lead_routing_test

import data.revops.lead_routing
import data.revops_fixtures

# Ensure enterprise lead routes with expected segment and assignee.
test_enterprise_lead_routed {
  lead := revops_fixtures.leads[0]
  input := {
    "lead": lead,
    "tenant": {"id": "tenant-default"},
    "context": {"source": "web_form", "received_at": "2025-01-01T00:00:00Z"}
  }

  decision := revops.lead_routing.decision with input as input
  decision.allowed
  decision.segment == "enterprise"
  decision.assignee.type == "team"
  decision.sla.first_touch_hours == 4
}

# Blocklisted domains are rejected.
test_blocklisted_domain_denied {
  lead := revops_fixtures.leads[1]
  input := {
    "lead": lead,
    "tenant": {"id": "tenant-default"},
    "context": {"source": "web_form", "received_at": "2025-01-01T00:00:00Z"}
  }

  decision := revops.lead_routing.decision with input as input
  decision.allowed == false
}
