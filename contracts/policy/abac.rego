package policy

import future.keywords.if

default decision = {"allow": false, "reason": "deny-by-default"}

order = {
  "unclassified": 0,
  "confidential": 1,
  "secret": 2,
  "topsecret": 3,
}

subject_clearance(inpt) = level if {
  clearance := object.get(inpt.subject, "clearance", "unclassified")
  level := object.get(order, clearance, -1)
}

resource_classification(inpt) = level if {
  classification := object.get(inpt.resource, "classification", "unclassified")
  level := object.get(order, classification, 100)
}

licenses_match(inpt) if {
  subject_license := object.get(inpt.subject, "license", "")
  resource_licenses := to_array(object.get(inpt.resource, "license", []))
  subject_license != ""
  resource_licenses[_] == subject_license
}

licenses_match(inpt) if {
  # allow explicit wildcard licenses on resource side
  resource_licenses := to_array(object.get(inpt.resource, "license", []))
  resource_licenses[_] == "*"
}

tenant_match(inpt) if {
  ctx_tenant := object.get(inpt.context, "tenant", "")
  ctx_tenant != ""
  subject_tenants := to_array(object.get(inpt.subject, "tenants", []))
  resource_tenants := to_array(object.get(inpt.resource, "tenants", object.get(inpt.resource, "tenant", [])))
  subject_tenants[_] == ctx_tenant
  resource_tenants[_] == ctx_tenant
}

roles_match(inpt) if {
  ctx_role := object.get(inpt.context, "role", "")
  ctx_role != ""
  subject_roles := to_array(object.get(inpt.subject, "roles", []))
  subject_roles[_] == ctx_role
}

purpose_match(inpt) if {
  ctx_purpose := object.get(inpt.context, "purpose", "")
  ctx_purpose != ""
  subject_purposes := to_array(object.get(inpt.subject, "purposes", []))
  resource_purposes := to_array(object.get(inpt.resource, "allowed_purposes", []))
  subject_purposes[_] == ctx_purpose
  resource_purposes[_] == ctx_purpose
}

action_allowed(inpt) if {
  allowed_actions := to_array(object.get(inpt.resource, "actions", []))
  count(allowed_actions) == 0
}

action_allowed(inpt) if {
  allowed_actions := to_array(object.get(inpt.resource, "actions", []))
  allowed_actions[_] == inpt.action
}

decision = {"allow": false, "reason": "insufficient-clearance"} if {
  not subject_clearance(input) >= resource_classification(input)
}

else = {"allow": false, "reason": "license-mismatch"} if {
  not licenses_match(input)
}

else = {"allow": false, "reason": "tenant-mismatch"} if {
  not tenant_match(input)
}

else = {"allow": false, "reason": "role-mismatch"} if {
  not roles_match(input)
}

else = {"allow": false, "reason": "invalid-purpose"} if {
  not purpose_match(input)
}

else = {"allow": false, "reason": "action-not-allowed"} if {
  not action_allowed(input)
}

else = {"allow": true, "reason": "authorized"} if {
  subject_clearance(input) >= resource_classification(input)
  licenses_match(input)
  tenant_match(input)
  roles_match(input)
  purpose_match(input)
  action_allowed(input)
}

to_array(val) = arr if {
  type_name(val) == "array"
  arr = val
}

to_array(val) = arr if {
  type_name(val) != "array"
  val != null
  val != ""
  arr = [val]
}

to_array(val) = [] if {
  val == null
}

to_array(val) = [] if {
  val == ""
}
