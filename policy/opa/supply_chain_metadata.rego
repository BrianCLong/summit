package policy.supply_chain_metadata

import future.keywords.contains
import future.keywords.if

default allow := false

deny contains msg if {
  not input.services
  msg := "services metadata payload missing"
}

deny contains msg if {
  count(input.services) == 0
  msg := "at least one service metadata entry is required"
}

deny contains msg if {
  svc := input.services[_]
  not svc.name
  msg := "service entry missing name"
}

deny contains msg if {
  svc := input.services[_]
  not svc.license_policy
  msg := sprintf("service %s missing license_policy", [svc.name])
}

deny contains msg if {
  svc := input.services[_]
  not svc.residency_tag
  msg := sprintf("service %s missing residency_tag", [svc.name])
}

deny contains msg if {
  svc := input.services[_]
  not svc.pii_annotation
  msg := sprintf("service %s missing pii_annotation", [svc.name])
}

allow if {
  count(deny) == 0
}
