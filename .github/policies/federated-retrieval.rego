package retrieval

default allow = false

allow {
    input.source.trustScore > 0
    input.source.tenantId == input.request.tenantId
}

allow {
    input.source.trustScore > 0
    input.source.tenantId == "*"
}
