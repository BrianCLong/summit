package revops.lead_routing

import data.revops.config
import data.revops.segments

default decision = {
  "allowed": false,
  "reason": "not_evaluated",
  "assignee": {"type": "none"},
  "sla": {},
  "flags": []
}

# Main lead routing decision surfaced to clients.
decision := output {
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

blocklisted(lead, tenant_id) {
  lead.domain != ""
  config.tenant[tenant_id].blocklist.domains[_] == lead.domain
}

choose_assignee(route_cfg) = assignee {
  assignee := route_cfg.assignee
}

choose_assignee(route_cfg) = assignee {
  not route_cfg.assignee
  assignee := {"type": "none"}
}

flags(lead, segment, tenant_id) = out {
  default out = []
  important_countries := config.tenant[tenant_id].lead_routing_flags.important_countries
  some c
  important_countries[c] == lead.country
  out := ["priority_region", segment]
}

flags(_, _, _) = [] {
  not input.lead
}
