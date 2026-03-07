package authz

default allow = false

allow {
    input.source.tenantId == input.request.tenantId
}

allow {
    input.source.tenantId == "*"
}
