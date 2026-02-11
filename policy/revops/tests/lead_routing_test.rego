import future.keywords.in
import future.keywords.if
package revops.lead_routing_test

import data.revops.lead_routing
import data.revops_fixtures

# Ensure enterprise lead routes with expected segment and assignee.
test_enterprise_lead_routed if {
  lead := revops_fixtures.leads[0]
  test_input := {
    "lead": lead,
    "tenant": {"id": "tenant-default"},
    "context": {"source": "web_form", "received_at": "2025-01-01T00:00:00Z"}
  }

  decision := lead_routing.decision with input as test_input
  decision.allowed
  decision.segment == "enterprise"
  decision.assignee.type == "team"
  decision.sla.first_touch_hours == 4
}

# Blocklisted domains are rejected.
test_blocklisted_domain_denied if {
  lead := revops_fixtures.leads[1]
  test_input := {
    "lead": lead,
    "tenant": {"id": "tenant-default"},
    "context": {"source": "web_form", "received_at": "2025-01-01T00:00:00Z"}
  }

  decision := lead_routing.decision with input as test_input
  decision.allowed == false
}
