
package policies

default allow = false

# Allow if the principal's tenant_id matches the resource's tenant_id
allow if {
    input.principal.tenant_id == input.resource.tenant_id
}

# Deny if tenants do not match
deny[msg] if {
    not allow
    msg := sprintf("Access denied: principal from tenant '%s' cannot access resource in tenant '%s'",
                 [input.principal.tenant_id, input.resource.tenant_id])
}
