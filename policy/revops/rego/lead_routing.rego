package revops.lead_routing

import future.keywords.in

import future.keywords.if
import future.keywords.contains
import data.revops.config
import data.revops.segments

default decision := {
  "allowed": false,
  "reason": "not_evaluated",
  "assignee": {"type": "none"},
  "sla": {},
  "flags": []
}

# Main lead routing decision surfaced to clients.
decision := output if {
  lead := input.lead
  tenant_id := input.tenant.id

  segment := segments.segment_for_lead with input as {"lead": lead}
  route_cfg := config.tenant[tenant_id].lead_routing[segment]

  not blocklisted(lead, tenant_id)

  assignee := choose_assignee(route_cfg)
  sla := route_cfg.sla

  output := {
    "allowed": true,
    "reason": "ok",
    "assignee": assignee,
    "sla": sla,
    "segment": segment,
    "flags": flags(lead, segment, tenant_id)
  }
}

blocklisted(lead, tenant_id) if {
  lead.domain != ""
  config.tenant[tenant_id].blocklist.domains[_] == lead.domain
}

choose_assignee(route_cfg) := assignee if {
  assignee := route_cfg.assignee
}

choose_assignee(route_cfg) := assignee if {
  not route_cfg.assignee
  assignee := {"type": "none"}
}

# Flags when country is in important countries
flags(lead, segment, tenant_id) := ["priority_region", segment] if {
  important_countries := config.tenant[tenant_id].lead_routing_flags.important_countries
  some c
  important_countries[c] == lead.country
}

# Flags when country is not in important countries
flags(lead, segment, tenant_id) := [] if {
  input.lead
  important_countries := config.tenant[tenant_id].lead_routing_flags.important_countries
  not lead.country in important_countries
}

# Flags when no lead is provided
flags(_, _, _) := [] if {
  not input.lead
}
