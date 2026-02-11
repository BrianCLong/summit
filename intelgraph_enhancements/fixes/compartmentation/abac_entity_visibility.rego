import future.keywords
package fixes.compartmentation

default allow = false

# Example ABAC policy enforcing mission tags, compartments and time windows
allow if {
  user_tag := input.user.missionTags[_]
  input.resource.missionTags[_] == user_tag
  input.user.compartment.orgId == input.resource.compartment.orgId
  not input.resource.compartment.teamId
  now := time.parse_rfc3339_ns(input.context.time)
  not input.resource.validFrom
  not input.resource.validUntil
}
