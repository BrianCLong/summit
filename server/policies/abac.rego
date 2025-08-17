package intelgraph

import future.keywords.if

default allow = false

# Input example:
# {
#   "action": "read:chat",
#   "user": {"clearance": "public", "role": "ANALYST"},
#   "resource": {"sensitivity": "low"}
# }

allow if {
  input.action == "read:chat"
  input.resource.sensitivity != "high"
}

allow if {
  input.action == "write:comment"
  input.user.role == "ADMIN"
}

# Attribute-based entity visibility controls
allow if {
  input.action == "read:entity"
  mission_tag_match
  compartment_match
  temporal_match
}

mission_tag_match if {
  user_tag := input.user.missionTags[_]
  input.resource.missionTags[_] == user_tag
}

compartment_match if {
  input.user.compartment.orgId == input.resource.compartment.orgId
  not input.resource.compartment.teamId
}

compartment_match if {
  input.user.compartment.orgId == input.resource.compartment.orgId
  input.user.compartment.teamId == input.resource.compartment.teamId
}

temporal_match if {
  not input.resource.validFrom
  not input.resource.validUntil
}

temporal_match if {
  not input.resource.validFrom
  now := time.parse_rfc3339_ns(input.context.time)
  end := time.parse_rfc3339_ns(input.resource.validUntil)
  now <= end
}

temporal_match if {
  not input.resource.validUntil
  now := time.parse_rfc3339_ns(input.context.time)
  start := time.parse_rfc3339_ns(input.resource.validFrom)
  now >= start
}

temporal_match if {
  now := time.parse_rfc3339_ns(input.context.time)
  start := time.parse_rfc3339_ns(input.resource.validFrom)
  end := time.parse_rfc3339_ns(input.resource.validUntil)
  now >= start
  now <= end
}

