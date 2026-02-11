import future.keywords.in
import future.keywords.if
package intelgraph.authz.extended

default allow := false

tenant_match if { input.subject.tenant == input.resource.tenant }

deny if { input.resource.classification == "TS"; not input.subject.clearance["TS"] }

forbidden_fields := { "Entity.sensitiveNotes" }

admin_role if {
  some r
  input.subject.roles[r]
  r == "admin"
}

deny if {
  some f
  input.request.fields[f]
  forbidden_fields[f]
  not admin_role
}

allow if {
  tenant_match
  not deny
}
